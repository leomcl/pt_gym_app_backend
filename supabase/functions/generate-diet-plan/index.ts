// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Diet Plan Generator Function Started")

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
        primary_fitness_goal,
        short_term_goal,
        long_term_goal,
        dietary_preferences,
        allergies,
        target_weight_kg,
        training_days_per_week,
        does_cardio,
        cardio_frequency_per_week,
        training_experience_years
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

    // Check required fields for diet plan generation
    const requiredFields = ['primary_fitness_goal', 'height_cm', 'date_of_birth']
    const missingFields = requiredFields.filter(field => {
      const value = profile[field]
      return value === null || value === undefined || value === ''
    })
    
    console.log(`[VALIDATION] Required fields check - Missing: ${missingFields.length > 0 ? missingFields.join(', ') : 'None'}`)
    
    if (missingFields.length > 0) {
      console.error(`[VALIDATION] Profile incomplete - returning 400 (${Date.now() - startTime}ms)`)
      return new Response(JSON.stringify({ 
        error: 'Incomplete profile',
        details: `Missing required fields for diet plan generation: ${missingFields.join(', ')}`,
        missingFields
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Fetch user's 30-day weight history
    console.log(`[WEIGHT] Fetching 30-day weight history for user: ${user.id}`)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: weightHistory, error: weightError } = await supabaseClient
      .from('user_weight_history')
      .select('weight_kg, measurement_date')
      .eq('user_id', user.id)
      .gte('measurement_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('measurement_date', { ascending: true })

    console.log(`[WEIGHT] Weight history fetch result - Records: ${weightHistory?.length || 0}, Error: ${!!weightError}`)
    
    if (weightError) {
      console.error(`[WEIGHT] Weight history error: ${weightError.message}`)
    }

    // Calculate age
    const today = new Date()
    const birthDate = new Date(profile.date_of_birth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    // Get current weight (most recent entry) or use target weight as fallback
    let currentWeight = profile.target_weight_kg
    if (weightHistory && weightHistory.length > 0) {
      currentWeight = weightHistory[weightHistory.length - 1].weight_kg
    }

    // Generate comprehensive LLM prompt for diet plan
    const generateDietPlanPrompt = (profile: any, age: number, weightHistory: any[], currentWeight: number) => {
      let prompt = `You are a professional nutritionist and dietitian. Create a personalized diet plan based on the following user profile and weight history:\n\n`
      
      // Personal Information
      prompt += `=== USER PROFILE ===\n`
      if (profile.full_name) prompt += `Name: ${profile.full_name}\n`
      prompt += `Age: ${age} years old\n`
      prompt += `Height: ${profile.height_cm}cm\n`
      prompt += `Current Weight: ${currentWeight}kg\n`
      if (profile.target_weight_kg) prompt += `Target Weight: ${profile.target_weight_kg}kg\n`
      
      // Fitness Goals
      prompt += `\n=== FITNESS GOALS ===\n`
      prompt += `Primary Goal: ${profile.primary_fitness_goal}\n`
      if (profile.short_term_goal) prompt += `Short-term Goal: ${profile.short_term_goal}\n`
      if (profile.long_term_goal) prompt += `Long-term Goal: ${profile.long_term_goal}\n`
      
      // Activity Level
      prompt += `\n=== ACTIVITY LEVEL ===\n`
      if (profile.training_days_per_week) {
        prompt += `Training Days Per Week: ${profile.training_days_per_week}\n`
      }
      if (profile.does_cardio && profile.cardio_frequency_per_week) {
        prompt += `Cardio Sessions Per Week: ${profile.cardio_frequency_per_week}\n`
      }
      if (profile.training_experience_years) {
        prompt += `Training Experience: ${profile.training_experience_years} years\n`
      }
      
      // Dietary Information
      if (profile.dietary_preferences || profile.allergies?.length > 0) {
        prompt += `\n=== DIETARY INFORMATION ===\n`
        if (profile.dietary_preferences) {
          prompt += `Dietary Preferences: ${JSON.stringify(profile.dietary_preferences)}\n`
        }
        if (profile.allergies?.length > 0) {
          prompt += `Allergies: ${profile.allergies.join(', ')}\n`
        }
      }
      
      // Weight History Analysis
      if (weightHistory && weightHistory.length > 0) {
        prompt += `\n=== 30-DAY WEIGHT HISTORY ===\n`
        prompt += `Number of Measurements: ${weightHistory.length}\n`
        
        const startWeight = weightHistory[0].weight_kg
        const endWeight = weightHistory[weightHistory.length - 1].weight_kg
        const weightChange = endWeight - startWeight
        const daysBetween = Math.floor((new Date(weightHistory[weightHistory.length - 1].measurement_date).getTime() - 
                                      new Date(weightHistory[0].measurement_date).getTime()) / (1000 * 60 * 60 * 24))
        
        prompt += `Weight Change: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg over ${daysBetween} days\n`
        prompt += `Trend: ${weightChange > 0.5 ? 'Gaining' : weightChange < -0.5 ? 'Losing' : 'Maintaining'}\n`
        
        prompt += `Weight Measurements:\n`
        weightHistory.forEach(record => {
          prompt += `- ${record.measurement_date}: ${record.weight_kg}kg\n`
        })
      } else {
        prompt += `\n=== WEIGHT HISTORY ===\n`
        prompt += `No recent weight measurements available. Using current/target weight for calculations.\n`
      }
      
      // Instructions for the LLM
      prompt += `\n=== DIET PLAN REQUIREMENTS ===\n`
      prompt += `Please calculate personalized daily nutrition targets based on:\n`
      prompt += `1. BMR calculation using height, weight, age, and gender (assume based on typical values)\n`
      prompt += `2. TDEE calculation incorporating activity level\n`
      prompt += `3. Caloric adjustment based on fitness goals:\n`
      prompt += `   - Fat loss: 300-500 calorie deficit\n`
      prompt += `   - Maintenance: TDEE calories\n`
      prompt += `   - Muscle gain: 200-300 calorie surplus\n`
      prompt += `4. Macronutrient distribution:\n`
      prompt += `   - Protein: 1.6-2.2g per kg body weight (higher for muscle gain/fat loss)\n`
      prompt += `   - Fat: 0.8-1.2g per kg body weight\n`
      prompt += `   - Carbohydrates: Remaining calories\n`
      prompt += `5. Consider dietary preferences and allergies\n`
      prompt += `6. Account for training frequency and intensity\n`
      prompt += `7. Factor in weight history trends for caloric adjustments\n\n`
      
      prompt += `Provide the numerical values AND reasoning in this exact format:\n`
      prompt += `Daily Calories: [number]\n`
      prompt += `Daily Protein (g): [number]\n`
      prompt += `Daily Carbs (g): [number]\n`
      prompt += `Daily Fat (g): [number]\n`
      prompt += `Notes: [detailed explanation of calculations, BMR, TDEE, goal-based adjustments, macronutrient rationale, and weight trend considerations]\n\n`
      
      prompt += `Include detailed reasoning in the Notes section explaining your calculations and recommendations.`
      
      return prompt
    }

    // Generate the LLM prompt
    console.log('[LLM] Generating prompt for OpenAI')
    const llmPrompt = generateDietPlanPrompt(profile, age, weightHistory || [], currentWeight)
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

    // Call OpenAI API
    const openaiStartTime = Date.now()
    console.log(`[OPENAI] Calling OpenAI API (${Date.now() - startTime}ms)`)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 1 minute timeout
    
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
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: `You are a professional nutritionist and dietitian AI. Your role is to calculate personalized daily nutrition targets based on user data. You must provide ONLY numerical values in the exact format requested, without any explanations or additional text.`
            },
            {
              role: 'user',
              content: llmPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 150
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
          details: 'The request to OpenAI API timed out after 1 minute'
        }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        })
      }
      throw fetchError
    }

    if (!openaiResponse.ok) {
      console.error(`[OPENAI] API request failed - Status: ${openaiResponse.status}`)
      const errorText = await openaiResponse.text()
      console.error(`[OPENAI] Error response: ${errorText}`)
      return new Response(JSON.stringify({ 
        error: 'OpenAI API request failed',
        details: `Status: ${openaiResponse.status}`,
        errorResponse: errorText
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    console.log(`[OPENAI] Parsing response (${Date.now() - startTime}ms)`)
    const openaiData = await openaiResponse.json()
    const dietPlanResponse = openaiData.choices[0].message.content
    console.log(`[OPENAI] Response content: ${dietPlanResponse}`)

    // Parse the structured response
    const parseNutritionValues = (response: string) => {
      const calories = response.match(/Daily Calories:\s*(\d+)/)?.[1]
      const protein = response.match(/Daily Protein \(g\):\s*([\d.]+)/)?.[1]
      const carbs = response.match(/Daily Carbs \(g\):\s*([\d.]+)/)?.[1]
      const fat = response.match(/Daily Fat \(g\):\s*([\d.]+)/)?.[1]
      const notes = response.match(/Notes:\s*([\s\S]*?)(?=\n\n|$)/)?.[1]?.trim()
      
      return {
        calories: calories ? parseInt(calories) : null,
        protein: protein ? parseFloat(protein) : null,
        carbs: carbs ? parseFloat(carbs) : null,
        fat: fat ? parseFloat(fat) : null,
        notes: notes || 'No detailed notes provided'
      }
    }

    const nutritionValues = parseNutritionValues(dietPlanResponse)
    console.log(`[PARSING] Parsed values:`, nutritionValues)

    // Validate parsed values
    if (!nutritionValues.calories || !nutritionValues.protein || !nutritionValues.carbs || !nutritionValues.fat) {
      console.error(`[PARSING] Failed to parse nutrition values from response`)
      return new Response(JSON.stringify({ 
        error: 'Failed to parse nutrition values',
        details: 'Could not extract valid nutrition values from AI response',
        rawResponse: dietPlanResponse
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Deactivate any existing active diet plans for this user
    console.log(`[DATABASE] Deactivating existing diet plans for user: ${user.id}`)
    const { error: deactivateError } = await supabaseClient
      .from('user_diet_plans')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (deactivateError) {
      console.log(`[DATABASE] Error deactivating existing plans: ${deactivateError.message}`)
    } else {
      console.log('[DATABASE] Existing diet plans deactivated successfully')
    }

    // Save the new diet plan to the database
    console.log(`[DATABASE] Saving new diet plan for user: ${user.id}`)
    const { data: savedPlan, error: saveError } = await supabaseClient
      .from('user_diet_plans')
      .insert({
        user_id: user.id,
        daily_calories: nutritionValues.calories,
        daily_protein_g: nutritionValues.protein,
        daily_carbs_g: nutritionValues.carbs,
        daily_fat_g: nutritionValues.fat,
        notes: nutritionValues.notes,
        is_active: true
      })
      .select()
      .single()

    if (saveError) {
      console.error(`[DATABASE] Error saving diet plan: ${saveError.message}`)
      return new Response(JSON.stringify({ 
        error: 'Failed to save diet plan',
        details: saveError.message,
        dietPlan: nutritionValues
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    console.log(`[DATABASE] Diet plan saved successfully with ID: ${savedPlan.id} (${Date.now() - startTime}ms)`)

    // Return the generated and saved diet plan
    console.log(`[SUCCESS] Function completed successfully for user: ${user.id} - Total time: ${Date.now() - startTime}ms`)
    return new Response(JSON.stringify({
      message: 'Diet plan generated and saved successfully',
      userId: user.id,
      planId: savedPlan.id,
      dietPlan: {
        daily_calories: nutritionValues.calories,
        daily_protein_g: nutritionValues.protein,
        daily_carbs_g: nutritionValues.carbs,
        daily_fat_g: nutritionValues.fat,
        notes: nutritionValues.notes
      },
      weightHistory: weightHistory || [],
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