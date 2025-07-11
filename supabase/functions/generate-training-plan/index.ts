// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Training Plan Generator Function Started")

Deno.serve(async (req) => {
  try {
    const startTime = Date.now()
    console.log(`[${new Date().toISOString()}] Function invoked - Method: ${req.method}, URL: ${req.url}`)
    
    // Extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log(`[AUTH] Authorization header present: ${!!authHeader}`)
    if (!authHeader) {
      console.log(`[AUTH] Missing Authorization header - returning 401 (${Date.now() - startTime}ms)`)
      return new Response(JSON.stringify({ 
        error: 'Missing Authorization header' 
      }), { 
        status: 401,
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
    console.log(`[AUTH] User validation result - Success: ${!!user}, Error: ${!!error} (${Date.now() - startTime}ms)`)
    if (error) {
      console.error(`[AUTH] User validation error: ${error.message}`)
    }
    if (user) {
      console.log(`[AUTH] Authenticated user ID: ${user.id}`)
    }
    
    if (error || !user) {
      console.error(`[AUTH] Authentication failed - returning 401 (${Date.now() - startTime}ms)`)
      return new Response(JSON.stringify({ 
        error: 'Authentication failed',
        details: error?.message 
      }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Fetch user profile data from database
    console.log(`[PROFILE] Fetching profile for user: ${user.id}`)
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select(`
        full_name,
        date_of_birth,
        height_cm,
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
        profile_completed,
        training_location_type,
        dietary_preferences,
        allergies,
        user_wants,
        user_avoids,
        target_weight_kg
      `)
      .eq('id', user.id)
      .single()

    console.log(`[PROFILE] Profile fetch result - Success: ${!!profile}, Error: ${!!profileError} (${Date.now() - startTime}ms)`)
    if (profileError) {
      console.error(`[PROFILE] Profile error: ${profileError.message}, Code: ${profileError.code}`)
      return new Response(JSON.stringify({ 
        error: 'Profile not found',
        details: 'User profile does not exist. Please complete your profile first.',
        userId: user.id,
        profileError: profileError.message
      }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      })
    }

    console.log(`[PROFILE] Profile found for user: ${user.id} (${Date.now() - startTime}ms)`)
    console.log(`[PROFILE] Profile data keys: ${Object.keys(profile || {}).join(', ')}`)

    // Check if profile is complete enough for training plan generation
    const requiredFields = ['training_experience_years', 'primary_fitness_goal', 'training_days_per_week']
    const missingFields = requiredFields.filter(field => {
      const value = profile[field]
      return value === null || value === undefined || value === ''
    })
    
    console.log(`[VALIDATION] Required fields check - Missing: ${missingFields.length > 0 ? missingFields.join(', ') : 'None'}`)
    requiredFields.forEach(field => {
      console.log(`[VALIDATION] ${field}: ${profile[field]}`)
    })
    
    if (missingFields.length > 0) {
      console.error(`[VALIDATION] Profile incomplete - returning 400 (${Date.now() - startTime}ms)`)
      return new Response(JSON.stringify({ 
        error: 'Incomplete profile',
        details: `Missing required fields for training plan generation: ${missingFields.join(', ')}`,
        missingFields,
        profile
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Calculate age if date of birth is available
    let age = null
    if (profile.date_of_birth) {
      const today = new Date()
      const birthDate = new Date(profile.date_of_birth)
      age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
    }

    // Generate comprehensive LLM prompt using user profile data
    const generateTrainingPlanPrompt = (profile: any, age: number | null) => {
      let prompt = `You are a professional personal trainer. Create a personalized, detailed training plan based on the following user profile:\n\n`
      
      // Personal Information
      prompt += `=== USER PROFILE ===\n`
      if (profile.full_name) prompt += `Name: ${profile.full_name}\n`
      if (age) prompt += `Age: ${age} years old\n`
      if (profile.height_cm) {
        prompt += `Physical Stats: ${profile.height_cm}cm\n`
      }
      
      // Training Background
      prompt += `\n=== TRAINING BACKGROUND ===\n`
      prompt += `Experience Level: ${profile.training_experience_years} years\n`
      prompt += `Available Training Days: ${profile.training_days_per_week} days per week\n`
      prompt += `Training Location: ${profile.training_location_type?.replace('_', ' ')}\n`
      if (profile.current_training_split) {
        prompt += `Current Training Split: ${profile.current_training_split}\n`
      }
      
      // Goals
      prompt += `\n=== FITNESS GOALS ===\n`
      prompt += `Primary Goal: ${profile.primary_fitness_goal}\n`
      if (profile.short_term_goal) prompt += `Short-term Goal: ${profile.short_term_goal}\n`
      if (profile.long_term_goal) prompt += `Long-term Goal: ${profile.long_term_goal}\n`
      
      // Schedule & Preferences
      prompt += `\n=== SCHEDULE & PREFERENCES ===\n`
      if (profile.preferred_workout_duration) {
        prompt += `Preferred Workout Duration: ${profile.preferred_workout_duration} minutes\n`
      }
      if (profile.preferred_training_time) {
        prompt += `Preferred Training Time: ${profile.preferred_training_time}\n`
      }
      if (profile.wake_up_time && profile.bed_time) {
        prompt += `Sleep Schedule: ${profile.wake_up_time} - ${profile.bed_time}\n`
      }
      
      // Cardio Preferences
      if (profile.does_cardio) {
        prompt += `\n=== CARDIO PREFERENCES ===\n`
        prompt += `Does Cardio: Yes\n`
        if (profile.cardio_type) prompt += `Cardio Type: ${profile.cardio_type}\n`
        if (profile.cardio_frequency_per_week) {
          prompt += `Cardio Frequency: ${profile.cardio_frequency_per_week} times per week\n`
        }
      } else {
        prompt += `\n=== CARDIO PREFERENCES ===\n`
        prompt += `Does Cardio: No\n`
      }
      
      // Exercise Preferences
      if (profile.user_wants || profile.user_avoids) {
        prompt += `\n=== EXERCISE PREFERENCES ===\n`
        if (profile.user_wants) prompt += `Wants to Include: ${profile.user_wants}\n`
        if (profile.user_avoids) prompt += `Wants to Avoid: ${profile.user_avoids}\n`
      }
      
      // Nutrition & Health
      if (profile.dietary_preferences || profile.allergies?.length > 0) {
        prompt += `\n=== NUTRITION & HEALTH ===\n`
        if (profile.dietary_preferences) {
          prompt += `Dietary Preferences: ${JSON.stringify(profile.dietary_preferences)}\n`
        }
        if (profile.allergies?.length > 0) {
          prompt += `Allergies: ${profile.allergies.join(', ')}\n`
        }
      }
      
      // Instructions for the LLM
      prompt += `\n=== TRAINING PLAN REQUIREMENTS ===\n`
      prompt += `Please create a comprehensive training plan that includes:\n`
      prompt += `1. MANDATORY: Complete 7-day weekly schedule (days 1-7) - ALL 7 DAYS MUST BE INCLUDED\n`
      prompt += `2. Training days: ${profile.training_days_per_week} workout days with specific exercises\n`
      prompt += `3. Rest days: ${7 - profile.training_days_per_week} rest days strategically placed for optimal recovery\n`
      prompt += `4. Specific exercises with sets, reps, and weights/progression\n`
      prompt += `5. Single week format (no totalWeeks field needed)\n`
      
      if (profile.does_cardio) {
        prompt += `6. Cardio integration (${profile.cardio_frequency_per_week}x per week)\n`
      }
      
      prompt += `7. The JSON output MUST be minified into a single line, with no newlines or indentation.\n`
      
      // Strategic rest day placement guidance
      prompt += `\n=== STRATEGIC REST DAY PLACEMENT ===\n`
      prompt += `CRITICAL: Apply modern sports science principles for rest day placement:\n`
      prompt += `1. MUSCLE RECOVERY TIMING: Allow 48-72 hours between training the same muscle groups\n`
      prompt += `2. PATTERN DISTRIBUTION: Avoid consecutive high-intensity days targeting similar movement patterns\n`
      prompt += `3. WEEKLY STRUCTURE: Distribute rest days to optimize recovery and performance\n`
      
      // Specific guidance based on training frequency
      if (profile.training_days_per_week === 3) {
        prompt += `FOR 3-DAY TRAINING:\n`
        prompt += `- Place rest days between training days (e.g., Train-Rest-Train-Rest-Train-Rest-Rest)\n`
        prompt += `- Ensure at least 1 day between each workout for full recovery\n`
        prompt += `- Weekend can have 2 consecutive rest days for lifestyle balance\n`
      } else if (profile.training_days_per_week === 4) {
        prompt += `FOR 4-DAY TRAINING:\n`
        prompt += `- Use patterns similar to 2-on-1-off-2-on-2-off or upper/lower splits\n`
        prompt += `- Separate muscle groups with strategic rest placement\n`
        prompt += `- Place rest day mid-week to break up training stress\n`
      } else if (profile.training_days_per_week === 5) {
        prompt += `FOR 5-DAY TRAINING:\n`
        prompt += `- Use patterns similar to 3-on-1-off-2-on-1-off or body part splits\n`
        prompt += `- Ensure rest days separate high-intensity compound movement days\n`
        prompt += `- Place rest days before/after heaviest training days\n`
      } else if (profile.training_days_per_week === 6) {
        prompt += `FOR 6-DAY TRAINING:\n`
        prompt += `- Use patterns similar to push/pull/legs or upper/lower splits\n`
        prompt += `- Ensure rest day separates repeated movement patterns\n`
        prompt += `- Place rest day before most demanding training session\n`
      }
      
      prompt += `4. ACTIVE RECOVERY: Rest days should include light activity, mobility work, or low-intensity cardio\n`
      prompt += `5. MUSCLE GROUP SPACING: Ensure major muscle groups get adequate recovery time\n`
      prompt += `6. CENTRAL NERVOUS SYSTEM: Allow CNS recovery between high-intensity sessions\n`
      
      // Experience-based adaptations
      prompt += `\n=== EXPERIENCE-BASED ADAPTATIONS ===\n`
      
      const experienceLevel = profile.training_experience_years <= 1 ? 'Beginner' : 
                             profile.training_experience_years <= 3 ? 'Intermediate' : 'Advanced'
      
      prompt += `Training Experience Level: ${experienceLevel} (${profile.training_experience_years} years)\n`
      
      if (experienceLevel === 'Beginner') {
        prompt += `BEGINNER SPECIFICATIONS:\n`
        prompt += `- Focus on movement quality and basic compound movements\n`
        prompt += `- Use RPE 6-7 for compound movements, RPE 7-8 for isolation\n`
        prompt += `- Include form cues in exercise notes for proper technique\n`
        prompt += `- Start with bodyweight or light loads (suggest specific starting weights)\n`
        prompt += `- Volume: 10-14 sets per muscle group per week\n`
        prompt += `- Rest periods: 2-3 minutes compounds, 60-90s isolation\n`
        prompt += `- Include mobility and activation exercises\n`
      } else if (experienceLevel === 'Intermediate') {
        prompt += `INTERMEDIATE SPECIFICATIONS:\n`
        prompt += `- Include periodization with varying rep ranges\n`
        prompt += `- Use RPE 7-8 for compound movements, RPE 8-9 for isolation\n`
        prompt += `- Advanced exercise variations and unilateral work\n`
        prompt += `- Include percentage-based loading recommendations\n`
        prompt += `- Volume: 14-20 sets per muscle group per week\n`
        prompt += `- Rest periods: 3-4 minutes compounds, 60-90s isolation\n`
        prompt += `- Include tempo prescriptions for muscle development\n`
      } else {
        prompt += `ADVANCED SPECIFICATIONS:\n`
        prompt += `- Advanced periodization with autoregulation\n`
        prompt += `- Use RPE 8-9 for compound movements, RPE 9-10 for isolation\n`
        prompt += `- Include advanced techniques (cluster sets, rest-pause, drop sets)\n`
        prompt += `- Percentage-based loading with velocity considerations\n`
        prompt += `- Volume: 16-26 sets per muscle group per week\n`
        prompt += `- Rest periods: 4-5 minutes compounds, 90-120s isolation\n`
        prompt += `- Include fatigue management and autoregulation cues\n`
      }
      
      prompt += `\n=== GOAL-SPECIFIC ADAPTATIONS ===\n`
      prompt += `Primary Goal: ${profile.primary_fitness_goal}\n`
      
      if (profile.primary_fitness_goal?.toLowerCase().includes('strength')) {
        prompt += `STRENGTH FOCUS:\n`
        prompt += `- Emphasize compound movements with lower rep ranges (3-6 reps)\n`
        prompt += `- Use RPE 8-9 for main lifts, longer rest periods (3-5 minutes)\n`
        prompt += `- Include percentage-based loading (75-90% 1RM)\n`
        prompt += `- Focus on hip hinge and squat patterns\n`
      } else if (profile.primary_fitness_goal?.toLowerCase().includes('muscle') || 
                 profile.primary_fitness_goal?.toLowerCase().includes('hypertrophy')) {
        prompt += `HYPERTROPHY FOCUS:\n`
        prompt += `- Emphasize moderate rep ranges (6-12 reps) with tempo control\n`
        prompt += `- Use RPE 7-9, rest periods 60-90 seconds\n`
        prompt += `- Include eccentric emphasis (3-4 second negatives)\n`
        prompt += `- Focus on muscle balance and isolation work\n`
      } else if (profile.primary_fitness_goal?.toLowerCase().includes('weight loss') || 
                 profile.primary_fitness_goal?.toLowerCase().includes('fat loss')) {
        prompt += `FAT LOSS FOCUS:\n`
        prompt += `- Emphasize higher rep ranges (8-15 reps) with shorter rest\n`
        prompt += `- Use RPE 7-8, rest periods 30-60 seconds\n`
        prompt += `- Include metabolic finishers and compound movements\n`
        prompt += `- Focus on calorie burn and muscle preservation\n`
      }
      
      prompt += `\n=== FINAL REQUIREMENTS ===\n`
      prompt += `- Appropriate for ${profile.training_experience_years} years of experience\n`
      prompt += `- Aligned with the primary goal: ${profile.primary_fitness_goal}\n`
      prompt += `- Suitable for ${profile.training_location_type?.replace('_', ' ')} training\n`
      
      if (profile.current_training_split) {
        prompt += `- Create a similar plan to ${profile.current_training_split}\n`
      }
      
      if (profile.preferred_workout_duration) {
        prompt += `- Fits within ${profile.preferred_workout_duration} minute sessions\n`
      }
      
      prompt += `\nFormat the response as a structured training plan with clear sections and actionable guidance.`
      
      return prompt
    }

    // Generate the LLM prompt
    console.log('[LLM] Generating prompt for OpenAI')
    const llmPrompt = generateTrainingPlanPrompt(profile, age)
    console.log(`[LLM] Prompt length: ${llmPrompt.length} characters`)

    // Check OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    console.log(`[OPENAI] API key present: ${!!openaiKey}`)
    if (!openaiKey) {
      console.error(`[OPENAI] Missing API key - returning 500 (${Date.now() - startTime}ms)`)
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        details: 'OPENAI_API_KEY environment variable is missing'
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Call OpenAI API with timeout
    const openaiStartTime = Date.now()
    console.log(`[OPENAI] Calling OpenAI API (${Date.now() - startTime}ms)`)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout
    
    let openaiResponse
    try {
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
        model: 'gpt-4.1-mini', // Faster and cheaper alternative
        messages: [
          {
            role: 'system',
            content: `You are an expert personal trainer and fitness coach AI. Your sole purpose is to generate detailed, structured, and effective gym training plans in a specific JSON format. You must think like a real coach, applying principles of exercise science.

## Rules:
1.  **JSON Output Only:** You will ALWAYS respond with a single, raw, valid JSON object. Do not include any introductory text, markdown formatting like \`\`\`json, or any explanations outside of the JSON object itself.
2.  **Minified Format:** The entire JSON output MUST be minified into a single line, with no newlines or indentation.
3.  **Strict Schema Adherence:** You must strictly adhere to the JSON schema provided. Do not invent new keys or change the data types.
4.  **Program Structure:** The training plan must follow a logical structure (e.g., Push/Pull/Legs, Upper/Lower, Full Body split) and demonstrate the principle of **progressive overload**.
5. Each training day MUST contain between 6 and 8 exercises. The workout should be structured logically: Begin with 1-2 primary compound movements, followed by 3-4 secondary/accessory movements, and conclude with 1-2 isolation or finisher exercises.
6. **Volume Constraints:** Each exercise MUST have a maximum of 3 sets and a maximum of 12 reps per set. Never exceed these limits.
7. **Scientific Programming Principles:**
    * **Week Notes:** Include weekly volume targets (total sets per muscle group), progressive overload strategy, and deload recommendations every 4-6 weeks.
    * **Movement Pattern Balance:** Ensure push/pull ratios (1:1 or 2:3), hip hinge/squat balance, and unilateral/bilateral exercise distribution.
    * **Volume Landmarks:** Follow evidence-based volume guidelines: Beginners 10-14 sets/muscle/week, Intermediate 14-20 sets/muscle/week, Advanced 16-26 sets/muscle/week.
8.  **Day Notes (Mandatory - Scientific Focus):**
    * MUST include target RPE range for the day (e.g., "Target RPE: 7-8 for all compound movements, 8-9 for isolation")
    * MUST specify rest periods between exercises based on training goal: Strength (3-5min), Hypertrophy (60-90s), Endurance (30-60s)
    * MUST include movement pattern focus (e.g., "Focus: Hip hinge dominance with explosive concentric")
    * MUST include fatigue management cues (e.g., "Monitor bar speed - stop set if velocity drops >20%")
    * For rest days: Include active recovery protocols and mobility focus areas.
9. **Exercise Execution (Scientific Precision):**
    * **Exercise Name:** Include tempo prescriptions in format: "Exercise Name (Eccentric-Pause-Concentric-Rest)". Example: "Bench Press (3-1-2-0)" = 3sec down, 1sec pause, 2sec up, no rest at top.
    * **Reps Field:** Use RPE-based ranges: "8-10 @ RPE 7-8" or percentage-based: "6-8 @ 75-80%" or time under tension: "10-12 (3sec negatives)".
    * **Load Prescription:** For beginners use bodyweight/%BW recommendations, intermediate use RPE 6-8, advanced use RPE 7-9.
    * **Exercise Notes:** Include starting load recommendations, form cues, range of motion requirements, and rest between sets.
10. **Exercise Ordering (Evidence-Based Sequencing):**
    * Position 1-2: Primary compound movements (squats, deadlifts, bench, rows) - highest neural demand
    * Position 3-4: Secondary compound movements (lunges, dips, pull-ups) - moderate neural demand  
    * Position 5-6: Isolation movements (curls, extensions, raises) - low neural demand
    * Position 7-8: Corrective/mobility exercises or metabolic finishers
11. **MANDATORY 7-DAY STRUCTURE:** The plan MUST contain exactly 7 days (dayNumber 1-7). NO EXCEPTIONS. Every day from 1 to 7 must be present in the JSON output.
12. **Rest Days:** For rest days, the \`dayName\` must be \"Rest Day\", \`notes\` should contain active recovery protocols and mobility focus areas, and the \`exercises\` array MUST be empty but present.
13. **Strategic Rest Placement:** Rest days must be strategically placed based on muscle recovery science - allow 48-72 hours between training the same muscle groups. Consider movement patterns, training intensity, and central nervous system recovery.
## JSON Schema Example:
{ "weekNumber": 1, "notes": "string (optional)", "days": [{"dayNumber": "integer", "dayName": "string", "notes": "string (mandatory)", "exercises": [{ "name": "string", "sets": "integer", "reps": "string", "notes": "string (optional)"}]}]}`
          },
          {
            role: 'user',
            content: llmPrompt
          }
        ]
        })
      })
      
      clearTimeout(timeoutId)
      console.log(`[OPENAI] Response received - Status: ${openaiResponse.status} (${Date.now() - openaiStartTime}ms)`)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error(`[OPENAI] Fetch error: ${fetchError.message} (${Date.now() - openaiStartTime}ms)`)
      if (fetchError.name === 'AbortError') {
        return new Response(JSON.stringify({ 
          error: 'OpenAI request timeout',
          details: 'The request to OpenAI API timed out after 2 minutes'
        }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        })
      }
      throw fetchError
    }

    if (!openaiResponse.ok) {
      console.error(`[OPENAI] API request failed - Status: ${openaiResponse.status}, Text: ${openaiResponse.statusText}`)
      const errorText = await openaiResponse.text()
      console.error(`[OPENAI] Error response: ${errorText}`)
      return new Response(JSON.stringify({ 
        error: 'OpenAI API request failed',
        details: `Status: ${openaiResponse.status}`,
        statusText: openaiResponse.statusText,
        errorResponse: errorText
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    console.log(`[OPENAI] Parsing response JSON (${Date.now() - startTime}ms)`)
    const openaiData = await openaiResponse.json()
    const trainingPlanJson = openaiData.choices[0].message.content
    console.log(`[OPENAI] Response content length: ${trainingPlanJson?.length || 0} characters`)

    // Parse the JSON to validate it
    console.log(`[PARSING] Validating JSON response from OpenAI (${Date.now() - startTime}ms)`)
    let parsedTrainingPlan
    try {
      parsedTrainingPlan = JSON.parse(trainingPlanJson)
      console.log(`[PARSING] JSON validation successful (${Date.now() - startTime}ms)`)
    } catch (parseError) {
      console.error(`[PARSING] JSON parse error: ${parseError.message}`)
      console.error(`[PARSING] Raw response preview: ${trainingPlanJson?.substring(0, 500)}...`)
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON response from OpenAI',
        details: parseError.message,
        rawResponse: trainingPlanJson
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    // First, deactivate any existing active plans for this user
    console.log(`[DATABASE] Deactivating existing plans for user: ${user.id}`)
    const { error: deactivateError } = await supabaseClient
      .from('training_plans')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (deactivateError) {
      console.log(`[DATABASE] Error deactivating existing plans: ${deactivateError.message}`)
      // Continue anyway - this is not critical
    } else {
      console.log('[DATABASE] Existing plans deactivated successfully')
    }

    // Save the training plan to the database
    console.log(`[DATABASE] Saving new training plan for user: ${user.id}`)
    const { data: savedPlan, error: saveError } = await supabaseClient
      .from('training_plans')
      .insert({
        user_id: user.id,
        plan_name: `Maintain`, //for first ever plan name (focus) will be set to "Maintain" other options are; increase, decrease, modify and deload. These will be used for modifcation of plan in future to give indication of focus of prev week.
        start_date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        plan_data: parsedTrainingPlan,
        is_active: true
      })
      .select()
      .single()

    if (saveError) {
      console.error(`[DATABASE] Error saving training plan: ${saveError.message}`)
      return new Response(JSON.stringify({ 
        error: 'Failed to save training plan',
        details: saveError.message,
        trainingPlan: parsedTrainingPlan // Still return the generated plan
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    console.log(`[DATABASE] Training plan saved successfully with ID: ${savedPlan.plan_id} (${Date.now() - startTime}ms)`)

    // Return the generated and saved training plan
    console.log(`[SUCCESS] Function completed successfully for user: ${user.id} - Total time: ${Date.now() - startTime}ms`)
    return new Response(JSON.stringify({
      message: 'Training plan generated and saved successfully',
      userId: user.id,
      planId: savedPlan.plan_id,
      trainingPlan: parsedTrainingPlan,
      startDate: savedPlan.start_date,
      timestamp: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime
    }), {
      headers: { "Content-Type": "application/json" }
    })

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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-training-plan' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
