"""
Service layer for business logic and database operations
"""
from sqlalchemy import func, and_, or_, desc
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import logging

from db.database import get_db_context
from db.models import (
    Shipment, RiskEvent, AgentDecision, MitigationAction, AlternativeRoute,
    StakeholderCommunication, OperationalMetric, Customer, Carrier, Port,
    ERPOrder, TrafficData, PortCongestion, WMSInventory
)

logger = logging.getLogger(__name__)


# Shipment Services
def get_all_shipments(status: Optional[str] = None, limit: int = 100, offset: int = 0):
    """Get all shipments with optional status filter"""
    with get_db_context() as db:
        query = db.query(Shipment)
        if status:
            query = query.filter(Shipment.status == status)
        return query.order_by(desc(Shipment.created_at)).limit(limit).offset(offset).all()


def get_shipment_by_id(shipment_id: str):
    """Get shipment by ID with all related data"""
    with get_db_context() as db:
        return db.query(Shipment).filter(Shipment.shipment_id == shipment_id).first()


def get_at_risk_shipments():
    """Get all shipments currently at risk"""
    with get_db_context() as db:
        return db.query(Shipment).filter(
            or_(Shipment.status == 'at_risk', Shipment.status == 'delayed')
        ).all()


def update_shipment_status(shipment_id: str, status: str):
    """Update shipment status"""
    with get_db_context() as db:
        shipment = db.query(Shipment).filter(Shipment.shipment_id == shipment_id).first()
        if shipment:
            shipment.status = status
            shipment.updated_at = datetime.utcnow()
            return shipment
        return None


# Risk Event Services
def get_all_risk_events(severity: Optional[str] = None, status: Optional[str] = None, limit: int = 100):
    """Get all risk events with optional filters"""
    with get_db_context() as db:
        query = db.query(RiskEvent)
        if severity:
            query = query.filter(RiskEvent.severity == severity)
        if status:
            query = query.filter(RiskEvent.status == status)
        return query.order_by(desc(RiskEvent.detected_at)).limit(limit).all()


def get_risk_events_by_shipment(shipment_id: str):
    """Get all risk events for a specific shipment"""
    with get_db_context() as db:
        return db.query(RiskEvent).filter(RiskEvent.shipment_id == shipment_id).all()


def create_risk_event(event_data: Dict[str, Any]):
    """Create a new risk event"""
    with get_db_context() as db:
        risk_event = RiskEvent(**event_data)
        db.add(risk_event)
        return risk_event


# Agent Decision Services
def get_agent_decisions(agent_name: Optional[str] = None, limit: int = 100):
    """Get agent decisions with optional agent filter"""
    with get_db_context() as db:
        query = db.query(AgentDecision)
        if agent_name:
            query = query.filter(AgentDecision.agent_name == agent_name)
        return query.order_by(desc(AgentDecision.created_at)).limit(limit).all()


def get_decisions_by_shipment(shipment_id: str):
    """Get all agent decisions for a specific shipment"""
    with get_db_context() as db:
        return db.query(AgentDecision).filter(AgentDecision.shipment_id == shipment_id).all()


def create_agent_decision(decision_data: Dict[str, Any]):
    """Create a new agent decision"""
    with get_db_context() as db:
        decision = AgentDecision(**decision_data)
        db.add(decision)
        return decision


# Mitigation Action Services
def get_mitigation_actions(status: Optional[str] = None, limit: int = 100):
    """Get mitigation actions with optional status filter"""
    with get_db_context() as db:
        query = db.query(MitigationAction)
        if status:
            query = query.filter(MitigationAction.status == status)
        return query.order_by(desc(MitigationAction.proposed_at)).limit(limit).all()


def get_actions_by_event(event_id: str):
    """Get all mitigation actions for a specific risk event"""
    with get_db_context() as db:
        return db.query(MitigationAction).filter(MitigationAction.event_id == event_id).all()


