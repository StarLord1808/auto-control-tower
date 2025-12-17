#!/bin/bash

# Kill running python processes to clear ports (Optional, use with caution)
# pkill -f "python3 backend/flask-api/main_app.py"
# pkill -f "python3 backend/flask_api/listener.py"

# Export PYTHONPATH
export PYTHONPATH=$PYTHONPATH:$(pwd)
# Ensure backend module is importable
export PYTHONPATH=$PYTHONPATH:$(pwd)/backend

echo "Starting Backend API on port 5000..."
python3 -u backend/api/main_app.py > backend.log 2>&1 &
BACKEND_PID=$!

echo "Starting DB Listener..."
python3 -u backend/listener/listener.py > listener.log 2>&1 &
LISTENER_PID=$!

echo "Starting Frontend on port 8000..."
cd frontend
python3 -m http.server 8000 > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "Demo is running!"
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:8000"
echo "Press Ctrl+C to stop all services."

trap "kill $BACKEND_PID $LISTENER_PID $FRONTEND_PID; exit" INT
wait
