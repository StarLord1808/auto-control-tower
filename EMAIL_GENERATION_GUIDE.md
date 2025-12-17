# Communication Email Generation - Quick Guide

## Where Are Emails Generated?

The communication emails are generated in **[server.py](file:///home/jiraiya/codebase/ai-agent/Auto-Control-Tower/backend/server/server.py#L145-L167)** during risk event processing.

### Processing Flow

```
Risk Event Detected
    ↓
Listener Receives Notification
    ↓
process_risk_event() Called
    ↓
AI Analyzes Risk
    ↓
Mitigations Proposed
    ↓
📧 COMMUNICATION DRAFTED ← You are here!
    ↓
Saved to Database (status='draft')
```

## Email Storage Location

Emails are stored in the **`stakeholder_communications`** table in PostgreSQL.

### Database Schema

```sql
CREATE TABLE stakeholder_communications (
    communication_id VARCHAR(50) PRIMARY KEY,
    shipment_id VARCHAR(50),
    event_id VARCHAR(50),
    recipient_type VARCHAR(50),  -- 'customer', 'carrier', 'customs', etc.
    recipient_id VARCHAR(50),     -- Customer ID
    channel VARCHAR(20),          -- 'email', 'sms', 'api', 'dashboard'
    subject VARCHAR(500),         -- Email subject
    message TEXT,                 -- Email body
    status VARCHAR(20),           -- 'draft', 'sent', 'delivered', 'read', 'failed'
    sent_at TIMESTAMP,
    automated BOOLEAN DEFAULT true,
    requires_response BOOLEAN DEFAULT false
);
```

## How to View Generated Emails

### Option 1: Query Database Directly

```sql
-- View all draft emails
SELECT 
    communication_id,
    shipment_id,
    event_id,
    recipient_id,
    subject,
    message,
    status,
    sent_at
FROM stakeholder_communications
WHERE status = 'draft'
ORDER BY sent_at DESC;
```

### Option 2: View Specific Email for Risk Event

```sql
-- View email for specific risk event (e.g., RISK_G000026)
SELECT 
    communication_id,
    subject,
    message,
    recipient_id,
    status
FROM stakeholder_communications
WHERE event_id = 'RISK_G000026';
```

**Example Output:**
```
communication_id | COM_a1b2c3d4
subject          | Update on Port Congestion Risk Mitigation Strategies
recipient_id     | CUST_G0486
status           | draft
message          | Dear Valued Customer,

We are writing to inform you about a port congestion issue affecting your shipment SHIP_G002605...
[Full email content here]
```

### Option 3: Use Flask API

```bash
# Get all communications for a shipment
curl http://localhost:5000/api/communications?shipment_id=SHIP_G002605

# Get all communications
curl http://localhost:5000/api/communications
```

## Email Generation Code

Located in **[server.py:145-167](file:///home/jiraiya/codebase/ai-agent/Auto-Control-Tower/backend/server/server.py#L145-L167)**:

```python
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
        status="draft"  # ← Email starts as 'draft'
    )
    db.add(comm)
    logger.info(f"Communication Agent drafted email: {comm_draft.get('subject')}")
```

## Email Status Workflow

```
draft → sent → delivered → read
   ↓
failed (if sending fails)
```

**Current Implementation:** Emails are created with `status='draft'` and stored in the database. They are **not automatically sent** - this allows for human review before sending.

## How to Send Emails

### Option 1: Manual Approval (Recommended)

1. **Review draft emails** in database
2. **Approve via API** (if implemented)
3. **Update status** to 'sent'
4. **Integrate with email service** (SendGrid, AWS SES, etc.)

### Option 2: Automatic Sending (Future Enhancement)

Add email sending logic after draft creation:

```python
# After creating comm object
if auto_send_enabled:
    send_email(
        to=get_customer_email(shipment.customer_id),
        subject=comm.subject,
        body=comm.message
    )
    comm.status = 'sent'
    comm.sent_at = datetime.utcnow()
```

## View Recent Email from Your Logs

From your listener.log, the most recent email was:

```
Subject: Update on Port Congestion Risk Mitigation Strategies
Event: RISK_G000026
Shipment: SHIP_G002605
Customer: CUST_G0486
```

### To View Full Email Content:

```sql
SELECT message 
FROM stakeholder_communications 
WHERE event_id = 'RISK_G000026' 
ORDER BY sent_at DESC 
LIMIT 1;
```

## API Endpoints for Communications

### Get All Communications
```bash
GET /api/communications
```

### Get Communications for Specific Shipment
```bash
GET /api/communications?shipment_id=SHIP_G002605
```

### Create Communication (Manual)
```bash
POST /api/communications
Content-Type: application/json

{
  "shipment_id": "SHIP_001",
  "event_id": "RISK_001",
  "recipient_type": "customer",
  "recipient_id": "CUST_001",
  "channel": "email",
  "subject": "Shipment Update",
  "message": "Your shipment has been delayed...",
  "status": "draft"
}
```

## Summary

✅ **Emails are generated** in `server.py` during risk event processing  
✅ **Stored in database** in `stakeholder_communications` table  
✅ **Status is 'draft'** by default (not auto-sent)  
✅ **Accessible via** SQL queries or Flask API  
✅ **Can be reviewed** before sending to customers  

**Your system is working perfectly!** The listener processed the risk event and generated the communication email as expected.