def create_mitigation_action(action_data: Dict[str, Any]):
    """Create a new mitigation action"""
    with get_db_context() as db:
        action = MitigationAction(**action_data)
        db.add(action)
        return action


def update_action_status(action_id: str, status: str, execution_result: Optional[str] = None):
    """Update mitigation action status"""
    with get_db_context() as db:
        action = db.query(MitigationAction).filter(MitigationAction.action_id == action_id).first()
        if action:
            action.status = status
            if status == 'executing':
                action.executed_at = datetime.utcnow()
            elif status in ['completed', 'failed']:
                action.completed_at = datetime.utcnow()
            if execution_result:
                action.execution_result = execution_result
            return action
        return None


# Alternative Route Services
def get_alternative_routes(shipment_id: str):
    """Get alternative routes for a shipment"""
    with get_db_context() as db:
        return db.query(AlternativeRoute).filter(
            AlternativeRoute.shipment_id == shipment_id
        ).order_by(desc(AlternativeRoute.score)).all()


def create_alternative_route(route_data: Dict[str, Any]):
    """Create a new alternative route"""
    with get_db_context() as db:
        route = AlternativeRoute(**route_data)
        db.add(route)
        return route


# Stakeholder Communication Services
def get_communications(shipment_id: Optional[str] = None, limit: int = 100):
    """Get stakeholder communications"""
    with get_db_context() as db:
        query = db.query(StakeholderCommunication)
        if shipment_id:
            query = query.filter(StakeholderCommunication.shipment_id == shipment_id)
        return query.order_by(desc(StakeholderCommunication.sent_at)).limit(limit).all()


def create_communication(comm_data: Dict[str, Any]):
    """Create a new stakeholder communication"""
    with get_db_context() as db:
        communication = StakeholderCommunication(**comm_data)
        db.add(communication)
        return communication


