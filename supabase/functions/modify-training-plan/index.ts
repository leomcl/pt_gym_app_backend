// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Training Plan Modifier Function Started")

interface AnalysisResult {
  recommendation: 'maintain' | 'increase' | 'decrease' | 'modify' | 'deload'
  confidence: number
  overallScore: number
  factors: {
    performance: number
    recovery: number
    adherence: number
    lifestyle: number
  }
  reasons: string[]
  weekDateRange: string
  cumulativeWants?: string
  cumulativeAvoids?: string
  hasPain?: boolean
  area?: string
  cause?: string
}

Deno.serve(async (req) => {
  try {
    const startTime = Date.now()
    console.log(`[${new Date().toISOString()}] Function invoked - Method: ${req.method}, URL: ${req.url}`)
    
    // Only allow POST requests
    if (req.method !== 'POST') {
      console.log(`[ERROR] Method not allowed: ${req.method} (${Date.now() - startTime}ms)`)
      return new Response(JSON.stringify({ 
        error: 'Method not allowed',
        details: 'Only POST requests are supported'
      }), { 
        status: 405,
        headers: { "Content-Type": "application/json" }
      })
    }

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

    // Parse request body
    let analysisResult: AnalysisResult
    try {
      const requestBody = await req.json()
      console.log(`[INPUT] Request body keys: ${Object.keys(requestBody).join(', ')}`)
      
      // Validate required fields
      const requiredFields = ['recommendation', 'confidence', 'overallScore', 'factors', 'reasons', 'weekDateRange']
      const missingFields = requiredFields.filter(field => !(field in requestBody))
      
      if (missingFields.length > 0) {
        console.log(`[INPUT] Missing required fields: ${missingFields.join(', ')}`)
        return new Response(JSON.stringify({ 
          error: 'Missing required fields',
          missingFields,
          details: 'Analysis result must include recommendation, confidence, overallScore, factors, reasons, and weekDateRange'
        }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        })
      }

      // Validate pain parameters if hasPain is true
      if (requestBody.hasPain === true) {
        const painFields = ['area', 'cause']
        const missingPainFields = painFields.filter(field => !requestBody[field])
        
        if (missingPainFields.length > 0) {
          console.log(`[INPUT] Missing pain fields: ${missingPainFields.join(', ')}`)
          return new Response(JSON.stringify({ 
            error: 'Missing pain fields',
            missingFields: missingPainFields,
            details: 'When hasPain is true, both area and cause must be provided'
          }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          })
        }
      }

      // Validate recommendation type
      const validRecommendations = ['maintain', 'increase', 'decrease', 'modify', 'deload']
      if (!validRecommendations.includes(requestBody.recommendation)) {
        console.log(`[INPUT] Invalid recommendation: ${requestBody.recommendation}`)
        return new Response(JSON.stringify({ 
          error: 'Invalid recommendation',
          details: `Recommendation must be one of: ${validRecommendations.join(', ')}`,
          received: requestBody.recommendation
        }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        })
      }

      analysisResult = requestBody as AnalysisResult
      console.log(`[INPUT] Analysis result parsed - Recommendation: ${analysisResult.recommendation}, Confidence: ${analysisResult.confidence}`)
      console.log(`[INPUT] CumulativeWants: ${analysisResult.cumulativeWants || 'Not provided'}`)
      console.log(`[INPUT] CumulativeAvoids: ${analysisResult.cumulativeAvoids || 'Not provided'}`)
      console.log(`[INPUT] HasPain: ${analysisResult.hasPain || false}, Area: ${analysisResult.area || 'Not provided'}, Cause: ${analysisResult.cause || 'Not provided'}`)
      
    } catch (parseError) {
      console.error(`[INPUT] Error parsing request body: ${parseError.message}`)
      return new Response(JSON.stringify({ 
        error: 'Invalid request body',
        details: 'Request body must be valid JSON with analysis result data'
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

    // Fetch current active training plan
    console.log(`[PLAN] Fetching current active training plan for user: ${user.id}`)
    const { data: currentPlan, error: planError } = await supabaseClient
      .from('training_plans')
      .select('plan_id, plan_name, plan_data, start_date')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    console.log(`[PLAN] Current plan fetch result - Success: ${!!currentPlan}, Error: ${!!planError} (${Date.now() - startTime}ms)`)
    if (planError) {
      console.error(`[PLAN] Plan error: ${planError.message}, Code: ${planError.code}`)
      return new Response(JSON.stringify({ 
        error: 'Current training plan not found',
        details: 'No active training plan found for user. Please generate a training plan first.',
        userId: user.id,
        planError: planError.message
      }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      })
    }

    console.log(`[PLAN] Current plan found - ID: ${currentPlan.plan_id}, Name: ${currentPlan.plan_name}`)

    // Generate modification prompt based on analysis result and current plan
    const generateModificationPrompt = (analysisResult: AnalysisResult, currentPlan: any) => {
      let prompt = `You are a professional personal trainer AI. You need to modify an existing training plan based on weekly analysis results.\n\n`
      
      // Analysis Summary
      prompt += `=== WEEKLY ANALYSIS RESULTS ===\n`
      prompt += `Recommendation: ${analysisResult.recommendation.toUpperCase()}\n`
      prompt += `Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%\n`
      prompt += `Overall Score: ${(analysisResult.overallScore * 100).toFixed(1)}%\n`
      prompt += `Week Period: ${analysisResult.weekDateRange}\n\n`
      
      // Factor Breakdown
      prompt += `=== FACTOR SCORES ===\n`
      prompt += `Performance: ${(analysisResult.factors.performance * 100).toFixed(1)}%\n`
      prompt += `Recovery: ${(analysisResult.factors.recovery * 100).toFixed(1)}%\n`
      prompt += `Adherence: ${(analysisResult.factors.adherence * 100).toFixed(1)}%\n`
      prompt += `Lifestyle: ${(analysisResult.factors.lifestyle * 100).toFixed(1)}%\n\n`
      
      // Specific Reasons
      prompt += `=== ANALYSIS REASONS ===\n`
      analysisResult.reasons.forEach((reason, index) => {
        prompt += `${index + 1}. ${reason}\n`
      })
      prompt += `\n`
      
      // Pain Information (if provided)
      if (analysisResult.hasPain) {
        prompt += `=== PAIN/INJURY INFORMATION ===\n`
        prompt += `**CRITICAL OVERRIDE**: User has reported pain/injury\n`
        prompt += `Pain Area: ${analysisResult.area}\n`
        prompt += `Pain Cause: ${analysisResult.cause}\n`
        prompt += `**MANDATORY MODIFICATION**: This pain information overrides all other training modifications\n`
        prompt += `\n`
      }
      
      // Cumulative Wants and Avoids (if provided)
      if (analysisResult.cumulativeWants || analysisResult.cumulativeAvoids) {
        prompt += `=== CUMULATIVE USER PREFERENCES ===\n`
        if (analysisResult.cumulativeWants) {
          prompt += `WANTS (MUST INCLUDE): ${analysisResult.cumulativeWants}\n`
        }
        if (analysisResult.cumulativeAvoids) {
          prompt += `AVOIDS (MUST NOT INCLUDE): ${analysisResult.cumulativeAvoids}\n`
        }
        prompt += `\n`
      }
      
      // Current Plan
      prompt += `=== CURRENT TRAINING PLAN ===\n`
      prompt += `Current Plan Name: ${currentPlan.plan_name}\n`
      prompt += `Plan Data: ${JSON.stringify(currentPlan.plan_data)}\n\n`
      
      // Modification Instructions
      prompt += `=== MODIFICATION INSTRUCTIONS ===\n`
      
      // Pain Override Logic
      if (analysisResult.hasPain) {
        prompt += `**PAIN RECOVERY PROTOCOL** (OVERRIDES ALL OTHER MODIFICATIONS):\n`
        prompt += `- IMMEDIATELY avoid all exercises that stress the ${analysisResult.area} area\n`
        prompt += `- Replace painful exercises with pain-free alternatives that don't load the injured area\n`
        prompt += `- Reduce intensity to RPE 5-6 for exercises involving the ${analysisResult.area}\n`
        prompt += `- Focus on maintaining strength in unaffected body parts at normal intensity\n`
        prompt += `- Include gentle mobility and recovery exercises for the ${analysisResult.area}\n`
        prompt += `- Add specific rehabilitation exercises targeting the ${analysisResult.cause} if appropriate\n`
        prompt += `- Prioritize exercises that promote healing and prevent compensation patterns\n`
        prompt += `- Example: If knee pain, maintain all upper body exercises at full intensity, modify or eliminate lower body exercises that cause pain\n`
        prompt += `- Add notes about pain monitoring and when to progress/regress exercises\n`
        prompt += `\n`
      }
      
      switch (analysisResult.recommendation) {
        case 'maintain':
          prompt += `MAINTAIN the current plan structure with minor progressive adjustments:\n`
          prompt += `- Keep the same exercise selection and weekly structure\n`
          prompt += `- Make small increases in weight, reps, or sets for progression\n`
          prompt += `- Ensure the plan remains sustainable and consistent\n`
          break
          
        case 'increase':
          prompt += `INCREASE the training intensity from the current plan:\n`
          prompt += `- Reduce reps by 1-2 per set (max 12 reps per set) while increasing load\n`
          prompt += `- Increase RPE targets by 0.5-1 point (e.g., RPE 7-8 becomes RPE 8-9)\n`
          prompt += `- Add tempo prescriptions for increased time under tension\n`
          prompt += `- Include load progression notes (e.g., "Increase weight by 2.5-5% from last week")\n`
          prompt += `- Focus on progressive overload through intensity, not volume\n`
          prompt += `- Add fatigue management cues in day notes\n`
          break
          
        case 'decrease':
          prompt += `DECREASE the training intensity/volume from the current plan:\n`
          prompt += `- Reduce RPE targets by 1-2 points (e.g., RPE 8-9 becomes RPE 6-7)\n`
          prompt += `- Decrease volume by 20-30% (reduce sets or exercises)\n`
          prompt += `- Remove tempo prescriptions and use natural cadence\n`
          prompt += `- Include recovery-focused notes (e.g., "Focus on form and feel")\n`
          prompt += `- Emphasize movement quality and technique refinement\n`
          prompt += `- Add mobility work and corrective exercises\n`
          break
          
        case 'modify':
          prompt += `MODIFY the plan structure and exercise selection:\n`
          prompt += `- Replace exercises while maintaining movement patterns (push/pull balance)\n`
          prompt += `- Adjust training split based on recovery and lifestyle factors\n`
          prompt += `- Include exercise variations that target same muscles differently\n`
          prompt += `- Maintain similar volume landmarks but improve movement quality\n`
          prompt += `- Add exercise progression/regression options in notes\n`
          prompt += `- Focus on adherence-friendly exercise selection\n`
          break
          
        case 'deload':
          prompt += `DELOAD the current plan for recovery:\n`
          prompt += `- Reduce RPE targets to 5-7 across all exercises\n`
          prompt += `- Decrease volume by 40-50% (reduce sets and/or exercises)\n`
          prompt += `- Remove all tempo prescriptions, use natural movement\n`
          prompt += `- Include extensive warm-up and mobility work\n`
          prompt += `- Add recovery-focused notes (e.g., "Priority: joint health and movement quality")\n`
          prompt += `- Focus on corrective exercises and movement preparation\n`
          prompt += `- Include sleep and stress management cues in day notes\n`
          break
      }
      
      prompt += `\n=== OUTPUT REQUIREMENTS ===\n`
      prompt += `1. Create a modified training plan based on the analysis results\n`
      prompt += `2. Maintain the same JSON structure as the current plan\n`
      prompt += `3. The JSON output MUST be minified into a single line, with no newlines or indentation\n`
      prompt += `4. Include appropriate notes explaining the modifications made\n`
      prompt += `5. Ensure the plan reflects the ${analysisResult.recommendation.toUpperCase()} recommendation\n`
      prompt += `6. Keep the plan practical and achievable based on the analysis factors\n`
      
      // Only add user preference constraints if they exist
      if (analysisResult.cumulativeWants || analysisResult.cumulativeAvoids) {
        prompt += `7. **CRITICAL**: `
        if (analysisResult.cumulativeWants) {
          prompt += `The modified workout MUST contain exercises that fulfill the user's WANTS`
        }
        if (analysisResult.cumulativeWants && analysisResult.cumulativeAvoids) {
          prompt += ` and `
        }
        if (analysisResult.cumulativeAvoids) {
          prompt += `MUST NOT contain any exercises that are in the AVOIDS list`
        }
        prompt += `\n`
        prompt += `8. When selecting exercises, `
        if (analysisResult.cumulativeWants) {
          prompt += `prioritize those that match the WANTS preferences`
        }
        if (analysisResult.cumulativeWants && analysisResult.cumulativeAvoids) {
          prompt += ` while `
        }
        if (analysisResult.cumulativeAvoids) {
          prompt += `avoiding all AVOIDS items`
        }
        prompt += `\n`
      }
      
      return prompt
    }

    // Generate the LLM prompt
    console.log('[LLM] Generating modification prompt for OpenAI')
    const llmPrompt = generateModificationPrompt(analysisResult, currentPlan)
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
    console.log(`[OPENAI] Calling OpenAI API for plan modification (${Date.now() - startTime}ms)`)
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
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert personal trainer AI that modifies training plans based on weekly analysis results. You must respond with a valid JSON training plan that reflects the requested modifications.

## Rules:
1. **JSON Output Only:** You will ALWAYS respond with a single, raw, valid JSON object. Do not include any introductory text, markdown formatting like \`\`\`json, or any explanations outside of the JSON object itself.
2. **Minified Format:** The entire JSON output MUST be minified into a single line, with no newlines or indentation.
3. **Strict Schema Adherence:** You must strictly adhere to the JSON schema provided. Do not invent new keys or change the data types.
4. **Program Structure:** The training plan must follow a logical structure (e.g., Push/Pull/Legs, Upper/Lower, Full Body split) and demonstrate the principle of **progressive overload**.
5. Each training day MUST contain between 6 and 8 exercises. The workout should be structured logically: Begin with 1-2 primary compound movements, followed by 3-4 secondary/accessory movements, and conclude with 1-2 isolation or finisher exercises.
6. **Volume Constraints:** Each exercise MUST have a maximum of 3 sets and a maximum of 12 reps per set. Never exceed these limits.
7. **PAIN/INJURY PRIORITY:** If hasPain is true, pain management and recovery takes absolute priority over all other modifications. The plan must be completely restructured around avoiding the injured area while maintaining training for unaffected body parts. This overrides all other considerations including user preferences and analysis recommendations.
8. **USER PREFERENCES:** If cumulative wants and avoids are provided, the modified workout MUST contain exercises that fulfill the user's WANTS and MUST NOT contain any exercises that are in the AVOIDS list. When provided, these preferences are mandatory and non-negotiable.
9. **Scientific Programming Principles:**
    * **Week Notes:** Include weekly volume targets (total sets per muscle group), progressive overload strategy, and deload recommendations every 4-6 weeks.
    * **Movement Pattern Balance:** Ensure push/pull ratios (1:1 or 2:3), hip hinge/squat balance, and unilateral/bilateral exercise distribution.
    * **Volume Landmarks:** Follow evidence-based volume guidelines: Beginners 10-14 sets/muscle/week, Intermediate 14-20 sets/muscle/week, Advanced 16-26 sets/muscle/week.
10. **Day Notes (Mandatory - Scientific Focus):**
    * MUST include target RPE range for the day (e.g., "Target RPE: 7-8 for all compound movements, 8-9 for isolation")
    * MUST specify rest periods between exercises based on training goal: Strength (3-5min), Hypertrophy (60-90s), Endurance (30-60s)
    * MUST include movement pattern focus (e.g., "Focus: Hip hinge dominance with explosive concentric")
    * MUST include fatigue management cues (e.g., "Monitor bar speed - stop set if velocity drops >20%")
    * For rest days: Include active recovery protocols and mobility focus areas.
    * For pain management: Include specific pain monitoring instructions and modification cues.
11. **Exercise Execution (Scientific Precision):**
    * **Exercise Name:** Include tempo prescriptions in format: "Exercise Name (Eccentric-Pause-Concentric-Rest)". Example: "Bench Press (3-1-2-0)" = 3sec down, 1sec pause, 2sec up, no rest at top.
    * **Reps Field:** Use RPE-based ranges: "8-10 @ RPE 7-8" or percentage-based: "6-8 @ 75-80%" or time under tension: "10-12 (3sec negatives)".
    * **Load Prescription:** For beginners use bodyweight/%BW recommendations, intermediate use RPE 6-8, advanced use RPE 7-9.
    * **Exercise Notes:** Include starting load recommendations, form cues, range of motion requirements, and rest between sets.
12. **Exercise Ordering (Evidence-Based Sequencing):**
    * Position 1-2: Primary compound movements (squats, deadlifts, bench, rows) - highest neural demand
    * Position 3-4: Secondary compound movements (lunges, dips, pull-ups) - moderate neural demand  
    * Position 5-6: Isolation movements (curls, extensions, raises) - low neural demand
    * Position 7-8: Corrective/mobility exercises or metabolic finishers
13. **Single Week Structure:** The plan contains exactly one week of training with 7 days (dayNumber 1-7).
14. **Rest Days:** For rest days, the \`dayName\` must be \"Rest Day\", \`notes\` should contain an active recovery suggestion, and the \`exercises\` array MUST be empty but present.
15. **Modification Focus:** The plan must clearly reflect the analysis recommendation (maintain, increase, decrease, modify, or deload).
16. **Pain Management Priority:** When hasPain is true, immediately restructure the plan to avoid loading the injured area while maintaining training intensity for unaffected body parts. Include pain monitoring cues and recovery-focused modifications.
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
    const modifiedPlanJson = openaiData.choices[0].message.content
    console.log(`[OPENAI] Response content length: ${modifiedPlanJson?.length || 0} characters`)

    // Parse the JSON to validate it
    console.log(`[PARSING] Validating JSON response from OpenAI (${Date.now() - startTime}ms)`)
    let parsedModifiedPlan
    try {
      parsedModifiedPlan = JSON.parse(modifiedPlanJson)
      console.log(`[PARSING] JSON validation successful (${Date.now() - startTime}ms)`)
    } catch (parseError) {
      console.error(`[PARSING] JSON parse error: ${parseError.message}`)
      console.error(`[PARSING] Raw response preview: ${modifiedPlanJson?.substring(0, 500)}...`)
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON response from OpenAI',
        details: parseError.message,
        rawResponse: modifiedPlanJson
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Delete the current active plan (no need to keep history)
    console.log(`[DATABASE] Deleting current plan for user: ${user.id}`)
    const { error: deleteError } = await supabaseClient
      .from('training_plans')
      .delete()
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (deleteError) {
      console.error(`[DATABASE] Error deleting current plan: ${deleteError.message}`)
      return new Response(JSON.stringify({ 
        error: 'Failed to delete current plan',
        details: deleteError.message
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    } else {
      console.log('[DATABASE] Current plan deleted successfully')
    }

    // Save the modified training plan to the database
    console.log(`[DATABASE] Saving modified training plan for user: ${user.id}`)
    const { data: savedPlan, error: saveError } = await supabaseClient
      .from('training_plans')
      .insert({
        user_id: user.id,
        plan_name: analysisResult.recommendation,
        start_date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        plan_data: parsedModifiedPlan,
        is_active: true
      })
      .select()
      .single()

    if (saveError) {
      console.error(`[DATABASE] Error saving modified training plan: ${saveError.message}`)
      return new Response(JSON.stringify({ 
        error: 'Failed to save modified training plan',
        details: saveError.message,
        modifiedPlan: parsedModifiedPlan // Still return the generated plan
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    console.log(`[DATABASE] Modified training plan saved successfully with ID: ${savedPlan.plan_id} (${Date.now() - startTime}ms)`)

    // Return the modified training plan with analysis results
    console.log(`[SUCCESS] Function completed successfully for user: ${user.id} - Total time: ${Date.now() - startTime}ms`)
    return new Response(JSON.stringify({
      message: 'Training plan modified and saved successfully',
      userId: user.id,
      planId: savedPlan.plan_id,
      recommendation: analysisResult.recommendation,
      confidence: analysisResult.confidence,
      analysisResults: analysisResult,
      modifiedPlan: parsedModifiedPlan,
      startDate: savedPlan.start_date,
      previousPlan: {
        planId: currentPlan.plan_id,
        planName: currentPlan.plan_name
      },
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/modify-training-plan' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "recommendation": "increase",
      "confidence": 0.92,
      "overallScore": 0.85,
      "factors": {
        "performance": 0.9,
        "recovery": 0.8,
        "adherence": 0.85,
        "lifestyle": 0.7
      },
      "reasons": [
        "Excellent workout completion (5/5 workouts)",
        "Strong performance improvement reported",
        "Good recovery indicators with high energy levels"
      ],
      "weekDateRange": "2024-01-15 to 2024-01-21"
    }'

*/