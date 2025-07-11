-- Mock data for user_weight_history table
-- This creates 30 days of weight history for testing the generate-diet-plan function

-- Replace 'your-user-id-here' with an actual user ID from your auth.users table
-- You can find user IDs by running: SELECT id FROM auth.users LIMIT 5;

INSERT INTO user_weight_history (user_id, weight_kg, measurement_date) VALUES
-- User 1: Gradual weight loss trend (80kg to 77.5kg over 30 days)
('your-user-id-here', 80.0, CURRENT_DATE - INTERVAL '30 days'),
('your-user-id-here', 79.8, CURRENT_DATE - INTERVAL '28 days'),
('your-user-id-here', 79.5, CURRENT_DATE - INTERVAL '26 days'),
('your-user-id-here', 79.2, CURRENT_DATE - INTERVAL '24 days'),
('your-user-id-here', 79.0, CURRENT_DATE - INTERVAL '22 days'),
('your-user-id-here', 78.8, CURRENT_DATE - INTERVAL '20 days'),
('your-user-id-here', 78.5, CURRENT_DATE - INTERVAL '18 days'),
('your-user-id-here', 78.3, CURRENT_DATE - INTERVAL '16 days'),
('your-user-id-here', 78.0, CURRENT_DATE - INTERVAL '14 days'),
('your-user-id-here', 77.8, CURRENT_DATE - INTERVAL '12 days'),
('your-user-id-here', 77.6, CURRENT_DATE - INTERVAL '10 days'),
('your-user-id-here', 77.5, CURRENT_DATE - INTERVAL '8 days'),
('your-user-id-here', 77.4, CURRENT_DATE - INTERVAL '6 days'),
('your-user-id-here', 77.3, CURRENT_DATE - INTERVAL '4 days'),
('your-user-id-here', 77.2, CURRENT_DATE - INTERVAL '2 days'),
('your-user-id-here', 77.5, CURRENT_DATE);

-- Alternative scenarios (uncomment one to test different weight trends):

-- Scenario 2: Weight gain trend (70kg to 73kg)
-- ('your-user-id-here', 70.0, CURRENT_DATE - INTERVAL '30 days'),
-- ('your-user-id-here', 70.2, CURRENT_DATE - INTERVAL '28 days'),
-- ('your-user-id-here', 70.5, CURRENT_DATE - INTERVAL '26 days'),
-- ('your-user-id-here', 70.8, CURRENT_DATE - INTERVAL '24 days'),
-- ('your-user-id-here', 71.0, CURRENT_DATE - INTERVAL '22 days'),
-- ('your-user-id-here', 71.3, CURRENT_DATE - INTERVAL '20 days'),
-- ('your-user-id-here', 71.5, CURRENT_DATE - INTERVAL '18 days'),
-- ('your-user-id-here', 71.8, CURRENT_DATE - INTERVAL '16 days'),
-- ('your-user-id-here', 72.0, CURRENT_DATE - INTERVAL '14 days'),
-- ('your-user-id-here', 72.2, CURRENT_DATE - INTERVAL '12 days'),
-- ('your-user-id-here', 72.5, CURRENT_DATE - INTERVAL '10 days'),
-- ('your-user-id-here', 72.7, CURRENT_DATE - INTERVAL '8 days'),
-- ('your-user-id-here', 72.8, CURRENT_DATE - INTERVAL '6 days'),
-- ('your-user-id-here', 72.9, CURRENT_DATE - INTERVAL '4 days'),
-- ('your-user-id-here', 73.0, CURRENT_DATE - INTERVAL '2 days'),
-- ('your-user-id-here', 73.0, CURRENT_DATE);

-- Scenario 3: Weight maintenance with fluctuations (75kg +/- 1kg)
-- ('your-user-id-here', 75.0, CURRENT_DATE - INTERVAL '30 days'),
-- ('your-user-id-here', 75.2, CURRENT_DATE - INTERVAL '28 days'),
-- ('your-user-id-here', 74.8, CURRENT_DATE - INTERVAL '26 days'),
-- ('your-user-id-here', 75.1, CURRENT_DATE - INTERVAL '24 days'),
-- ('your-user-id-here', 74.9, CURRENT_DATE - INTERVAL '22 days'),
-- ('your-user-id-here', 75.3, CURRENT_DATE - INTERVAL '20 days'),
-- ('your-user-id-here', 74.7, CURRENT_DATE - INTERVAL '18 days'),
-- ('your-user-id-here', 75.0, CURRENT_DATE - INTERVAL '16 days'),
-- ('your-user-id-here', 75.2, CURRENT_DATE - INTERVAL '14 days'),
-- ('your-user-id-here', 74.8, CURRENT_DATE - INTERVAL '12 days'),
-- ('your-user-id-here', 75.1, CURRENT_DATE - INTERVAL '10 days'),
-- ('your-user-id-here', 74.9, CURRENT_DATE - INTERVAL '8 days'),
-- ('your-user-id-here', 75.0, CURRENT_DATE - INTERVAL '6 days'),
-- ('your-user-id-here', 75.2, CURRENT_DATE - INTERVAL '4 days'),
-- ('your-user-id-here', 74.8, CURRENT_DATE - INTERVAL '2 days'),
-- ('your-user-id-here', 75.0, CURRENT_DATE);

-- To find your actual user ID, run this query first:
-- SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;