# Operational Metrics Services
def get_operational_metrics(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get operational metrics within date range"""
    with get_db_context() as db:
        query = db.query(OperationalMetric)
        if start_date:
            query = query.filter(OperationalMetric.metric_date >= start_date)
        if end_date:
            query = query.filter(OperationalMetric.metric_date <= end_date)
        return query.order_by(desc(OperationalMetric.metric_date)).all()


def get_latest_metrics():
    """Get the most recent operational metrics"""
    with get_db_context() as db:
        return db.query(OperationalMetric).order_by(
            desc(OperationalMetric.metric_date)
        ).first()


# Dashboard Statistics
def get_dashboard_stats():
    """Get current dashboard statistics"""
    with get_db_context() as db:
        total_shipments = db.query(func.count(Shipment.shipment_id)).scalar()
        in_transit = db.query(func.count(Shipment.shipment_id)).filter(
            Shipment.status == 'in_transit'
        ).scalar()
        at_risk = db.query(func.count(Shipment.shipment_id)).filter(
            Shipment.status == 'at_risk'
        ).scalar()
        delayed = db.query(func.count(Shipment.shipment_id)).filter(
            Shipment.status == 'delayed'
        ).scalar()
        
        active_risks = db.query(func.count(RiskEvent.event_id)).filter(
            RiskEvent.status.in_(['detected', 'analyzing', 'mitigating'])
        ).scalar()
        
        pending_actions = db.query(func.count(MitigationAction.action_id)).filter(
            MitigationAction.status.in_(['proposed', 'approved'])
        ).scalar()
        
        return {
            'total_shipments': total_shipments,
            'in_transit': in_transit,
            'at_risk': at_risk,
            'delayed': delayed,
            'active_risks': active_risks,
            'pending_actions': pending_actions
        }


# Port and Traffic Services
def get_port_congestion(port_id: Optional[str] = None):
    """Get current port congestion data"""
    with get_db_context() as db:
        query = db.query(PortCongestion)
        if port_id:
            query = query.filter(PortCongestion.port_id == port_id)
        return query.order_by(desc(PortCongestion.timestamp)).limit(10).all()


def get_high_congestion_ports():
    """Get ports with high or critical congestion"""
    with get_db_context() as db:
        # Get the latest congestion record for each port
        subquery = db.query(
            PortCongestion.port_id,
            func.max(PortCongestion.timestamp).label('max_timestamp')
        ).group_by(PortCongestion.port_id).subquery()
        
        return db.query(PortCongestion).join(
            subquery,
            and_(
                PortCongestion.port_id == subquery.c.port_id,
                PortCongestion.timestamp == subquery.c.max_timestamp
            )
        ).filter(
            PortCongestion.congestion_level.in_(['high', 'critical'])
        ).all()


# Enhanced Dashboard Services
def get_dashboard_summary():
    """Get enhanced dashboard summary with metrics for the control tower"""
    with get_db_context() as db:
        # Total shipments
        total_shipments = db.query(func.count(Shipment.shipment_id)).scalar() or 0
        
        # On-time shipments (delivered on time)
        delivered = db.query(Shipment).filter(Shipment.status == 'delivered').all()
        on_time_count = sum(1 for s in delivered if s.actual_arrival and s.estimated_arrival and s.actual_arrival <= s.estimated_arrival)
        on_time_rate = (on_time_count / len(delivered) * 100) if delivered else 0
        
        # Exceptions (at_risk + delayed)
        exceptions = db.query(func.count(Shipment.shipment_id)).filter(
            Shipment.status.in_(['at_risk', 'delayed'])
        ).scalar() or 0
        
        # Average transit time (in days)
        completed_shipments = db.query(Shipment).filter(
            Shipment.status == 'delivered',
            Shipment.actual_departure.isnot(None),
            Shipment.actual_arrival.isnot(None)
        ).all()
        
        if completed_shipments:
            total_days = sum((s.actual_arrival - s.actual_departure).days for s in completed_shipments)
            avg_transit_days = total_days / len(completed_shipments)
        else:
            avg_transit_days = 0
        
        # Active shipments by status
        in_transit = db.query(func.count(Shipment.shipment_id)).filter(Shipment.status == 'in_transit').scalar() or 0
        at_port = db.query(func.count(Shipment.shipment_id)).filter(Shipment.status == 'at_port').scalar() or 0
        customs = db.query(func.count(Shipment.shipment_id)).filter(Shipment.status == 'customs').scalar() or 0
        
        return {
            'total_active_shipments': total_shipments,
            'on_time_rate': round(on_time_rate, 1),
            'exceptions': exceptions,
            'avg_transit_time_days': round(avg_transit_days, 1),
            'status_breakdown': {
                'in_transit': in_transit,
                'at_port': at_port,
                'customs': customs,
                'at_risk': db.query(func.count(Shipment.shipment_id)).filter(Shipment.status == 'at_risk').scalar() or 0,
                'delayed': db.query(func.count(Shipment.shipment_id)).filter(Shipment.status == 'delayed').scalar() or 0
            }
        }


def get_recent_alerts(limit: int = 10):
    """Get recent risk events for the alerts panel"""
    with get_db_context() as db:
        events = db.query(RiskEvent).filter(
            RiskEvent.status.in_(['detected', 'analyzing', 'mitigating'])
        ).order_by(desc(RiskEvent.detected_at)).limit(limit).all()
        
        alerts = []
        for event in events:
            shipment = event.shipment
            alerts.append({
                'event_id': event.event_id,
                'shipment_id': event.shipment_id,
                'risk_type': event.risk_type,
                'severity': event.severity,
                'description': event.description,
                'detected_at': event.detected_at.isoformat() if event.detected_at else None,
                'delay_hours': event.delay_hours,
                'status': event.status,
                'shipment_origin': shipment.origin_port_id if shipment else None,
                'shipment_destination': shipment.destination_port_id if shipment else None
            })
        
        return alerts


def get_carrier_performance():
    """Get carrier performance metrics"""
    with get_db_context() as db:
        carriers = db.query(Carrier).filter(Carrier.active == True).all()
        
        performance = []
        for carrier in carriers:
            shipment_count = db.query(func.count(Shipment.shipment_id)).filter(
                Shipment.current_carrier_id == carrier.carrier_id
            ).scalar() or 0
            
            performance.append({
                'carrier_id': carrier.carrier_id,
                'name': carrier.name,
                'type': carrier.type,
                'reliability_score': float(carrier.reliability_score) if carrier.reliability_score else 0,
                'avg_delay_hours': carrier.avg_delay_hours or 0,
                'shipment_count': shipment_count
            })
        
        return sorted(performance, key=lambda x: x['reliability_score'], reverse=True)


def process_chat_query(message: str, user_context: Dict[str, Any]):
    """Process chat bot queries and return intelligent responses"""
    message_lower = message.lower()
    
    with get_db_context() as db:
        # Query: Show delayed shipments
        if 'delayed' in message_lower or 'delay' in message_lower:
            delayed_shipments = db.query(Shipment).filter(Shipment.status == 'delayed').limit(5).all()
            if delayed_shipments:
                response = f"Found {len(delayed_shipments)} delayed shipments:\n"
                for s in delayed_shipments:
                    response += f"- {s.shipment_id}: {s.origin_port_id} → {s.destination_port_id}\n"
            else:
                response = "No delayed shipments at the moment."
            return {'response': response, 'type': 'shipment_list'}
        
        # Query: Show risks or active risks
        elif 'risk' in message_lower and ('active' in message_lower or 'show' in message_lower):
            active_risks = db.query(RiskEvent).filter(
                RiskEvent.status.in_(['detected', 'analyzing', 'mitigating'])
            ).limit(5).all()
            if active_risks:
                response = f"Found {len(active_risks)} active risk events:\n"
                for r in active_risks:
                    response += f"- {r.event_id}: {r.risk_type} ({r.severity}) - {r.description[:50]}...\n"
            else:
                response = "No active risks detected."
            return {'response': response, 'type': 'risk_list'}
        
        # Query: Shipment status by ID
        elif 'shipment' in message_lower and any(char.isdigit() for char in message):
            # Extract shipment ID from message
            words = message.split()
            shipment_id = next((w for w in words if 'SHP' in w.upper() or w.isdigit()), None)
            if shipment_id:
                shipment = db.query(Shipment).filter(Shipment.shipment_id.ilike(f'%{shipment_id}%')).first()
                if shipment:
                    response = f"Shipment {shipment.shipment_id}:\n"
                    response += f"Status: {shipment.status}\n"
                    response += f"Route: {shipment.origin_port_id} → {shipment.destination_port_id}\n"
                    response += f"ETA: {shipment.estimated_arrival.strftime('%Y-%m-%d %H:%M') if shipment.estimated_arrival else 'N/A'}\n"
                else:
                    response = f"Shipment {shipment_id} not found."
            else:
                response = "Please provide a valid shipment ID."
            return {'response': response, 'type': 'shipment_detail'}
        
        # Query: Dashboard stats or summary
        elif 'dashboard' in message_lower or 'summary' in message_lower or 'stats' in message_lower:
            stats = get_dashboard_summary()
            response = f"Dashboard Summary:\n"
            response += f"Total Shipments: {stats['total_active_shipments']}\n"
            response += f"On-Time Rate: {stats['on_time_rate']}%\n"
            response += f"Exceptions: {stats['exceptions']}\n"
            response += f"Avg Transit Time: {stats['avg_transit_time_days']} days\n"
            return {'response': response, 'type': 'dashboard_stats'}
        
        # Default response
        else:
            response = "I can help you with:\n"
            response += "- Show delayed shipments\n"
            response += "- Show active risks\n"
            response += "- Get shipment status (provide shipment ID)\n"
            response += "- Dashboard summary\n"
            return {'response': response, 'type': 'help'}