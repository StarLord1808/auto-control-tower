import select
import psycopg2
import psycopg2.extensions
import sys
import os
from dotenv import load_dotenv

# Add server directory to path to import server functions
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../server')))

# Load env variables from flask-api directory
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../flask-api/.env'))
load_dotenv(env_path)

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("Error: DATABASE_URL not found.")
    sys.exit(1)

# Fix SQLAlchemy URL for psycopg2
if DB_URL.startswith("postgresql+psycopg2://"):
    DB_URL = DB_URL.replace("postgresql+psycopg2://", "postgresql://")

def listen():
    """
    Listen for risk_event_updates notifications from PostgreSQL.
    When a notification is received, process the risk event using the server module.
    """
    print("Listening for risk_event_updates...")
    
    try:
        conn = psycopg2.connect(DB_URL)
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
        
        curs = conn.cursor()
        curs.execute("LISTEN risk_event_updates;")
        print("Successfully connected and listening on channel: risk_event_updates")
        
        while True:
            if select.select([conn], [], [], 5) == ([], [], []):
                # Timeout - no notification received
                pass
            else:
                conn.poll()
                while conn.notifies:
                    notify = conn.notifies.pop(0)
                    print(f"Got NOTIFY: {notify.payload}")
                    
                    try:
                        import json
                        payload = json.loads(notify.payload)
                        event_id = payload.get('event_id')
                        shipment_id = payload.get('shipment_id')
                        risk_type = payload.get('risk_type')
                        severity = payload.get('severity')
                        
                        if event_id:
                            print(f"Processing Risk Event: {event_id}")
                            print(f"  Shipment: {shipment_id}")
                            print(f"  Risk Type: {risk_type}")
                            print(f"  Severity: {severity}")
                            
                            # Import and call the server's processing function
                            try:
                                from server import process_risk_event
                                result = process_risk_event(event_id)
                                print(f"Processing Result: {result}")
                            except ImportError as import_err:
                                print(f"Warning: Could not import process_risk_event function: {import_err}")
                                print("The server.py module needs a process_risk_event(event_id) function.")
                            except Exception as proc_err:
                                print(f"Error processing risk event: {proc_err}")
                                
                    except json.JSONDecodeError:
                        print("Failed to decode JSON payload")
                    except Exception as e:
                        print(f"Error handling notification: {e}")
                        
    except psycopg2.Error as db_err:
        print(f"Database connection error: {db_err}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nListener stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)
    finally:
        if 'conn' in locals() and conn:
            conn.close()
            print("Database connection closed")

if __name__ == "__main__":
    listen()
