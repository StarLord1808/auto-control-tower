# Auto-Control-Tower Flask API

Flask-based REST API for the Autonomous Logistics Control Tower system.

## Features

- **30+ REST API Endpoints** for managing logistics operations
- **SQLAlchemy ORM** with models for 22 database tables
- **Real-time shipment tracking** with risk detection
- **AI agent decision logging** and mitigation actions
- **Operational metrics** and dashboard statistics
- **Port congestion monitoring** and traffic data

## API Endpoints

### Health & Dashboard
- `GET /api/health` - Health check
- `GET /api/dashboard/stats` - Dashboard statistics

### Shipments
- `GET /api/shipments` - List all shipments (with filters)
- `GET /api/shipments/<id>` - Get shipment details
- `GET /api/shipments/at-risk` - Get at-risk shipments
- `PUT /api/shipments/<id>/status` - Update shipment status
- `GET /api/shipments/<id>/risk-events` - Get shipment risk events
- `GET /api/shipments/<id>/decisions` - Get shipment decisions
- `GET /api/shipments/<id>/alternative-routes` - Get alternative routes

### Risk Events
- `GET /api/risk-events` - List risk events
- `POST /api/risk-events` - Create risk event
- `GET /api/risk-events/<id>/actions` - Get mitigation actions

### Agent Decisions
- `GET /api/agent-decisions` - List agent decisions
- `POST /api/agent-decisions` - Create agent decision

### Mitigation Actions
- `GET /api/mitigation-actions` - List mitigation actions
- `POST /api/mitigation-actions` - Create mitigation action
- `PUT /api/mitigation-actions/<id>/status` - Update action status

### Alternative Routes
- `POST /api/alternative-routes` - Create alternative route

### Communications
- `GET /api/communications` - List communications
- `POST /api/communications` - Create communication

### Operational Metrics
- `GET /api/metrics` - Get metrics by date range
- `GET /api/metrics/latest` - Get latest metrics

### Port Congestion
- `GET /api/port-congestion` - Get port congestion data
- `GET /api/port-congestion/high` - Get high congestion ports

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp .env.template .env
   # Edit .env with your database credentials
   ```

3. **Run the application:**
   ```bash
   python main_app.py
   ```

The API will be available at `http://localhost:5000`

## Database Models

The API includes SQLAlchemy models for all 22 tables:
- Carriers, Ports, Vessels (External master data)
- Customers, ERP Orders, WMS Inventory, MES Production, OMS Lifecycle, TMS Plans, CRM Interactions (System integrations)
- Traffic Data, Port Congestion (Real-time data)
- Shipments (Core management)
- Risk Events, Agent Decisions, Mitigation Actions, Alternative Routes (AI/Risk management)
- Stakeholder Communications (Communication)
- Operational Metrics (Analytics)

## Architecture

```
flask-api/
├── main_app.py          # Flask application with API endpoints
├── service.py           # Business logic layer
├── constants.py         # Configuration constants
├── requirements.txt     # Python dependencies
├── db/
│   ├── models.py       # SQLAlchemy models
│   └── database.py     # Database connection management
└── .env.template       # Environment variables template
```

## Query Parameters

Most GET endpoints support these parameters:
- `limit` - Maximum number of results (default: 100)
- `offset` - Pagination offset (default: 0)
- `status` - Filter by status
- `severity` - Filter by severity (risk events)
- `agent_name` - Filter by agent name (decisions)

## Response Format

All successful responses return JSON:
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

Error responses:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```
