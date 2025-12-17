# Risk Events Table Analysis and Usage

## Table Structure

### RiskEvent Model (SQLAlchemy)

```python
class RiskEvent(Base):
    __tablename__ = 'risk_events'
    
    # Primary Key
    event_id = Column(String(50), primary_key=True)
    
    # Foreign Keys
    shipment_id = Column(String(50), ForeignKey('shipments.shipment_id'), index=True)
    
    # Core Fields
    risk_type = Column(String(50), index=True)
    severity = Column(String(20), CheckConstraint("severity IN ('low', 'medium', 'high', 'critical')"), index=True)
    detected_at = Column(TIMESTAMP, default=datetime.utcnow)
    description = Column(Text)
    affected_eta = Column(TIMESTAMP)
    delay_hours = Column(Integer)
    status = Column(String(20), CheckConstraint("status IN ('detected', 'analyzing', 'mitigating', 'resolved', 'escalated')"), index=True)
    root_cause = Column(Text)
    agent_notes = Column(Text)
    
    # Relationships
    shipment = relationship('Shipment', back_populates='risk_events')
    agent_decisions = relationship('AgentDecision', back_populates='event')
    mitigation_actions = relationship('MitigationAction', back_populates='event')
    stakeholder_communications = relationship('StakeholderCommunication', back_populates='event')
```

## Trigger Usage

### Current Trigger Implementation

The trigger fires on:
- **Event**: INSERT or UPDATE on `risk_events` table
- **Condition**: `NEW.status = 'detected'`
- **Channel**: `risk_event_updates`
- **Payload**: JSON with `event_id`, `shipment_id`, `risk_type`, `severity`, `status`

### Compatibility Analysis

✅ **COMPATIBLE** - All fields used in trigger exist in the model:
- `event_id` ✓
- `shipment_id` ✓
- `risk_type` ✓
- `severity` ✓
- `status` ✓

### Status Field Values

The `status` field has the following valid values:
1. **'detected'** - Triggers the listener (NEW risk event)
2. **'analyzing'** - AI is analyzing the risk
3. **'mitigating'** - Mitigation actions are being executed
4. **'resolved'** - Risk has been resolved
5. **'escalated'** - Risk requires human intervention

### Severity Field Values

The `severity` field has the following valid values:
1. **'low'** - Minor risk, low impact
2. **'medium'** - Moderate risk, medium impact
3. **'high'** - Significant risk, high impact
4. **'critical'** - Severe risk, critical impact

## Server.py Usage

### process_risk_event() Function

The function processes a risk event through these phases:

#### 1. **Fetch Risk Event**
```python
event = db.query(RiskEvent).filter(RiskEvent.event_id == event_id).first()
```

#### 2. **Build Context from Shipment**
Uses the `shipment` relationship to get:
- `shipment_id`
- `origin_port_id`
- `destination_port_id`
- `current_port_id`
- `cargo_value_usd`
- `customer_id`

#### 3. **Get Traffic Context**
Queries `TrafficData` using `shipment.current_port_id`

#### 4. **AI Analysis**
Calls `IntelligenceLayer.analyze_risk()` with:
- Event description and risk_type
- Shipment context
- Traffic context

#### 5. **Record Decision**
Creates `AgentDecision` record with:
- Links to shipment and event
- AI reasoning and confidence score

#### 6. **Propose Mitigations**
Calls `IntelligenceLayer.propose_mitigation()` and creates `MitigationAction` records

#### 7. **Optimize Expensive Mitigations**
For actions > $1000, creates `AlternativeRoute` records

#### 8. **Draft Communications**
Creates `StakeholderCommunication` records for customers

#### 9. **Update Event Status**
```python
event.status = 'mitigating'
event.agent_notes = analysis.get("analysis_summary", "Analyzed by AI")
```

#### 10. **Update Dashboard View**
Updates `ShipmentChatView` with:
- Risk type, probability, severity
- Risk explanation and status
- Recommended actions and costs

## Required Fields for Trigger

### Minimum Required Fields

To successfully trigger and process a risk event, you need:

```sql
INSERT INTO risk_events (
    event_id,           -- Required: Primary key
    shipment_id,        -- Required: Must reference valid shipment
    risk_type,          -- Required: Type of risk (e.g., 'delay', 'damage', 'customs')
    severity,           -- Required: 'low', 'medium', 'high', or 'critical'
    status,             -- Required: Must be 'detected' to trigger listener
    description,        -- Recommended: Helps AI understand the risk
    detected_at         -- Optional: Defaults to NOW()
) VALUES (
    'EVT_123',
    'SHP_001',
    'delay',
    'high',
    'detected',
    'Port congestion causing 24-hour delay',
    NOW()
);
```

