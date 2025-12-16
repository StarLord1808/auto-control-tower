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
from db.models import RiskEvent, AgentDecision, MitigationAction, Shipment, ShipmentChatView, TrafficData
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
                # --- PHASE 1: PREDICTIVE SCOUT ---
                # Retrieve traffic data (simulated check for now as we might have empty tables)
                # In a real scenario: traffic_data = db.query(TrafficData).filter(TrafficData.congestion_level == 'standstill').all()
                # For demo, we skip explicit traffic query and assume agent might predict based on mock data if we passed it.
                
                # --- PHASE 2: RISK ANALYSIS (Existing + Enhanced) ---
                detected_risks = db.query(RiskEvent).filter(RiskEvent.status == 'detected').all()
                
                if detected_risks:
                    logger.info(f"Found {len(detected_risks)} detected risks. Analyzing...")
                    
                    for event in detected_risks:
                        logger.info(f"Analyzing Event: {event.event_id} ({event.risk_type})")
                        
                        # Build Context
                        shipment = event.shipment
                        if not shipment:
                            continue
                            
                        context = {
                            "shipment_id": shipment.shipment_id,
                            "origin": shipment.origin_port_id,
                            "destination": shipment.destination_port_id,
                            "current_location": shipment.current_port_id,
                            "cargo_value": float(shipment.cargo_value_usd) if shipment.cargo_value_usd else 0,
                            "customer_name": shipment.customer_id
                        }
                        
                        # Get Traffic Context for current location
                        traffic_context = {}
                        if shipment.current_port_id:
                            traffic_record = db.query(TrafficData).filter(
                                TrafficData.route_segment_id == shipment.current_port_id
                            ).order_by(TrafficData.timestamp.desc()).first()
                            
                            if traffic_record:
                                traffic_context = {
                                    'congestion_level': traffic_record.congestion_level,
                                    'average_speed_kmh': float(traffic_record.average_speed_kmh) if traffic_record.average_speed_kmh else 0,
                                    'incident_count': traffic_record.incidents_count,
                                    'weather_condition': traffic_record.weather_condition
                                }

                        # A. Analyze Risk
                        analysis = agent.analyze_risk(
                            {"description": event.description, "risk_type": event.risk_type},
                            context,
                            traffic_context=traffic_context
                        )
                        
                        # Record Decision (Risk Assessment)
                        decision = AgentDecision(
                            decision_id=f"DEC_{str(uuid.uuid4())[:8]}",
                            shipment_id=shipment.shipment_id,
                            event_id=event.event_id,
                            agent_name="risk_detection",
                            decision_type="risk_assessment",
                            reasoning=analysis.get("reasoning", "No reasoning provided"),
                            confidence_score=analysis.get("confidence_score", 0),
                            created_at=datetime.utcnow()
                        )
                        db.add(decision)
                        
                        # B. Propose Mitigations
                        mitigations = agent.propose_mitigation(
                            {"description": event.description, "delay_hours": event.delay_hours},
                            context
                        )
                        
                        for mit_opt in mitigations:
                            action = MitigationAction(
                                action_id=f"ACT_{str(uuid.uuid4())[:8]}",
                                event_id=event.event_id,
                                shipment_id=shipment.shipment_id,
                                action_type=mit_opt.get("action_type", "other"),
                                description=mit_opt.get("description"),
                                estimated_cost_usd=mit_opt.get("estimated_cost", 0),
                                estimated_time_saved_hours=mit_opt.get("estimated_time_saved", 0),
                                probability_success=mit_opt.get("probability", 0),
                                status="proposed",
                                proposed_at=datetime.utcnow(),
                                proposed_by="mitigation_planner"
                            )
                            db.add(action)
                            db.flush() # Ensure action_id is available
                            
                            # --- PHASE 3: OPTIMIZATION STRATEGIST ---
                            # Check if mitigation is expensive (> $1000)
                            if action.estimated_cost_usd and action.estimated_cost_usd > 1000:
                                logger.info(f"Triggering Optimization Agent for Action {action.action_id} (Cost: ${action.estimated_cost_usd})")
                                optimized = agent.optimize_mitigation(mit_opt, context)
                                
                                if optimized:
                                    from db.models import AlternativeRoute
                                    alt_route = AlternativeRoute(
                                        route_id=f"ALT_{str(uuid.uuid4())[:8]}",
                                        action_id=action.action_id,
                                        shipment_id=shipment.shipment_id,
                                        score=optimized.get("score", 0),
                                        estimated_cost_usd=optimized.get("estimated_cost_usd"),
                                        estimated_duration_hours=optimized.get("estimated_duration_hours"),
                                        route_ports=json.dumps({"description": optimized.get("route_description")})
                                    )
                                    db.add(alt_route)
                                    logger.info(f"Optimization Agent found alternative: {optimized.get('route_description')}")

                        # --- PHASE 4: COMMUNICATION DIPLOMAT ---
                        # Draft communication for the customer
                        logger.info(f"Triggering Communication Agent for Customer {shipment.customer_id}")
                        comm_draft = agent.draft_communication(
                            decision_summary=f"Analyzed risk {event.risk_type} and proposed {len(mitigations)} mitigations.",
                            recipient_context={"name": shipment.customer_id, "type": "customer"}
                        )
                        
                        if comm_draft:
                            from db.models import StakeholderCommunication
                            comm = StakeholderCommunication(
                                communication_id=f"COM_{str(uuid.uuid4())[:8]}",
                                shipment_id=shipment.shipment_id,
                                event_id=event.event_id,
                                recipient_type="customer",
                                recipient_id=shipment.customer_id,
                                channel="email",
                                subject=comm_draft.get("subject"),
                                message=comm_draft.get("message_body"),
                                status="draft"
                            )
                            db.add(comm)
                            logger.info(f"Communication Agent drafted email: {comm_draft.get('subject')}")

                        # Update Event Status
                        event.status = 'mitigating'
                        event.agent_notes = analysis.get("analysis_summary", "Analyzed by AI")

                        # --- PHASE 5: UPDATE DASHBOARD VIEW (ShipmentChatView) ---
                        chat_view = db.query(ShipmentChatView).filter(ShipmentChatView.shipment_id == shipment.shipment_id).first()
                        if not chat_view:
                            chat_view = ShipmentChatView(
                                shipment_id=shipment.shipment_id,
                                origin_location_code=shipment.origin_port_id,
                                destination_location_code=shipment.destination_port_id,
                                mode="SEA",  # Defaulting to SEA for now, or derive from shipment
                                carrier=shipment.current_carrier_id,
                                shipment_value=shipment.cargo_value_usd,
                                priority=shipment.priority
                            )
                            db.add(chat_view)

                        # Update Risk Metrics
                        severity_map = {'low': 25, 'medium': 50, 'high': 75, 'critical': 100}
                        chat_view.risk_type = event.risk_type
                        chat_view.risk_probability = analysis.get("confidence_score")
                        chat_view.risk_severity = severity_map.get(event.severity, 0)
                        chat_view.risk_explanation = analysis.get("analysis_summary")
                        chat_view.risk_status = "OPEN"
                        
                        # Update Mitigation Metrics
                        if mitigations:
                            best_mitigation = mitigations[0]
                            chat_view.recommended_action = best_mitigation.get("action_type")
                            chat_view.recommendation_source = "AI"
                            chat_view.estimated_delay_reduction_hours = best_mitigation.get("estimated_time_saved")
                            chat_view.estimated_extra_cost = best_mitigation.get("estimated_cost")
                        
                        chat_view.last_updated_at = datetime.utcnow()
                        logger.info(f"Updated ShipmentChatView for {shipment.shipment_id}")
                
                else:
                    logger.info("No detected risks found. Scanning for predictive patterns...")
                    # Simulating predictive scan occasionally
                    # In a real loop, we would query traffic data here
                    pass
                
            # Sleep between batches
            time.sleep(5)
            
        except Exception as e:
            logger.error(f"Error in agent loop: {e}")
            time.sleep(10)

if __name__ == "__main__":
    run_agent_loop()