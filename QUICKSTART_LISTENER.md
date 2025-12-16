# Quick Start Guide - Risk Events Listener

## Installation

### 1. Install Database Trigger
```bash
export DATABASE_URL="postgresql://user:pass@host:port/dbname"
psql $DATABASE_URL -f backend/flask_api/db/create_risk_events_trigger.sql
```

### 2. Verify Installation
```bash
psql $DATABASE_URL -c "SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'risk_event_notify_trigger';"
```

## Running the Demo

### Option 1: All Services (Recommended)
```bash
./start_demo.sh
```

This starts:
- Backend API on http://localhost:5000
- Database Listener
- Frontend on http://localhost:8000

### Option 2: Individual Services

**Terminal 1 - Backend API:**
```bash
python3 backend/flask-api/main_app.py
```

**Terminal 2 - Listener:**
```bash
python3 backend/flask_api/listener.py
```

**Terminal 3 - Frontend:**
```bash
cd front-end && python3 -m http.server 8000
```

## Testing

### Test the Trigger
```bash
# Insert a test risk event (replace SHP_001 with valid shipment_id)
psql $DATABASE_URL -c "
INSERT INTO risk_events (
    event_id, shipment_id, risk_type, severity, status, description, detected_at
) VALUES (
    'TEST_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'SHP_001',
    'delay',
    'high',
    'detected',
    'Test risk event',
    NOW()
);
"
```

### Check Listener Output
```bash
tail -f listener.log
```

Expected output:
```
Got NOTIFY: {"event_id": "TEST_...", "shipment_id": "SHP_001", ...}
Processing Risk Event: TEST_...
Processing Result: {'status': 'success', ...}
```

### Test API Endpoint
```bash
curl -X POST http://localhost:5000/api/risk-events/process \
  -H "Content-Type: application/json" \
  -d '{"event_id": "TEST_123"}'
```

## Monitoring

### View Logs
```bash
# All logs
tail -f backend.log listener.log frontend.log

# Just listener
tail -f listener.log

# Just backend
tail -f backend.log
```

### Stop Services
Press `Ctrl+C` in the terminal running `start_demo.sh`

Or kill individual processes:
```bash
pkill -f "python3 backend/flask-api/main_app.py"
pkill -f "python3 backend/flask_api/listener.py"
```

## Troubleshooting

### Listener Won't Start
1. Check DATABASE_URL is set
2. Verify PostgreSQL is running
3. Check .env file exists in backend/flask-api/

### No Notifications Received
1. Verify trigger is installed
2. Check risk event has status='detected'
3. Ensure shipment_id is valid

### Processing Errors
1. Check MISTRAL_API_KEY is set
2. Verify all database tables exist
3. Check server.py imports work

## Environment Variables

Required in `backend/flask-api/.env`:
```env
DATABASE_URL=postgresql+psycopg2://user:pass@host:port/dbname
MISTRAL_API_KEY=your_mistral_api_key
STATIC_API_KEY=your_static_api_key
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=True
```
