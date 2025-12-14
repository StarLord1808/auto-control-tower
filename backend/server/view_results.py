import sys
import os
import json
from datetime import datetime

# Add flask-api to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../flask-api')))

from db.database import get_db
from db.models import RiskEvent, AgentDecision, MitigationAction

def format_json(data):
    return json.dumps(data, indent=2, default=str)

def view_results(limit=3):
    db = get_db()
    
    print("\n" + "="*80)
    print(f" LOGISTICS CONTROL TOWER - AI AGENT RESULTS (Last {limit} Processed Events)")
    print("="*80 + "\n")

    # Get analyzed events
    events = db.query(RiskEvent).filter(RiskEvent.status == 'mitigating').order_by(RiskEvent.detected_at.desc()).limit(limit).all()

    if not events:
        print("No analyzed events found. Run the agent first!")
        return

    for event in events:
        print(f"🔴 RISK EVENT: {event.event_id}")
        print(f"   - Type: {event.risk_type}")
        print(f"   - Status: {event.status} (Was: 'detected')")
        print(f"   - Description: {event.description}")
        print("-" * 40)

        # Get Decision
        decision = db.query(AgentDecision).filter(AgentDecision.event_id == event.event_id).first()
        if decision:
            print(f"🧠 AI DECISION (Reasoning):")
            print(f"   - Reasoning: {decision.reasoning}")
            print(f"   - Confidence: {decision.confidence_score}%")
        else:
            print(f"⚠️ No Decision Found")

        print("-" * 40)

        # Get Mitigations
        actions = db.query(MitigationAction).filter(MitigationAction.event_id == event.event_id).all()
        if actions:
            print(f"🛡️ PROPOSED MITIGATIONS ({len(actions)}):")
            for i, action in enumerate(actions, 1):
                print(f"   {i}. [{action.action_type.upper()}] {action.description}")
                print(f"      - Cost: ${action.estimated_cost_usd} | Time Saved: {action.estimated_time_saved_hours}h | Success Prob: {action.probability_success}%")
        else:
            print(f"⚠️ No Mitigations Proposed")
        
        print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    view_results()
