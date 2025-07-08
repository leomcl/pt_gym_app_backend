// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import OpenAI from 'npm:openai@^4.63.0'

console.log("PT Chat Function Started")

// Context cache with TTL (1 hour)
const contextCache = new Map<string, { 
  data: any, 
  timestamp: number, 
  ttl: number 
}>()

const CACHE_TTL = 60 * 60 * 1000 // 1 hour in milliseconds

function getCachedContext(userId: string): any | null {
  const cached = contextCache.get(userId)
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data
  }
  // Remove expired cache
  if (cached) {
    contextCache.delete(userId)
  }
  return null
}

function setCachedContext(userId: string, data: any): void {
  contextCache.set(userId, {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL
  })
}

Deno.serve(async (req) => {
  try {
    const startTime = Date.now()
    console.log(`[${new Date().toISOString()}] PT Chat invoked - Method: ${req.method}, URL: ${req.url}`)
    
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method not allowed' 
      }), { 
        status: 405,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log(`[AUTH] Authorization header present: ${!!authHeader}`)
    if (!authHeader) {
      console.log(`[AUTH] Missing Authorization header - returning 401`)
      return new Response(JSON.stringify({ 
        error: 'Missing Authorization header' 
      }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Parse request body
    let requestBody
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error(`[REQUEST] Invalid JSON in request body: ${parseError.message}`)
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: parseError.message
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    const { message, thread_id } = requestBody
    console.log(`[REQUEST] Message length: ${message?.length || 0}, Thread ID: ${thread_id || 'new'}`)

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Message is required and must be a non-empty string' 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Create Supabase client with JWT
    console.log('[SUPABASE] Creating Supabase client')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    console.log(`[SUPABASE] URL present: ${!!supabaseUrl}, Key present: ${!!supabaseKey}`)
    
    const supabaseClient = createClient(
      supabaseUrl!,
      supabaseKey!,
      { 
        global: { 
          headers: { Authorization: authHeader } 
        } 
      }
    )

    // Validate JWT and get authenticated user
    console.log('[AUTH] Validating user JWT')
    const { data: { user }, error } = await supabaseClient.auth.getUser()
    console.log(`[AUTH] User validation result - Success: ${!!user}, Error: ${!!error}`)
    
    if (error || !user) {
      console.error(`[AUTH] Authentication failed: ${error?.message}`)
      return new Response(JSON.stringify({ 
        error: 'Authentication failed',
        details: error?.message 
      }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }

    console.log(`[AUTH] Authenticated user ID: ${user.id}`)

    // Check for cached context first
    let userContext = getCachedContext(user.id)
    
    if (!userContext) {
      console.log(`[CONTEXT] Cache miss - fetching fresh context for user: ${user.id}`)
      
      // Fetch user profile and active training plan
      const [profileResult, trainingPlanResult] = await Promise.all([
        supabaseClient
          .from('user_profiles')
          .select(`
            full_name,
            date_of_birth,
            height_cm,
            weight_kg,
            training_experience_years,
            current_training_split,
            training_days_per_week,
            does_cardio,
            cardio_type,
            cardio_frequency_per_week,
            preferred_training_time,
            wake_up_time,
            bed_time,
            short_term_goal,
            long_term_goal,
            primary_fitness_goal,
            preferred_workout_duration,
            training_location_type,
            dietary_preferences,
            allergies,
            user_wants,
            user_avoids
          `)
          .eq('id', user.id)
          .single(),
        
        supabaseClient
          .from('training_plans')
          .select('plan_name, start_date, plan_data')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()
      ])

      const { data: profile, error: profileError } = profileResult
      const { data: activePlan, error: planError } = trainingPlanResult

      if (profileError) {
        console.error(`[CONTEXT] Profile error: ${profileError.message}`)
        return new Response(JSON.stringify({ 
          error: 'Profile not found',
          details: 'User profile does not exist. Please complete your profile first.'
        }), { 
          status: 404,
          headers: { "Content-Type": "application/json" }
        })
      }

      // Training plan is optional - user might not have one yet
      if (planError && planError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error(`[CONTEXT] Training plan error: ${planError.message}`)
      }

      userContext = {
        profile,
        activePlan: activePlan || null
      }

      // Cache the context
      setCachedContext(user.id, userContext)
      console.log(`[CONTEXT] Context cached for user: ${user.id}`)
    } else {
      console.log(`[CONTEXT] Cache hit - using cached context for user: ${user.id}`)
    }

    // Check OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    console.log(`[OPENAI] API key present: ${!!openaiKey}`)
    if (!openaiKey) {
      console.error(`[OPENAI] Missing API key`)
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        details: 'OPENAI_API_KEY environment variable is missing'
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiKey,
    })

    // Get or create assistant (you would typically store assistant_id in env)
    const assistantId = Deno.env.get('OPENAI_ASSISTANT_ID')
    let assistant
    
    if (assistantId) {
      console.log(`[ASSISTANT] Using existing assistant: ${assistantId}`)
      assistant = await openai.beta.assistants.retrieve(assistantId)
    } else {
      console.log(`[ASSISTANT] Creating new assistant`)
      assistant = await openai.beta.assistants.create({
        name: "Personal Trainer Assistant",
        instructions: "You are a personal trainer chat assistant. Keep responses SHORT (1-3 sentences max). Help with exercise form, technique questions, and motivation. Always speak as 'we' (not 'I' or 'you'). DO NOT suggest plan changes, create new plans, or recommend modifications - the user already has their plan. If they ask about plan changes or mention disliking something, remind them we can reevaluate their plan in the weekly check-in. Focus on answering specific questions about their current routine. Be encouraging and concise.",
        model: "gpt-4.1-mini"
      })
      console.log(`[ASSISTANT] Created new assistant: ${assistant.id}`)
    }

    // Generate dynamic context for assistant instructions
    const generateContextualInstructions = (profile: any, activePlan: any) => {
      let instructions = `You are a personal trainer AI assistant helping ${profile.full_name || 'the user'}.\n\n`
      
      instructions += `USER PROFILE:\n`
      if (profile.training_experience_years) {
        instructions += `- Training Experience: ${profile.training_experience_years} years\n`
      }
      if (profile.primary_fitness_goal) {
        instructions += `- Primary Goal: ${profile.primary_fitness_goal}\n`
      }
      if (profile.training_days_per_week) {
        instructions += `- Training Frequency: ${profile.training_days_per_week} days per week\n`
      }
      if (profile.current_training_split) {
        instructions += `- Current Split: ${profile.current_training_split}\n`
      }
      if (profile.training_location_type) {
        instructions += `- Training Location: ${profile.training_location_type.replace('_', ' ')}\n`
      }
      
      if (activePlan) {
        instructions += `\nACTIVE TRAINING PLAN:\n`
        instructions += `- Plan Name: ${activePlan.plan_name}\n`
        instructions += `- Start Date: ${activePlan.start_date}\n`
        instructions += `- The user has an active training plan with ${activePlan.plan_data.totalWeeks} weeks\n`
      } 
      
      instructions += `\nAnswer questions about their current plan. Keep responses SHORT (1-3 sentences). Always speak as 'we'. DO NOT suggest plan changes or modifications. If they ask about changes or mention disliking something, remind them we can reevaluate in the weekly check-in. Focus on form, technique, and motivation only.`
      
      return instructions
    }

    const contextualInstructions = generateContextualInstructions(userContext.profile, userContext.activePlan)

    // Get or create thread
    let currentThreadId = thread_id
    if (!currentThreadId) {
      console.log(`[THREAD] Creating new thread`)
      const thread = await openai.beta.threads.create()
      currentThreadId = thread.id
      console.log(`[THREAD] Created new thread: ${currentThreadId}`)
    } else {
      console.log(`[THREAD] Using existing thread: ${currentThreadId}`)
    }

    // Add user message to thread
    console.log(`[MESSAGE] Adding user message to thread`)
    await openai.beta.threads.messages.create(currentThreadId, {
      role: "user",
      content: message
    })

    // Create and run assistant
    console.log(`[RUN] Creating run with assistant`)
    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: assistant.id,
      additional_instructions: contextualInstructions
    })

    // Poll for completion
    console.log(`[RUN] Polling for run completion`)
    let runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id)
    
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000))
      runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id)
      console.log(`[RUN] Status: ${runStatus.status}`)
    }

    if (runStatus.status === 'completed') {
      // Get the assistant's response
      const messages = await openai.beta.threads.messages.list(currentThreadId, {
        order: 'desc',
        limit: 1
      })
      
      const assistantMessage = messages.data[0]
      const responseContent = assistantMessage.content[0]
      
      let responseText = ''
      if (responseContent.type === 'text') {
        responseText = responseContent.text.value
      }

      console.log(`[SUCCESS] Chat completed - Total time: ${Date.now() - startTime}ms`)
      return new Response(JSON.stringify({
        response: responseText,
        thread_id: currentThreadId,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime
      }), {
        headers: { "Content-Type": "application/json" }
      })
    } else {
      console.error(`[RUN] Run failed with status: ${runStatus.status}`)
      return new Response(JSON.stringify({ 
        error: 'Assistant run failed',
        details: runStatus.last_error?.message || `Run status: ${runStatus.status}`,
        thread_id: currentThreadId
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

  } catch (err) {
    const errorTime = Date.now() - (startTime || Date.now())
    console.error(`[ERROR] Function error: ${err.message} (${errorTime}ms)`)
    console.error(`[ERROR] Stack trace: ${err.stack}`)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: err.message,
      timestamp: new Date().toISOString(),
      executionTimeMs: errorTime
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/pt-chat' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"message":"How should I modify my current workout?","thread_id":"thread_abc123"}'

*/