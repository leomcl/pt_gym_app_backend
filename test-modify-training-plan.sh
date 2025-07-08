#!/bin/bash

# Test script for modify-training-plan edge function
# Make sure to run `supabase start` first

echo "Testing modify-training-plan edge function locally..."

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
      "Good recovery indicators with high energy levels",
      "High motivation and adherence to plan"
    ],
    "weekDateRange": "2024-01-15 to 2024-01-21"
  }'