### Optional Fields

These fields enhance processing but are not required:
- `affected_eta` - Updated estimated time of arrival
- `delay_hours` - Estimated delay in hours
- `root_cause` - Root cause analysis
- `agent_notes` - Will be populated by AI

## Relationships and Dependencies

### Required Tables

For full functionality, these tables must exist:
1. **shipments** - Referenced by `shipment_id`
2. **agent_decisions** - Created during processing
3. **mitigation_actions** - Created during processing
4. **alternative_routes** - Created for expensive mitigations
5. **stakeholder_communications** - Created for notifications
6. **shipment_chat_view** - Updated with risk metrics
7. **traffic_data** - Optional, enhances analysis

### Foreign Key Constraints

```
risk_events.shipment_id -> shipments.shipment_id
```

The shipment MUST exist before inserting a risk event, or the foreign key constraint will fail.

## Example Usage Scenarios

### Scenario 1: Port Congestion Delay

```sql
INSERT INTO risk_events (
    event_id, shipment_id, risk_type, severity, status, description, delay_hours
) VALUES (
    'EVT_CONG_001',
    'SHP_12345',
    'port_congestion',
    'high',
    'detected',
    'Los Angeles port experiencing critical congestion. 48-hour delay expected.',
    48
);
```

**Expected Processing:**
1. Listener receives notification
2. AI analyzes port congestion impact
3. Proposes alternative routes or expedited handling
4. Drafts customer communication
5. Updates dashboard with delay information

### Scenario 2: Weather-Related Risk

```sql
INSERT INTO risk_events (
    event_id, shipment_id, risk_type, severity, status, description, affected_eta
) VALUES (
    'EVT_WEATHER_001',
    'SHP_67890',
    'weather',
    'critical',
    'detected',
    'Hurricane approaching shipment route. Vessel diversion required.',
    '2025-12-20 14:00:00'
);
```

**Expected Processing:**
1. Listener receives notification
2. AI analyzes weather impact and safety
3. Proposes route diversions
4. Calculates cost and time implications
5. Drafts urgent customer notification

### Scenario 3: Customs Delay

```sql
INSERT INTO risk_events (
    event_id, shipment_id, risk_type, severity, status, description, delay_hours
) VALUES (
    'EVT_CUSTOMS_001',
    'SHP_11111',
    'customs_delay',
    'medium',
    'detected',
    'Additional documentation required for customs clearance.',
    24
);
```

**Expected Processing:**
1. Listener receives notification
2. AI identifies required documentation
3. Proposes expedited customs processing
4. Drafts communication to customs broker
5. Updates customer on delay

## Monitoring and Debugging

### Check Trigger Status

```sql
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'risk_event_notify_trigger';
```

### View Recent Risk Events

```sql
SELECT 
    event_id,
    shipment_id,
    risk_type,
    severity,
    status,
    detected_at,
    description
FROM risk_events
WHERE status = 'detected'
ORDER BY detected_at DESC
LIMIT 10;
```

### Check Processing Results

```sql
-- Check if decisions were created
SELECT 
    d.decision_id,
    d.event_id,
    d.decision_type,
    d.confidence_score,
    d.created_at
FROM agent_decisions d
WHERE d.event_id = 'EVT_123';

-- Check if mitigations were proposed
SELECT 
    m.action_id,
    m.event_id,
    m.action_type,
    m.estimated_cost_usd,
    m.status
FROM mitigation_actions m
WHERE m.event_id = 'EVT_123';
```

## Performance Considerations

### Indexes

The following indexes exist for optimal performance:
- `shipment_id` (foreign key index)
- `risk_type` (query optimization)
- `severity` (filtering)
- `status` (trigger condition)

### Query Optimization

The trigger only fires when `status = 'detected'`, which:
- Reduces unnecessary notifications
- Prevents duplicate processing
- Allows status updates without re-triggering

## Summary

✅ **Trigger is fully compatible** with the risk_events table structure  
✅ **All required fields** are present in the model  
✅ **Relationships** are properly defined for processing  
✅ **Status workflow** is well-defined (detected → analyzing → mitigating → resolved)  
✅ **Foreign key constraints** ensure data integrity  

The implementation is production-ready and follows best practices for event-driven processing.
