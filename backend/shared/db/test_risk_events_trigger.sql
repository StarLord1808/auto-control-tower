-- Test script for risk_events trigger
-- This script tests the trigger by inserting a test risk event

-- First, verify the trigger exists
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'risk_event_notify_trigger';

-- Insert a test risk event (you'll need to have a valid shipment_id)
-- Replace 'SHP_001' with an actual shipment_id from your database
/*
INSERT INTO risk_events (
    event_id,
    shipment_id,
    risk_type,
    severity,
    status,
    description,
    detected_at
) VALUES (
    'TEST_EVENT_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'SHP_001',
    'delay',
    'high',
    'detected',
    'Test risk event to verify trigger functionality',
    NOW()
);
*/

-- To test, uncomment the INSERT above and replace SHP_001 with a valid shipment_id
-- Then run this script and check if the listener receives the notification
