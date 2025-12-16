-- PostgreSQL Trigger for risk_events table
-- This trigger sends a NOTIFY event whenever a risk event is inserted or updated with status 'detected'

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS risk_event_notify_trigger ON risk_events;
DROP FUNCTION IF EXISTS notify_risk_event();

-- Create the notification function
CREATE OR REPLACE FUNCTION notify_risk_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Send notification with event details as JSON payload
    PERFORM pg_notify('risk_event_updates', json_build_object(
        'event_id', NEW.event_id,
        'shipment_id', NEW.shipment_id,
        'risk_type', NEW.risk_type,
        'severity', NEW.severity,
        'status', NEW.status
    )::text);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER risk_event_notify_trigger
AFTER INSERT OR UPDATE ON risk_events
FOR EACH ROW
WHEN (NEW.status = 'detected')
EXECUTE FUNCTION notify_risk_event();

-- Verify trigger creation
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'risk_event_notify_trigger';
