"""
Flask API Application for Autonomous Control Tower
Main application with API endpoints
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import logging

from backend.shared.constants import FLASK_HOST, FLASK_PORT, FLASK_DEBUG, CORS_ORIGINS
from backend.shared.db.database import init_db, close_db, get_db_context
from backend.shared.db.models import (
    Shipment, RiskEvent, AgentDecision, MitigationAction,
    AlternativeRoute, StakeholderCommunication, OperationalMetric,
    ShipmentChatView
)
import backend.api.service as service
import backend.api.auth as auth
import backend.api.service_feedback as service_feedback

# Import learning engine and health checks
import backend.agent.learning_engine as learning_engine
import backend.agent.llm_health as llm_health

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=CORS_ORIGINS)


@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'message': 'Welcome to the Autonomous Control Tower API',
        'status': 'running',
        'documentation': {
            'health_check': '/api/health',
            'dashboard': '/api/dashboard/stats',
            'shipments': '/api/shipments',
            'risk_events': '/api/risk-events'
        },
        'version': '1.0.0'
    }), 200


# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found', 'message': str(error)}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal error: {str(error)}")
    return jsonify({'error': 'Internal server error', 'message': str(error)}), 500


@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request', 'message': str(error)}), 400


# Helper function to serialize SQLAlchemy objects
def serialize(obj):
    """Convert SQLAlchemy object to dictionary"""
    if obj is None:
        return None
    
    result = {}
    for column in obj.__table__.columns:
        value = getattr(obj, column.name)
        if isinstance(value, datetime):
            result[column.name] = value.isoformat()
        else:
            result[column.name] = value
    return result


from sqlalchemy import text

# ... (imports)

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        with get_db_context() as db:
            db.execute(text('SELECT 1'))
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected'
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }), 500


# Authentication endpoints
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'viewer')
        
        if not username or not email or not password:
            return jsonify({'error': 'Username, email, and password are required'}), 400
        
        user, error = auth.register_user(username, email, password, role)
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': user.user_id,
            'username': user.username
        }), 201
    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user and return JWT token"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        result, error = auth.login_user(username, password)
        if error:
            return jsonify({'error': error}), 401
        
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error logging in: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/me', methods=['GET'])
@auth.require_auth
def get_me():
    """Get current user information"""
    try:
        user_data = auth.get_current_user(request.user['user_id'])
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(user_data), 200
    except Exception as e:
        logger.error(f"Error getting user info: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Dashboard endpoints
@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics (legacy endpoint)"""
    try:
        stats = service.get_dashboard_stats()
        return jsonify(stats), 200
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/dashboard/summary', methods=['GET'])
@auth.require_auth
def get_dashboard_summary():
    """Get enhanced dashboard summary"""
    try:
        summary = service.get_dashboard_summary()
        return jsonify(summary), 200
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/alerts/recent', methods=['GET'])
@auth.require_auth
def get_recent_alerts():
    """Get recent alerts for the alerts panel"""
    try:
        limit = int(request.args.get('limit', 10))
        alerts = service.get_recent_alerts(limit=limit)
        return jsonify(alerts), 200
    except Exception as e:
        logger.error(f"Error getting recent alerts: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/carriers/performance', methods=['GET'])
@auth.require_auth
def get_carrier_performance():
    """Get carrier performance metrics"""
    try:
        performance = service.get_carrier_performance()
        return jsonify(performance), 200
    except Exception as e:
        logger.error(f"Error getting carrier performance: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Chat bot endpoint
@app.route('/api/chat/query', methods=['POST'])
@auth.require_auth
def chat_query():
    """Process chat bot query"""
    try:
        data = request.get_json()
        message = data.get('message')
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        user_context = {
            'user_id': request.user['user_id'],
            'username': request.user['username'],
            'role': request.user['role']
        }
        
        response = service.process_chat_query(message, user_context)
        return jsonify(response), 200
    except Exception as e:
        logger.error(f"Error processing chat query: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Enhancement: Shipment Chat View Endpoint
@app.route('/api/shipments/chat-view', methods=['GET'])
def get_shipment_chat_view_endpoint():
    """Get summarized shipment data for the dashboard"""
    try:
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        data = service.get_shipment_chat_view(limit=limit, offset=offset)
        return jsonify([serialize(item) for item in data]), 200
    except Exception as e:
        logger.error(f"Error getting shipment chat view: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Shipment endpoints
@app.route('/api/shipments', methods=['GET'])
def get_shipments():
    """Get all shipments with optional filters"""
    try:
        status = request.args.get('status')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        shipments = service.get_all_shipments(status=status, limit=limit, offset=offset)
        return jsonify([serialize(s) for s in shipments]), 200
    except Exception as e:
        logger.error(f"Error getting shipments: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/shipments/<shipment_id>', methods=['GET'])
def get_shipment(shipment_id):
    """Get shipment by ID"""
    try:
        shipment = service.get_shipment_by_id(shipment_id)
        if not shipment:
            return jsonify({'error': 'Shipment not found'}), 404
        return jsonify(serialize(shipment)), 200
    except Exception as e:
        logger.error(f"Error getting shipment: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/shipments/at-risk', methods=['GET'])
def get_at_risk_shipments():
    """Get all at-risk shipments"""
    try:
        shipments = service.get_at_risk_shipments()
        return jsonify([serialize(s) for s in shipments]), 200
    except Exception as e:
        logger.error(f"Error getting at-risk shipments: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/shipments/<shipment_id>/status', methods=['PUT'])
def update_shipment_status(shipment_id):
    """Update shipment status"""
    try:
        data = request.get_json()
        status = data.get('status')
        if not status:
            return jsonify({'error': 'Status is required'}), 400
        
        shipment = service.update_shipment_status(shipment_id, status)
        if not shipment:
            return jsonify({'error': 'Shipment not found'}), 404
        
        return jsonify(serialize(shipment)), 200
    except Exception as e:
        logger.error(f"Error updating shipment status: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Risk Event endpoints
@app.route('/api/risk-events', methods=['GET'])
def get_risk_events():
    """Get all risk events with optional filters"""
    try:
        severity = request.args.get('severity')
        status = request.args.get('status')
        limit = int(request.args.get('limit', 100))
        
        events = service.get_all_risk_events(severity=severity, status=status, limit=limit)
        return jsonify([serialize(e) for e in events]), 200
    except Exception as e:
        logger.error(f"Error getting risk events: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/risk-events', methods=['POST'])
def create_risk_event():
    """Create a new risk event"""
    try:
        data = request.get_json()
        event = service.create_risk_event(data)
        return jsonify(serialize(event)), 201
    except Exception as e:
        logger.error(f"Error creating risk event: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/shipments/<shipment_id>/risk-events', methods=['GET'])
def get_shipment_risk_events(shipment_id):
    """Get risk events for a specific shipment"""
    try:
        events = service.get_risk_events_by_shipment(shipment_id)
        return jsonify([serialize(e) for e in events]), 200
    except Exception as e:
        logger.error(f"Error getting shipment risk events: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/risk-events/process', methods=['POST'])
def process_risk_event_endpoint():
    """Process a risk event with the AI agent (triggered by listener)"""
    try:
        data = request.get_json()
        event_id = data.get('event_id')
        
        if not event_id:
            return jsonify({'error': 'event_id is required'}), 400
        
        # Import the agent processing function
        from backend.agent.server import process_risk_event
        
        result = process_risk_event(event_id)
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify(result), 200
    except ImportError as ie:
        logger.error(f"Error importing process_risk_event: {str(ie)}")
        return jsonify({'error': 'Server module not available'}), 500
    except Exception as e:
        logger.error(f"Error processing risk event: {str(e)}")
        return jsonify({'error': str(e)}), 500



# Agent Decision endpoints
@app.route('/api/agent-decisions', methods=['GET'])
def get_agent_decisions():
    """Get agent decisions with optional filters"""
    try:
        agent_name = request.args.get('agent_name')
        limit = int(request.args.get('limit', 100))
        
        decisions = service.get_agent_decisions(agent_name=agent_name, limit=limit)
        return jsonify([serialize(d) for d in decisions]), 200
    except Exception as e:
        logger.error(f"Error getting agent decisions: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/agent-decisions', methods=['POST'])
def create_agent_decision():
    """Create a new agent decision"""
    try:
        data = request.get_json()
        decision = service.create_agent_decision(data)
        return jsonify(serialize(decision)), 201
    except Exception as e:
        logger.error(f"Error creating agent decision: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/shipments/<shipment_id>/decisions', methods=['GET'])
def get_shipment_decisions(shipment_id):
    """Get agent decisions for a specific shipment"""
    try:
        decisions = service.get_decisions_by_shipment(shipment_id)
        return jsonify([serialize(d) for d in decisions]), 200
    except Exception as e:
        logger.error(f"Error getting shipment decisions: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Mitigation Action endpoints
@app.route('/api/mitigation-actions', methods=['GET'])
def get_mitigation_actions():
    """Get mitigation actions with optional filters"""
    try:
        status = request.args.get('status')
        limit = int(request.args.get('limit', 100))
        
        actions = service.get_mitigation_actions(status=status, limit=limit)
        return jsonify([serialize(a) for a in actions]), 200
    except Exception as e:
        logger.error(f"Error getting mitigation actions: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/mitigation-actions', methods=['POST'])
def create_mitigation_action():
    """Create a new mitigation action"""
    try:
        data = request.get_json()
        action = service.create_mitigation_action(data)
        return jsonify(serialize(action)), 201
    except Exception as e:
        logger.error(f"Error creating mitigation action: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/mitigation-actions/<action_id>/status', methods=['PUT'])
def update_mitigation_action_status(action_id):
    """Update mitigation action status"""
    try:
        data = request.get_json()
        status = data.get('status')
        execution_result = data.get('execution_result')
        
        if not status:
            return jsonify({'error': 'Status is required'}), 400
        
        action = service.update_action_status(action_id, status, execution_result)
        if not action:
            return jsonify({'error': 'Action not found'}), 404
        
        return jsonify(serialize(action)), 200
    except Exception as e:
        logger.error(f"Error updating action status: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/risk-events/<event_id>/actions', methods=['GET'])
def get_event_actions(event_id):
    """Get mitigation actions for a specific risk event"""
    try:
        actions = service.get_actions_by_event(event_id)
        return jsonify([serialize(a) for a in actions]), 200
    except Exception as e:
        logger.error(f"Error getting event actions: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Alternative Route endpoints
@app.route('/api/shipments/<shipment_id>/alternative-routes', methods=['GET'])
def get_shipment_alternative_routes(shipment_id):
    """Get alternative routes for a shipment"""
    try:
        routes = service.get_alternative_routes(shipment_id)
        return jsonify([serialize(r) for r in routes]), 200
    except Exception as e:
        logger.error(f"Error getting alternative routes: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/alternative-routes', methods=['POST'])
def create_alternative_route():
    """Create a new alternative route"""
    try:
        data = request.get_json()
        route = service.create_alternative_route(data)
        return jsonify(serialize(route)), 201
    except Exception as e:
        logger.error(f"Error creating alternative route: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Stakeholder Communication endpoints
@app.route('/api/communications', methods=['GET'])
def get_communications():
    """Get stakeholder communications"""
    try:
        shipment_id = request.args.get('shipment_id')
        limit = int(request.args.get('limit', 100))
        
        communications = service.get_communications(shipment_id=shipment_id, limit=limit)
        return jsonify([serialize(c) for c in communications]), 200
    except Exception as e:
        logger.error(f"Error getting communications: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/communications', methods=['POST'])
def create_communication():
    """Create a new stakeholder communication"""
    try:
        data = request.get_json()
        communication = service.create_communication(data)
        return jsonify(serialize(communication)), 201
    except Exception as e:
        logger.error(f"Error creating communication: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Operational Metrics endpoints
@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    """Get operational metrics with optional date range"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        metrics = service.get_operational_metrics(start_date=start_date, end_date=end_date)
        return jsonify([serialize(m) for m in metrics]), 200
    except Exception as e:
        logger.error(f"Error getting metrics: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/metrics/latest', methods=['GET'])
def get_latest_operational_metrics():
    """Get the latest operational metrics"""
    try:
        metrics = service.get_latest_metrics()
        return jsonify(serialize(metrics)), 200
    except Exception as e:
        logger.error(f"Error getting latest metrics: {str(e)}")
        return jsonify({'error': str(e)}), 500



# Port Congestion endpoints
@app.route('/api/port-congestion', methods=['GET'])
def get_port_congestion():
    """Get port congestion data"""
    try:
        port_id = request.args.get('port_id')
        congestion = service.get_port_congestion(port_id=port_id)
        return jsonify([serialize(c) for c in congestion]), 200
    except Exception as e:
        logger.error(f"Error getting port congestion: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/port-congestion/high', methods=['GET'])
def get_high_congestion_ports():
    """Get ports with high or critical congestion"""
    try:
        ports = service.get_high_congestion_ports()
        return jsonify([serialize(p) for p in ports]), 200
    except Exception as e:
        logger.error(f"Error getting high congestion ports: {str(e)}")
        return jsonify({'error': str(e)}), 500


# --- Enhancement 1 & 2: Feedback and Learning Endpoints ---

@app.route('/api/mitigation-actions/<action_id>/approve', methods=['POST'])
@auth.require_auth
def approve_mitigation_endpoint(action_id):
    """Approve a mitigation action"""
    try:
        data = request.get_json() or {}
        feedback = data.get('feedback')
        rating = data.get('rating')
        user_id = request.user['user_id']
        
        action, error = service_feedback.approve_mitigation(action_id, user_id, feedback, rating)
        if error:
            return jsonify({'error': error}), 400
            
        return jsonify(serialize(action)), 200
    except Exception as e:
        logger.error(f"Error approving mitigation: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/mitigation-actions/<action_id>/reject', methods=['POST'])
@auth.require_auth
def reject_mitigation_endpoint(action_id):
    """Reject a mitigation action"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason')
        user_id = request.user['user_id']
        
        if not reason:
            return jsonify({'error': 'Rejection reason is required'}), 400
            
        action, error = service_feedback.reject_mitigation(action_id, user_id, reason)
        if error:
            return jsonify({'error': error}), 400
            
        return jsonify(serialize(action)), 200
    except Exception as e:
        logger.error(f"Error rejecting mitigation: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/mitigation-actions/<action_id>/outcome', methods=['POST'])
@auth.require_auth
def submit_outcome_endpoint(action_id):
    """Submit actual outcome for learning"""
    try:
        data = request.get_json()
        actual_cost = data.get('actual_cost')
        actual_time_saved = data.get('actual_time_saved')
        rating = data.get('rating')
        feedback = data.get('feedback')
        
        result, error = service_feedback.submit_outcome_feedback(
            action_id, actual_cost, actual_time_saved, rating, feedback
        )
        if error:
            return jsonify({'error': error}), 400
            
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error submitting outcome: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/analytics/learning', methods=['GET'])
def get_learning_analytics_endpoint():
    """Get learning analytics stats"""
    try:
        action_type = request.args.get('action_type')
        stats = service_feedback.get_learning_analytics(action_type)
        return jsonify(stats), 200
    except Exception as e:
        logger.error(f"Error getting learning analytics: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/analytics/insights', methods=['GET'])
def get_learning_insights_endpoint():
    """Get advanced learning insights"""
    try:
        days = int(request.args.get('days', 30))
        insights = learning_engine.get_learning_insights(days)
        return jsonify(insights), 200
    except Exception as e:
        logger.error(f"Error getting learning insights: {str(e)}")
        return jsonify({'error': str(e)}), 500


# --- Enhancement 3: Explainability Endpoints ---

@app.route('/api/decisions/<decision_id>/explain', methods=['GET'])
def explain_decision(decision_id):
    """Get explanation for a specific decision"""
    try:
        with get_db_context() as db:
            decision = db.query(AgentDecision).filter(AgentDecision.decision_id == decision_id).first()
            if not decision:
                return jsonify({'error': 'Decision not found'}), 404
            
            return jsonify({
                'decision_id': decision.decision_id,
                'type': decision.decision_type,
                'reasoning': decision.reasoning,
                'confidence_score': float(decision.confidence_score) if decision.confidence_score else 0,
                'created_at': decision.created_at.isoformat()
            }), 200
    except Exception as e:
        logger.error(f"Error explaining decision: {str(e)}")
        return jsonify({'error': str(e)}), 500


# --- Enhancement 4: Traffic Data Endpoints ---

@app.route('/api/traffic/current', methods=['GET'])
def get_current_traffic():
    """Get current traffic data with optional location filter"""
    try:
        location_id = request.args.get('location_id')
        from backend.shared.db.models import TrafficData
        
        with get_db_context() as db:
            query = db.query(TrafficData)
            if location_id:
                query = query.filter(TrafficData.route_segment_id == location_id)
            
            # Get latest 100 records
            traffic = query.order_by(TrafficData.timestamp.desc()).limit(100).all()
            return jsonify([serialize(t) for t in traffic]), 200
    except Exception as e:
        logger.error(f"Error getting traffic data: {str(e)}")
        return jsonify({'error': str(e)}), 500


# --- Enhancement 5: LLM Health Status ---

@app.route('/api/health/llm', methods=['GET'])
def get_llm_health():
    """Get health status of LLM providers"""
    try:
        status = llm_health.get_llm_status()
        return jsonify(status), 200
    except Exception as e:
        logger.error(f"Error getting LLM health: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Application startup and shutdown



@app.teardown_appcontext
def shutdown_session(exception=None):
    """Clean up database session after each request"""
    close_db()


if __name__ == '__main__':
    logger.info(f"Starting Autonomous Control Tower API on {FLASK_HOST}:{FLASK_PORT}")
    logger.info(f"Debug mode: {FLASK_DEBUG}")
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)