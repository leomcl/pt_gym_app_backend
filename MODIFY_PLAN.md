# modify-training-plan Function

A Supabase Edge Function that modifies existing training plans based on weekly analysis results.

## Purpose

This function analyzes weekly training performance data and automatically modifies existing training plans to better align with user progress, recovery, and adherence patterns. It integrates with OpenAI's GPT-4o-mini to intelligently adjust training parameters based on comprehensive analysis results.

## Input

### HTTP Method
- **POST** only

### Headers
- `Authorization: Bearer <JWT_TOKEN>` (required)
- `Content-Type: application/json`

### Request Body
The function expects an `AnalysisResult` object with the following structure:

```json
{
  "recommendation": "maintain" | "increase" | "decrease" | "modify" | "deload",
  "confidence": number,
  "overallScore": number,
  "factors": {
    "performance": number,
    "recovery": number,
    "adherence": number,
    "lifestyle": number
  },
  "reasons": string[],
  "weekDateRange": string
}
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `recommendation` | string | Training plan adjustment recommendation (maintain/increase/decrease/modify/deload) |
| `confidence` | number | Confidence score (0.0-1.0) for the recommendation |
| `overallScore` | number | Overall weekly performance score (0.0-1.0) |
| `factors.performance` | number | Performance factor score (0.0-1.0) |
| `factors.recovery` | number | Recovery factor score (0.0-1.0) |
| `factors.adherence` | number | Adherence factor score (0.0-1.0) |
| `factors.lifestyle` | number | Lifestyle factor score (0.0-1.0) |
| `reasons` | string[] | Array of specific reasons for the recommendation |
| `weekDateRange` | string | Date range for the analyzed week |

## Output

### Success Response (200)
```json
{
  "message": "Training plan modified and saved successfully",
  "userId": "string",
  "planId": "string",
  "recommendation": "string",
  "confidence": number,
  "analysisResults": { /* AnalysisResult object */ },
  "modifiedPlan": { /* New training plan JSON */ },
  "startDate": "string",
  "previousPlan": {
    "planId": "string",
    "planName": "string"
  },
  "timestamp": "string",
  "executionTimeMs": number
}
```

### Error Responses

#### 401 - Authentication Error
```json
{
  "error": "Missing Authorization header" | "Authentication failed",
  "details": "string"
}
```

#### 400 - Validation Error
```json
{
  "error": "Missing required fields" | "Invalid recommendation" | "Invalid request body",
  "details": "string",
  "missingFields": string[] // for missing fields error
}
```

#### 404 - No Active Plan
```json
{
  "error": "Current training plan not found",
  "details": "No active training plan found for user. Please generate a training plan first.",
  "userId": "string"
}
```

#### 405 - Method Not Allowed
```json
{
  "error": "Method not allowed",
  "details": "Only POST requests are supported"
}
```

#### 500 - Server Error
```json
{
  "error": "Internal server error" | "OpenAI API key not configured" | "OpenAI API request failed",
  "details": "string",
  "timestamp": "string",
  "executionTimeMs": number
}
```

## Process Flow

1. **Authentication**: Validates JWT token from Authorization header
2. **Input Validation**: Validates request body structure and required fields
3. **Plan Retrieval**: Fetches user's current active training plan
4. **Prompt Generation**: Creates AI prompt based on analysis results and current plan
5. **AI Processing**: Calls OpenAI API to generate modified training plan
6. **Plan Replacement**: Deletes old plan and saves new modified plan
7. **Response**: Returns success response with modified plan details

## Modification Types

### maintain
- Keep same exercise selection and structure
- Small progressive adjustments (weight, reps, sets)
- Sustainable progression

### increase
- Add 1-2 extra sets to compound movements
- Increase weight by 2.5-5%
- Add 1-2 additional exercises per day
- Consider adding extra training day

### decrease
- Reduce sets by 1-2 per exercise
- Lower weight by 5-10%
- Remove 1-2 exercises per day
- Focus on movement quality

### modify
- Replace problematic exercises
- Adjust training split structure
- Improve exercise variety
- Maintain similar volume

### deload
- Reduce weights by 20-30%
- Decrease sets by 1-2 per exercise
- Add rest days/active recovery
- Focus on form and mobility

## Dependencies

- Supabase (database and authentication)
- OpenAI API (GPT-4o-mini model)
- Required environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `OPENAI_API_KEY`

## Usage Example

```bash
curl -X POST 'https://your-supabase-url.supabase.co/functions/v1/modify-training-plan' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
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
```