import sys
import os
import time
import logging
import uuid
import json
from datetime import datetime
from dotenv import load_dotenv

# Explicitly load environment from flask-api directory
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../flask-api/.env'))
load_dotenv(env_path)

# Add flask-api to path to reuse models and db connection
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../flask-api')))

from db.database import get_db_context
from db.models import RiskEvent, AgentDecision, MitigationAction, Shipment
from intelligence_layer import IntelligenceLayer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_agent_loop():
    logger.info("Starting AI Agent loop...")
    
    # Initialize Intelligence Layer
    agent = IntelligenceLayer()
    
    while True:
        try:
            with get_db_context() as db:
                # 1. Find detected risks
                detected_risks = db.query(RiskEvent).filter(RiskEvent.status == 'detected').all()
                
                if not detected_risks:
                    logger.info("No new risks detected. Sleeping...")
                    time.sleep(10)
                    continue
                    
                logger.info(f"Found {len(detected_risks)} detected risks. Analyzing...")
                
                for event in detected_risks:
                    logger.info(f"Analyzing Event: {event.event_id} ({event.risk_type})")
                    
                    # 2. Build Context
                    shipment = event.shipment
                    if not shipment:
                        logger.warning(f"Event {event.event_id} has no associated shipment. Skipping.")
                        continue
                        
                    context = {
                        "shipment_id": shipment.shipment_id,
                        "origin": shipment.origin_port_id, # Simplified, assumes port ID is meaningful or needs lookup
                        "destination": shipment.destination_port_id,
                        "current_location": shipment.current_port_id,
                        "cargo_value": float(shipment.cargo_value_usd) if shipment.cargo_value_usd else 0,
                        "customer_name": shipment.customer_id
                    }
                    
                    # 3. Analyze Risk
                    analysis = agent.analyze_risk(
                        {"description": event.description, "risk_type": event.risk_type},
                        context
                    )
                    
                    # 4. Record Decision
                    decision_id = f"DEC_{str(uuid.uuid4())[:8]}"
                    decision = AgentDecision(
                        decision_id=decision_id,
                        shipment_id=shipment.shipment_id,
                        event_id=event.event_id,
                        agent_name="risk_analyzer",
                        decision_type="risk_assessment",
                        reasoning=analysis.get("reasoning", "No reasoning provided"),
                        confidence_score=analysis.get("confidence_score", 0),
                        execution_time_ms=500, # Simulated
                        created_at=datetime.utcnow()
                    )
                    db.add(decision)
                    
                    # 5. Propose Mitigations
                    mitigations = agent.propose_mitigation(
                        {"description": event.description, "delay_hours": event.delay_hours},
                        context
                    )
                    
                    for mit_opt in mitigations:
                        action_id = f"ACT_{str(uuid.uuid4())[:8]}"
                        action = MitigationAction(
                            action_id=action_id,
                            event_id=event.event_id,
                            shipment_id=shipment.shipment_id,
                            action_type=mit_opt.get("action_type", "other"),
                            description=mit_opt.get("description"),
                            estimated_cost_usd=mit_opt.get("estimated_cost", 0),
                            estimated_time_saved_hours=mit_opt.get("estimated_time_saved", 0),
                            probability_success=mit_opt.get("probability", 0),
                            status="proposed",
                            proposed_at=datetime.utcnow(),
                            proposed_by="AI_Agent"
                        )
                        db.add(action)
                    
                    # 6. Update Event Status
                    event.status = 'mitigating'
                    event.agent_notes = analysis.get("analysis_summary", "Analyzed by AI")
                    
                    logger.info(f"Event {event.event_id} analyzed. {len(mitigations)} mitigations proposed.")
                
            # Sleep between batches
            time.sleep(5)
            
        except Exception as e:
            logger.error(f"Error in agent loop: {e}")
            time.sleep(10)

if __name__ == "__main__":
    run_agent_loop()
