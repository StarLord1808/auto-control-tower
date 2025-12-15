# Autonomous Control Tower - Global Logistics Management System

## 🌐 Overview
The **Autonomous Control Tower** is a sophisticated AI-powered logistics platform that provides end-to-end visibility and autonomous management of global supply chain operations. The system combines real-time monitoring, predictive risk analysis, and AI-driven decision-making to optimize shipment tracking, mitigate disruptions, and ensure on-time delivery.

### Key Features
- 🤖 **AI-Powered Risk Analysis** - Multi-agent system for predictive risk assessment
- 📊 **Real-Time Dashboard** - Modern web interface with live metrics and visualizations
- 🔐 **Secure Authentication** - JWT-based user management with role-based access
- 💬 **AI Chat Bot** - Natural language interface for querying shipment data
- 🚨 **Automated Alerts** - Real-time notifications for critical events
- 📈 **Performance Analytics** - Carrier performance tracking and KPI monitoring

---

## 🏗️ System Architecture

The system is built on a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  (React-style Dashboard with Real-time Updates)            │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Flask)                      │
│  • Authentication (JWT)                                     │
│  • RESTful Endpoints                                        │
│  • Business Logic Services                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓ SQLAlchemy
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer (PostgreSQL)               │
│  • Shipments & Orders                                       │
│  • Risk Events & Decisions                                  │
│  • Users & Authentication                                   │
└─────────────────────────────────────────────────────────────┘
                            ↑ Polling
┌─────────────────────────────────────────────────────────────┐
│              Intelligence Layer (AI Agents)                 │
│  • Risk Detection                                           │
│  • Mitigation Planning                                      │
│  • Stakeholder Communication                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Auto-Control-Tower/
├── backend/
│   ├── flask-api/              # REST API Server
│   │   ├── db/
│   │   │   ├── models.py       # SQLAlchemy ORM Models (22 tables)
│   │   │   └── database.py     # Database connection & session management
│   │   ├── auth.py             # JWT authentication & user management
│   │   ├── service.py          # Business logic layer
│   │   ├── main_app.py         # Flask application & API endpoints
│   │   ├── constants.py        # Configuration constants
│   │   └── requirements.txt    # Python dependencies
│   │
│   └── server/                 # AI Agent Server
│       ├── server.py           # Main agent loop
│       ├── intelligence_layer.py  # LLM integration (Mistral/OpenAI)
│       └── prompts_constants.py   # AI prompts & templates
│
├── front-end/                  # Web Dashboard
│   ├── index.html              # Main HTML structure
│   ├── style.css               # Dark theme styling
│   └── app.js                  # Frontend logic & API integration
│
├── docs/                       # Documentation
│   ├── FLASK_API.md           # API documentation
│   ├── AI_AGENTS.md           # AI agents explanation
│   ├── DASHBOARD.md           # Dashboard guide
│   └── CHATBOT.md             # Chat bot documentation
│
└── README.md                   # This file
```

---

## 🔧 Component Deep Dive

### 1. Database Layer (`backend/flask-api/db/`)

#### `models.py` - Data Models (630 lines)
Defines **22 SQLAlchemy models** representing the complete supply chain ecosystem:

**Core Entities:**
- `Shipment` - Central entity tracking goods movement
- `RiskEvent` - Disruptions and anomalies
- `Customer` - Client information
- `Carrier` / `Vessel` / `Port` - Transportation infrastructure

**System Integration:**
- `ERPOrder` - Enterprise resource planning orders
- `WMSInventory` - Warehouse management data
- `MESProduction` - Manufacturing execution system
- `TMSPlan` - Transportation management plans

**AI & Analytics:**
- `AgentDecision` - AI decision audit trail
- `MitigationAction` - Proposed remediation steps
- `AlternativeRoute` - Route optimization options
- `StakeholderCommunication` - Automated notifications
- `OperationalMetric` - Performance KPIs

**Authentication:**
- `User` - User accounts with role-based access

**Dashboard View:**
- `ShipmentChatView` - Denormalized view for dashboard queries

#### `database.py` - Database Connection
- PostgreSQL connection via SQLAlchemy
- Context manager for session handling
- Environment-based configuration

---

### 2. API Layer (`backend/flask-api/`)

#### `auth.py` - Authentication Module (160 lines)
**Functions:**
- `generate_token()` - Creates JWT tokens (24h expiration)
- `decode_token()` - Validates and decodes JWT
- `require_auth` - Decorator for protecting routes
- `register_user()` - User registration with password hashing
- `login_user()` - Authentication and token generation
- `get_current_user()` - Retrieve user profile

**Security Features:**
- Werkzeug password hashing (PBKDF2)
- JWT with HS256 algorithm
- Token expiration handling
- Role-based access control (admin/operator/viewer)

#### `service.py` - Business Logic (425 lines)
**Core Services:**
- `get_all_shipments()` - Fetch shipments with filters
- `get_dashboard_stats()` - Legacy dashboard metrics
- `get_dashboard_summary()` - Enhanced metrics with KPIs
- `get_recent_alerts()` - Active risk events
- `get_carrier_performance()` - Carrier reliability scores

**AI Integration:**
- `process_chat_query()` - Natural language query processing
  - Parses user intent
  - Queries database
  - Formats responses

**Query Examples:**
```python
# "Show me delayed shipments"
→ Returns list of shipments with status='delayed'

