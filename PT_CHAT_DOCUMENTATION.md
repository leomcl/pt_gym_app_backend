# PT Chat Edge Function

## Overview
The `pt-chat` edge function is a Supabase Edge Function that provides an AI-powered personal training assistant. Built on Deno runtime, it integrates with OpenAI's GPT-4.1-mini model through the Assistants API to deliver contextual fitness guidance.

## Architecture

### Core Components
- **Deno Runtime**: TypeScript execution environment with native web APIs
- **OpenAI Assistants API**: Conversational AI with thread-based context management
- **Supabase Client**: Database access and JWT authentication
- **In-Memory Cache**: User context caching with TTL for performance optimization
- **Contextual Instructions**: Dynamic system prompts based on user profile and training plan

### Function Behavior
- **Concise Responses**: Limited to 1-3 sentences for quick guidance
- **Plan Preservation**: Explicitly prevents workout plan modifications
- **Context Awareness**: Leverages cached user profiles and active training plans
- **Thread Continuity**: Maintains conversation history across sessions
- **Error Resilience**: Comprehensive error handling with detailed logging

## API Interface

### Endpoint
```
POST https://<project-ref>.supabase.co/functions/v1/pt-chat
```

### Request Schema
```json
{
  "message": "How should I perform squats?",
  "thread_id": "thread_abc123" // Optional - omit for new conversations
}
```

### Response Schema
```json
{
  "response": "Keep your chest up and drive through your heels. We can review your squat form in more detail during your weekly check-in if needed!",
  "thread_id": "thread_abc123",
  "timestamp": "2025-07-01T10:30:00.000Z",
  "executionTimeMs": 2500
}
```

### Authentication
Requires valid Supabase JWT token:
```http
Authorization: Bearer <supabase_jwt_token>
```

## Technical Implementation

### Data Flow
1. **Request Validation**: JWT authentication and message validation
2. **Context Retrieval**: User profile and training plan data fetching with caching
3. **Assistant Configuration**: Dynamic instruction generation based on user context
4. **Thread Management**: OpenAI conversation thread creation/continuation
5. **AI Processing**: GPT-4.1-mini response generation with contextual constraints
6. **Response Formatting**: Structured JSON response with metadata

### Core Functions

#### Context Caching System
```typescript
const contextCache = new Map<string, { 
  data: any, 
  timestamp: number, 
  ttl: number 
}>()

const CACHE_TTL = 60 * 60 * 1000 // 1 hour

function getCachedContext(userId: string): any | null
function setCachedContext(userId: string, data: any): void
```

#### Dynamic Instruction Generation
```typescript
const generateContextualInstructions = (profile: any, activePlan: any) => {
  // Builds personalized system prompt including:
  // - User's training experience and goals
  // - Current training split and frequency
  // - Active plan details (if exists)
  // - Behavioral constraints (no plan modifications)
}
```

### Database Dependencies
- **user_profiles table**: Complete user fitness profile data
- **training_plans table**: Active training plan with structured plan_data JSON
- **Supabase Auth**: JWT token validation and user identification

### OpenAI Integration
- **Model**: GPT-4.1-mini for optimal speed and cost efficiency
- **Assistant API**: Persistent conversation threads with custom instructions
- **Thread Management**: Automatic thread creation and message history
- **Status Polling**: Real-time run completion monitoring

## Deployment & Configuration

### Environment Variables
```bash
# Required in Supabase Edge Function environment
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-openai-key
OPENAI_ASSISTANT_ID=asst_your-assistant-id  # Optional
```

### Deployment Process
```bash
# Deploy to Supabase
supabase functions deploy pt-chat

# Set environment variables
supabase secrets set OPENAI_API_KEY=sk-your-key
supabase secrets set OPENAI_ASSISTANT_ID=asst-your-id
```

### Local Development
```bash
# Start local Supabase stack
supabase start

# Deploy function locally
supabase functions serve pt-chat

# Test endpoint
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/pt-chat' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"message":"How should I perform squats?"}'
```

### Performance Optimization
- **Context Caching**: 1-hour TTL reduces database queries by ~80%
- **Assistant Reuse**: Persistent assistant reduces initialization overhead
- **Thread Continuity**: Maintains conversation context without re-sending history
- **Error Handling**: Graceful degradation with detailed error responses

### Monitoring & Logging
- **Execution Time**: Tracked and returned in response metadata
- **Error Logging**: Comprehensive error details with stack traces
- **Authentication Tracking**: JWT validation and user identification logs
- **OpenAI API Status**: Assistant run status monitoring and error reporting

## Error Handling & Status Codes

### HTTP Status Codes
- **200**: Successful response with AI message
- **400**: Invalid request (missing message, invalid JSON)
- **401**: Authentication failed (invalid/missing JWT)
- **404**: User profile not found
- **405**: Method not allowed (non-POST requests)
- **500**: Internal server error (OpenAI API issues, database errors)

### Error Response Format
```json
{
  "error": "Profile not found",
  "details": "User profile does not exist. Please complete your profile first.",
  "timestamp": "2025-07-01T10:30:00.000Z",
  "executionTimeMs": 1200
}
```

## Usage Examples

### Basic Chat Request
```bash
curl -X POST https://your-project.supabase.co/functions/v1/pt-chat \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"message": "How should I perform squats?"}'
```

### Continuing Conversation
```bash
curl -X POST https://your-project.supabase.co/functions/v1/pt-chat \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"message": "What about deadlifts?", "thread_id": "thread_abc123"}'
```

### Common Query Types
- **Form Questions**: "How do I perform proper deadlift form?"
- **Motivation**: "I'm feeling unmotivated today"
- **Exercise Info**: "What muscles does bench press work?"
- **Plan Complaints**: "I don't like squats" → Redirected to weekly check-in

## Integration Requirements

### Client-Side
- Valid Supabase JWT token for authentication
- HTTP client capable of POST requests with JSON payloads
- Thread ID storage for conversation continuity

### Server-Side
- User profile must exist in `user_profiles` table
- OpenAI API key configured in Supabase secrets
- Optional: Pre-created OpenAI Assistant ID for consistency