# "What are the active risks?"
→ Returns risk events with status in ['detected', 'analyzing', 'mitigating']

# "Dashboard summary"
→ Returns total shipments, on-time rate, exceptions, avg transit time
```

#### `main_app.py` - Flask Application (494 lines)
**API Endpoints:**

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Login (returns JWT token)
- `GET /api/auth/me` - Get current user info (protected)

**Dashboard:**
- `GET /api/dashboard/summary` - Enhanced metrics (protected)
- `GET /api/alerts/recent` - Recent alerts (protected)
- `GET /api/carriers/performance` - Carrier metrics (protected)

**Shipments:**
- `GET /api/shipments` - List shipments (with filters)
- `GET /api/shipments/<id>` - Get shipment details
- `GET /api/shipments/at-risk` - At-risk shipments
- `PUT /api/shipments/<id>/status` - Update status

**Risk Events:**
- `GET /api/risk-events` - List risk events
- `POST /api/risk-events` - Create risk event
- `GET /api/shipments/<id>/risk-events` - Shipment risks

**Chat Bot:**
- `POST /api/chat/query` - Process chat queries (protected)

**Features:**
- CORS enabled for frontend
- Error handling (404, 500, 400)
- Request logging
- JSON serialization for datetime objects

---

### 3. Intelligence Layer (`backend/server/`)

#### `server.py` - AI Agent Loop (199 lines)
**Main Loop (`run_agent_loop`):**

1. **Risk Detection** - Polls `RiskEvent` table for `status='detected'`
2. **Context Building** - Gathers shipment, customer, and cargo details
3. **Risk Analysis** - Calls `IntelligenceLayer.analyze_risk()`
4. **Decision Logging** - Records analysis in `AgentDecision` table
5. **Mitigation Planning** - Calls `IntelligenceLayer.propose_mitigation()`
6. **Optimization** - For expensive mitigations (>$1000), finds alternatives
7. **Communication** - Drafts stakeholder notifications
8. **Dashboard Update** - Updates `ShipmentChatView` with metrics

**Execution Flow:**
```
┌─────────────────┐
│ Detect New Risk │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Analyze Risk   │ ← LLM Call (Mistral/OpenAI)
└────────┬────────┘
         ↓
┌─────────────────┐
│ Propose Actions │ ← LLM Call
└────────┬────────┘
         ↓
┌─────────────────┐
│ Optimize Route  │ ← LLM Call (if cost > $1000)
└────────┬────────┘
         ↓
┌─────────────────┐
│ Draft Comms     │ ← LLM Call
└────────┬────────┘
         ↓
┌─────────────────┐
│ Update Database │
└─────────────────┘
```

#### `intelligence_layer.py` - LLM Integration (150 lines)
**Class: IntelligenceLayer**

**Initialization:**
- Tries `MISTRAL_API_KEY` first (cost-effective)
- Falls back to `OPENAI_API_KEY`
- Ensures high availability

**Methods:**
- `analyze_risk(risk_data, context)` - Risk assessment
  - Returns: severity, impact summary, confidence score
  
- `propose_mitigation(risk_data, context)` - Generate solutions
  - Returns: list of actions with costs, time savings, probability
  
- `optimize_mitigation(mitigation, context)` - Find cheaper alternatives
  - Returns: optimized route with cost/time estimates
  
- `draft_communication(decision_summary, recipient_context)` - Auto-generate emails
  - Returns: subject, message body, tone

**Error Handling:**
- API timeout handling
- JSON parsing with fallback
- Graceful degradation

#### `prompts_constants.py` - AI Prompts
**System Prompts:**
- `RISK_ANALYSIS_SYSTEM_PROMPT` - Instructs AI to act as logistics analyst
- `MITIGATION_SYSTEM_PROMPT` - Instructs AI to generate structured actions
- `OPTIMIZATION_SYSTEM_PROMPT` - Instructs AI to find cost-effective alternatives
- `COMMUNICATION_SYSTEM_PROMPT` - Instructs AI to draft professional emails

---

### 4. Frontend Layer (`front-end/`)

#### `index.html` - UI Structure (300 lines)
**Components:**

**Login Page:**
- Login form with username/password
- Registration form toggle
- Modern card-based design

**Dashboard Layout:**
- Top bar (logo, search, notifications, user menu)
- Left sidebar (navigation)
- Main content area (metrics, table, charts)
- Right sidebar (alerts panel)
- Floating chat widget (bottom-right)

**Metrics Cards (4):**
- Total Active Shipments
- On-Time Rate (%)
- Exceptions (at-risk + delayed)
- Average Transit Time (days)

**Shipment Table:**
- Columns: ID, Origin, Destination, Mode, Location, Status, ETA, Alerts
- Status filters
- Search functionality

**Alerts Panel:**
- Real-time risk events
- Color-coded severity (critical/high/medium/low)
- Auto-refresh button

**Chat Widget:**
- Collapsible interface
- Message history
- Input field with send button

#### `style.css` - Dark Theme Styling (750 lines)
**Design System:**
- CSS variables for theming
- Dark color palette (`#0F172A`, `#1E293B`, `#334155`)
- Accent colors (blue, green, red, orange, purple)

**Components:**
- Login card with glassmorphism
- Metrics cards with hover effects
- Status badges (semantic colors)
- Alert items with severity borders
- Chat bubbles (user vs bot)
- Sparkline chart containers
- Responsive grid layouts

**Animations:**
- Smooth transitions (0.3s ease)
- Hover transforms
- Shadow effects
- Custom scrollbars

#### `app.js` - Frontend Logic (450 lines)
**Core Functions:**

**Authentication:**
- `login(username, password)` - Authenticate and store JWT
- `register(username, email, password)` - Create account
- `logout()` - Clear session and redirect

**Data Loading:**
- `loadDashboardData()` - Fetch all dashboard data
- `loadDashboardSummary()` - Get metrics
- `loadShipments(filter)` - Get shipment list
- `loadAlerts()` - Get recent alerts
- `loadCarrierPerformance()` - Get carrier charts

**Visualizations:**
- `updateSparklines()` - Create metric trend charts (Chart.js)
- `createSparkline()` - Individual sparkline renderer
- `loadCarrierPerformance()` - Bar chart for carriers

**Chat Bot:**
- `sendChatMessage(message)` - Send query to API
- `addChatMessage(message, isUser)` - Render message bubble

**Auto-Update:**
- `startAutoUpdate()` - Poll every 10 seconds
- `stopAutoUpdate()` - Clear interval on logout

**Utilities:**
- `formatDate()` - Human-readable timestamps
- `formatTimeAgo()` - Relative time (e.g., "5m ago")
- `getStatusClass()` - Map status to CSS class
- `getSeverityColor()` - Map severity to color

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- PostgreSQL 12+
- Node.js (for Chart.js CDN)

### Installation

1. **Clone Repository:**
```bash
git clone <repository-url>
cd Auto-Control-Tower
```

2. **Install Python Dependencies:**
```bash
pip install -r backend/flask-api/requirements.txt
```

3. **Configure Environment:**
Create `backend/flask-api/.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/control_tower
MISTRAL_API_KEY=your_mistral_key
OPENAI_API_KEY=your_openai_key
JWT_SECRET=your_secret_key_change_in_production
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=True
```

4. **Initialize Database:**
```bash
python3 create_users_table.py
```

5. **Create Admin User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@example.com","password":"admin123","role":"admin"}'
```

### Running the System

**Terminal 1 - AI Agent:**
```bash
python3 backend/server/server.py
```

**Terminal 2 - Flask API:**
```bash
python3 backend/flask-api/main_app.py
```

**Terminal 3 - Frontend:**
```bash
cd front-end
python3 -m http.server 8080
```

**Access Dashboard:**
Open browser to `http://localhost:8080`

---

## 📚 Documentation

Detailed component documentation available in `/docs`:

- **[Flask API Documentation](docs/FLASK_API.md)** - Complete API reference
- **[AI Agents Guide](docs/AI_AGENTS.md)** - Intelligence layer deep dive
- **[Dashboard Guide](docs/DASHBOARD.md)** - Frontend usage and customization
- **[Chat Bot Documentation](docs/CHATBOT.md)** - Natural language queries

---

## 🧪 Testing

### API Testing
```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get dashboard (with token)
curl http://localhost:5000/api/dashboard/summary \
  -H "Authorization: Bearer <your_token>"
```

### Chat Bot Testing
```bash
curl -X POST http://localhost:5000/api/chat/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Show me delayed shipments"}'
```

---

## 🔐 Security

- **JWT Authentication** - 24-hour token expiration
- **Password Hashing** - Werkzeug PBKDF2
- **Role-Based Access** - Admin, Operator, Viewer roles
- **CORS Protection** - Configurable origins
- **SQL Injection Prevention** - SQLAlchemy ORM
- **XSS Protection** - JSON escaping

---

## 📈 Performance

- **Real-Time Updates** - 10-second polling interval
- **Optimized Queries** - Indexed columns, eager loading
- **Caching** - LocalStorage for JWT tokens
- **Lazy Loading** - Chart.js loaded via CDN
- **Responsive Design** - Mobile-friendly layout

---

## 🛠️ Technology Stack

**Backend:**
- Python 3.10
- Flask 3.0
- SQLAlchemy 2.0
- PostgreSQL 12+
- PyJWT 2.8
- LangChain (Mistral AI / OpenAI)

**Frontend:**
- Vanilla JavaScript (ES6+)
- Chart.js 4.4
- CSS3 (Grid, Flexbox)
- HTML5

---

## 📝 License

[Your License Here]

---

## 👥 Contributors

[Your Team Here]

---

## 📞 Support

For issues and questions, please refer to the documentation in `/docs` or contact the development team.
