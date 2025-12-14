"""
SQLAlchemy database models for the Autonomous Control Tower
"""
from sqlalchemy import (
    Boolean, Column, Integer, String, Text, Numeric, DateTime, Date,
    ForeignKey, CheckConstraint, Index, TIMESTAMP, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


# External - Third-Party Master Data
class Carrier(Base):
    __tablename__ = 'carriers'
    
    carrier_id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    type = Column(String(20), CheckConstraint("type IN ('ocean', 'air', 'rail', 'truck')"))
    reliability_score = Column(Numeric(5, 2))
    avg_delay_hours = Column(Integer)
    cost_index = Column(Numeric(5, 2))
    carbon_efficiency = Column(Numeric(5, 2))
    active = Column(Boolean, default=True)
    
    # Relationships
    vessels = relationship('Vessel', back_populates='carrier')
    tms_plans = relationship('TMSPlan', back_populates='carrier')
    shipments = relationship('Shipment', back_populates='current_carrier')


class Port(Base):
    __tablename__ = 'ports'
    
    port_id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    country = Column(String(100))
    region = Column(String(100))
    latitude = Column(Numeric(10, 6))
    longitude = Column(Numeric(10, 6))
    capacity_teu = Column(Integer)
    current_congestion_level = Column(String(20), CheckConstraint("current_congestion_level IN ('low', 'medium', 'high', 'critical')"))
    avg_dwell_time_hours = Column(Integer)
    customs_processing_hours = Column(Integer)
    last_updated = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    port_congestions = relationship('PortCongestion', back_populates='port')
    tms_plans_origin = relationship('TMSPlan', foreign_keys='TMSPlan.origin_port_id', back_populates='origin_port')
    tms_plans_destination = relationship('TMSPlan', foreign_keys='TMSPlan.destination_port_id', back_populates='destination_port')


class Vessel(Base):
    __tablename__ = 'vessels'
    
    vessel_id = Column(String(50), primary_key=True)
    vessel_name = Column(String(255), nullable=False)
    carrier_id = Column(String(50), ForeignKey('carriers.carrier_id'))
    type = Column(String(50))
    capacity_teu = Column(Integer)
    current_location = Column(String(255))
    status = Column(String(20), CheckConstraint("status IN ('in_transit', 'at_port', 'loading', 'unloading')"))
    
    # Relationships
    carrier = relationship('Carrier', back_populates='vessels')
    shipments = relationship('Shipment', back_populates='current_vessel')


# External - System Integrations
class Customer(Base):
    __tablename__ = 'customers'
    
    customer_id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    industry = Column(String(100))
    tier = Column(String(20), CheckConstraint("tier IN ('platinum', 'gold', 'silver', 'bronze')"))
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    sla_hours = Column(Integer)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    erp_orders = relationship('ERPOrder', back_populates='customer')
    crm_interactions = relationship('CRMInteraction', back_populates='customer')
    shipments = relationship('Shipment', back_populates='customer')


class ERPOrder(Base):
    __tablename__ = 'erp_orders'
    
    order_id = Column(String(50), primary_key=True)
    customer_id = Column(String(50), ForeignKey('customers.customer_id'))
    order_number = Column(String(100), nullable=False)
    order_date = Column(TIMESTAMP, nullable=False)
    order_status = Column(String(50), CheckConstraint("order_status IN ('draft', 'confirmed', 'in_production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled')"))
    order_type = Column(String(50), CheckConstraint("order_type IN ('standard', 'rush', 'backorder', 'pre_order')"))
    total_value_usd = Column(Numeric(15, 2))
    currency = Column(String(10))
    payment_terms = Column(String(50))
    payment_status = Column(String(30), CheckConstraint("payment_status IN ('pending', 'partial', 'paid', 'overdue')"))
    billing_address = Column(Text)
    shipping_address = Column(Text)
    requested_delivery_date = Column(TIMESTAMP)
    priority = Column(String(20), CheckConstraint("priority IN ('critical', 'high', 'medium', 'low')"))
    sales_rep_id = Column(String(50))
    order_source = Column(String(50), CheckConstraint("order_source IN ('web', 'email', 'phone', 'api', 'edi')"))
    special_instructions = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    customer = relationship('Customer', back_populates='erp_orders')
    mes_production = relationship('MESProduction', back_populates='order')
    oms_lifecycle = relationship('OMSLifecycle', back_populates='order')
    tms_plans = relationship('TMSPlan', back_populates='order')
    crm_interactions = relationship('CRMInteraction', back_populates='order')
    shipments = relationship('Shipment', secondary='shipments_erp_orders', back_populates='orders')


class WMSInventory(Base):
    __tablename__ = 'wms_inventory'
    
    inventory_id = Column(String(50), primary_key=True)
    warehouse_id = Column(String(50))
    warehouse_name = Column(String(255))
    warehouse_location = Column(String(255))
    product_code = Column(String(100))
    product_name = Column(String(255))
    sku = Column(String(100))
    lot_number = Column(String(100))
    quantity_on_hand = Column(Integer)
    quantity_available = Column(Integer)
    quantity_reserved = Column(Integer)
    quantity_in_transit = Column(Integer)
    quantity_damaged = Column(Integer)
    unit_of_measure = Column(String(20))
    location_bin = Column(String(50))
    zone = Column(String(50))
    storage_type = Column(String(50), CheckConstraint("storage_type IN ('ambient', 'refrigerated', 'frozen', 'hazmat', 'high_value')"))
    reorder_point = Column(Integer)
    reorder_quantity = Column(Integer)
    last_count_date = Column(TIMESTAMP)
    last_movement_date = Column(TIMESTAMP)
    expiry_date = Column(TIMESTAMP)
    status = Column(String(30), CheckConstraint("status IN ('available', 'reserved', 'quarantine', 'expired', 'damaged')"))
    cost_per_unit = Column(Numeric(15, 2))
    total_value_usd = Column(Numeric(15, 2))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    shipments = relationship('Shipment', secondary='shipments_wms_inventory', back_populates='inventory_items')


class MESProduction(Base):
    __tablename__ = 'mes_production'
    
    production_id = Column(String(50), primary_key=True)
    order_id = Column(String(50), ForeignKey('erp_orders.order_id'))
    production_order_number = Column(String(100))
    production_line = Column(String(100))
    product_code = Column(String(100))
    product_name = Column(String(255))
    quantity_ordered = Column(Integer)
    quantity_produced = Column(Integer)
    quantity_accepted = Column(Integer)
    quantity_rejected = Column(Integer)
    production_status = Column(String(30), CheckConstraint("production_status IN ('scheduled', 'in_progress', 'completed', 'on_hold', 'cancelled')"))
    scheduled_start = Column(TIMESTAMP)
    actual_start = Column(TIMESTAMP)
    scheduled_end = Column(TIMESTAMP)
    actual_end = Column(TIMESTAMP)
    shift = Column(String(20))
    operator_id = Column(String(50))
    machine_id = Column(String(50))
    quality_score = Column(Numeric(5, 2))
    defect_rate = Column(Numeric(5, 2))
    notes = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    order = relationship('ERPOrder', back_populates='mes_production')


class OMSLifecycle(Base):
    __tablename__ = 'oms_lifecycle'
    
    lifecycle_id = Column(String(50), primary_key=True)
    order_id = Column(String(50), ForeignKey('erp_orders.order_id'))
    stage = Column(String(50), CheckConstraint("stage IN ('order_received', 'order_validated', 'inventory_allocated', 'production_scheduled', 'picking', 'packing', 'quality_check', 'ready_for_dispatch', 'in_transit', 'delivered')"))
    stage_status = Column(String(30), CheckConstraint("stage_status IN ('pending', 'in_progress', 'completed', 'blocked', 'failed')"))
    entered_at = Column(TIMESTAMP, nullable=False)
    completed_at = Column(TIMESTAMP)
    duration_minutes = Column(Integer)
    performed_by = Column(String(100))
    notes = Column(Text)
    blocking_issue = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    order = relationship('ERPOrder', back_populates='oms_lifecycle')


class TMSPlan(Base):
    __tablename__ = 'tms_plans'
    
    plan_id = Column(String(50), primary_key=True)
    order_id = Column(String(50), ForeignKey('erp_orders.order_id'))
    plan_number = Column(String(100))
    plan_type = Column(String(50), CheckConstraint("plan_type IN ('ltl', 'ftl', 'parcel', 'intermodal', 'air', 'ocean')"))
    plan_status = Column(String(30), CheckConstraint("plan_status IN ('draft', 'optimized', 'approved', 'assigned', 'in_execution', 'completed', 'cancelled')"))
    origin_location = Column(String(255))
    destination_location = Column(String(255))
    origin_port_id = Column(String(50), ForeignKey('ports.port_id'))
    destination_port_id = Column(String(50), ForeignKey('ports.port_id'))
    carrier_id = Column(String(50), ForeignKey('carriers.carrier_id'))
    mode = Column(String(30), CheckConstraint("mode IN ('ocean', 'air', 'rail', 'truck', 'multimodal')"))
    service_level = Column(String(50))
    planned_pickup_date = Column(TIMESTAMP)
    planned_delivery_date = Column(TIMESTAMP)
    estimated_transit_days = Column(Integer)
    estimated_cost_usd = Column(Numeric(15, 2))
    actual_cost_usd = Column(Numeric(15, 2))
    distance_km = Column(Numeric(10, 2))
    weight_kg = Column(Numeric(12, 2))
    volume_cbm = Column(Numeric(12, 2))
    route_optimization_score = Column(Numeric(5, 2))
    load_utilization_percent = Column(Numeric(5, 2))
    created_by = Column(String(100))
    approved_by = Column(String(100))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    order = relationship('ERPOrder', back_populates='tms_plans')
    origin_port = relationship('Port', foreign_keys=[origin_port_id], back_populates='tms_plans_origin')
    destination_port = relationship('Port', foreign_keys=[destination_port_id], back_populates='tms_plans_destination')
    carrier = relationship('Carrier', back_populates='tms_plans')
    shipments = relationship('Shipment', secondary='shipments_tms_plans', back_populates='tms_plans')


class CRMInteraction(Base):
    __tablename__ = 'crm_interactions'
    
    interaction_id = Column(String(50), primary_key=True)
    order_id = Column(String(50), ForeignKey('erp_orders.order_id'))
    customer_id = Column(String(50), ForeignKey('customers.customer_id'))
    interaction_type = Column(String(50), CheckConstraint("interaction_type IN ('call', 'email', 'chat', 'meeting', 'complaint', 'inquiry', 'feedback')"))
    interaction_date = Column(TIMESTAMP, nullable=False)
    subject = Column(String(500))
    description = Column(Text)
    sentiment = Column(String(20), CheckConstraint("sentiment IN ('positive', 'neutral', 'negative', 'escalated')"))
    priority = Column(String(20), CheckConstraint("priority IN ('critical', 'high', 'medium', 'low')"))
    status = Column(String(30), CheckConstraint("status IN ('open', 'in_progress', 'resolved', 'closed')"))
    assigned_to = Column(String(100))
    resolution = Column(Text)
    resolved_at = Column(TIMESTAMP)
    satisfaction_score = Column(Integer, CheckConstraint("satisfaction_score >= 1 AND satisfaction_score <= 5"))
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    order = relationship('ERPOrder', back_populates='crm_interactions')
    customer = relationship('Customer', back_populates='crm_interactions')


# External - Real-Time Data
class TrafficData(Base):
    __tablename__ = 'traffic_data'
    
    traffic_id = Column(String(50), primary_key=True)
    route_segment_id = Column(String(100), index=True)
    segment_name = Column(String(255))
    start_location = Column(String(255))
    end_location = Column(String(255))
    start_latitude = Column(Numeric(10, 6))
    start_longitude = Column(Numeric(10, 6))
    end_latitude = Column(Numeric(10, 6))
    end_longitude = Column(Numeric(10, 6))
    distance_km = Column(Numeric(10, 2))
    current_speed_kmh = Column(Numeric(6, 2))
    average_speed_kmh = Column(Numeric(6, 2))
    free_flow_speed_kmh = Column(Numeric(6, 2))
    congestion_level = Column(String(20), CheckConstraint("congestion_level IN ('free_flow', 'light', 'moderate', 'heavy', 'standstill')"), index=True)
    delay_minutes = Column(Integer)
    traffic_density = Column(String(20), CheckConstraint("traffic_density IN ('light', 'moderate', 'heavy', 'very_heavy')"))
    incidents_count = Column(Integer)
    incident_types = Column(JSON)
    weather_condition = Column(String(50))
    road_condition = Column(String(50), CheckConstraint("road_condition IN ('clear', 'wet', 'icy', 'snow', 'construction', 'closed')"))
    predicted_duration_minutes = Column(Integer)
    confidence_score = Column(Numeric(5, 2))
    data_source = Column(String(50))
    timestamp = Column(TIMESTAMP, nullable=False, index=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)


class PortCongestion(Base):
    __tablename__ = 'port_congestion'
    
    congestion_id = Column(String(50), primary_key=True)
    port_id = Column(String(50), ForeignKey('ports.port_id'), index=True)
    timestamp = Column(TIMESTAMP, nullable=False, index=True)
    vessels_at_berth = Column(Integer)
    vessels_waiting = Column(Integer)
    total_capacity = Column(Integer)
    utilization_percent = Column(Numeric(5, 2))
    congestion_level = Column(String(20), CheckConstraint("congestion_level IN ('low', 'medium', 'high', 'critical')"), index=True)
    average_wait_time_hours = Column(Numeric(6, 2))
    predicted_wait_time_hours = Column(Numeric(6, 2))
    berth_availability = Column(Integer)
    crane_availability = Column(Integer)
    labor_availability = Column(String(20), CheckConstraint("labor_availability IN ('full', 'limited', 'critical', 'unavailable')"))
    storage_utilization_percent = Column(Numeric(5, 2))
    container_dwell_time_hours = Column(Numeric(6, 2))
    customs_processing_delay_hours = Column(Numeric(6, 2))
    weather_impact = Column(String(50))
    operational_issues = Column(Text)
    next_available_berth_time = Column(TIMESTAMP)
    congestion_trend = Column(String(20), CheckConstraint("congestion_trend IN ('improving', 'stable', 'worsening', 'critical')"))
    data_source = Column(String(50))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    port = relationship('Port', back_populates='port_congestions')


# Internal - Core Management
class Shipment(Base):
    __tablename__ = 'shipments'
    
    shipment_id = Column(String(50), primary_key=True)
    customer_id = Column(String(50), ForeignKey('customers.customer_id'), index=True)
    origin_port_id = Column(String(50), ForeignKey('ports.port_id'), index=True)
    destination_port_id = Column(String(50), ForeignKey('ports.port_id'), index=True)
    current_port_id = Column(String(50), ForeignKey('ports.port_id'))
    status = Column(String(20), CheckConstraint("status IN ('planned', 'in_transit', 'at_port', 'customs', 'delayed', 'at_risk', 'delivered')"), index=True)
    priority = Column(String(20), CheckConstraint("priority IN ('critical', 'high', 'medium', 'low')"))
    cargo_type = Column(String(100))
    cargo_value_usd = Column(Numeric(15, 2))
    weight_kg = Column(Numeric(12, 2))
    volume_cbm = Column(Numeric(12, 2))
    container_count = Column(Integer)
    current_carrier_id = Column(String(50), ForeignKey('carriers.carrier_id'), index=True)
    current_vessel_id = Column(String(50), ForeignKey('vessels.vessel_id'))
    planned_departure = Column(TIMESTAMP)
    actual_departure = Column(TIMESTAMP)
    estimated_arrival = Column(TIMESTAMP)
    actual_arrival = Column(TIMESTAMP)
    planned_route = Column(JSON)
    actual_route = Column(JSON)
    temperature_controlled = Column(Boolean, default=False)
    hazardous_material = Column(Boolean, default=False)
    customs_cleared = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow, index=True)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    customer = relationship('Customer', back_populates='shipments')
    current_carrier = relationship('Carrier', back_populates='shipments')
    current_vessel = relationship('Vessel', back_populates='shipments')
    risk_events = relationship('RiskEvent', back_populates='shipment')
    agent_decisions = relationship('AgentDecision', back_populates='shipment')
    mitigation_actions = relationship('MitigationAction', back_populates='shipment')
    alternative_routes = relationship('AlternativeRoute', back_populates='shipment')
    stakeholder_communications = relationship('StakeholderCommunication', back_populates='shipment')
    orders = relationship('ERPOrder', secondary='shipments_erp_orders', back_populates='shipments')
    tms_plans = relationship('TMSPlan', secondary='shipments_tms_plans', back_populates='shipments')
    inventory_items = relationship('WMSInventory', secondary='shipments_wms_inventory', back_populates='shipments')


# Junction Tables
class ShipmentERPOrder(Base):
    __tablename__ = 'shipments_erp_orders'
    
    shipment_id = Column(String(50), ForeignKey('shipments.shipment_id'), primary_key=True, index=True)
    order_id = Column(String(50), ForeignKey('erp_orders.order_id'), primary_key=True, index=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)


class ShipmentTMSPlan(Base):
    __tablename__ = 'shipments_tms_plans'
    
    shipment_id = Column(String(50), ForeignKey('shipments.shipment_id'), primary_key=True, index=True)
    plan_id = Column(String(50), ForeignKey('tms_plans.plan_id'), primary_key=True, index=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)


class ShipmentWMSInventory(Base):
    __tablename__ = 'shipments_wms_inventory'
    
    shipment_id = Column(String(50), ForeignKey('shipments.shipment_id'), primary_key=True, index=True)
    inventory_id = Column(String(50), ForeignKey('wms_inventory.inventory_id'), primary_key=True, index=True)
    quantity_fulfilled = Column(Integer)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)


# Internal - AI/Risk Management
class RiskEvent(Base):
    __tablename__ = 'risk_events'
    
    event_id = Column(String(50), primary_key=True)
    shipment_id = Column(String(50), ForeignKey('shipments.shipment_id'), index=True)
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


class AgentDecision(Base):
    __tablename__ = 'agent_decisions'
    
    decision_id = Column(String(50), primary_key=True)
    shipment_id = Column(String(50), ForeignKey('shipments.shipment_id'), index=True)
    event_id = Column(String(50), ForeignKey('risk_events.event_id'), index=True)
    agent_name = Column(String(50))
    decision_type = Column(String(50))
    reasoning = Column(Text)
    confidence_score = Column(Numeric(5, 2))
    alternatives_considered = Column(JSON)
    selected_option = Column(JSON)
    tokens_used = Column(Integer)
    execution_time_ms = Column(Integer)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    shipment = relationship('Shipment', back_populates='agent_decisions')
    event = relationship('RiskEvent', back_populates='agent_decisions')


class MitigationAction(Base):
    __tablename__ = 'mitigation_actions'
    
    action_id = Column(String(50), primary_key=True)
    event_id = Column(String(50), ForeignKey('risk_events.event_id'), index=True)
    shipment_id = Column(String(50), ForeignKey('shipments.shipment_id'), index=True)
    action_type = Column(String(50))
    description = Column(Text)
    estimated_cost_usd = Column(Numeric(15, 2))
    estimated_time_saved_hours = Column(Integer)
    probability_success = Column(Numeric(5, 2))
    status = Column(String(20), CheckConstraint("status IN ('proposed', 'simulating', 'approved', 'executing', 'completed', 'failed', 'rejected')"), index=True)
    proposed_at = Column(TIMESTAMP, default=datetime.utcnow)
    executed_at = Column(TIMESTAMP)
    completed_at = Column(TIMESTAMP)
    execution_result = Column(Text)
    proposed_by = Column(String(100))
    approved_by = Column(String(100))
    
    # Relationships
    event = relationship('RiskEvent', back_populates='mitigation_actions')
    shipment = relationship('Shipment', back_populates='mitigation_actions')
    alternative_routes = relationship('AlternativeRoute', back_populates='action')


class AlternativeRoute(Base):
    __tablename__ = 'alternative_routes'
    
    route_id = Column(String(50), primary_key=True)
    action_id = Column(String(50), ForeignKey('mitigation_actions.action_id'))
    shipment_id = Column(String(50), ForeignKey('shipments.shipment_id'))
    route_ports = Column(JSON)
    carriers = Column(JSON)
    total_distance_km = Column(Numeric(10, 2))
    estimated_duration_hours = Column(Integer)
    estimated_cost_usd = Column(Numeric(15, 2))
    risk_score = Column(Numeric(5, 2))
    carbon_footprint_kg = Column(Numeric(10, 2))
    score = Column(Numeric(5, 2))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    action = relationship('MitigationAction', back_populates='alternative_routes')
    shipment = relationship('Shipment', back_populates='alternative_routes')


# Internal - Communication
class StakeholderCommunication(Base):
    __tablename__ = 'stakeholder_communications'
    
    communication_id = Column(String(50), primary_key=True)
    shipment_id = Column(String(50), ForeignKey('shipments.shipment_id'), index=True)
    event_id = Column(String(50), ForeignKey('risk_events.event_id'), index=True)
    workspace_id = Column(String(50))
    recipient_type = Column(String(50), CheckConstraint("recipient_type IN ('customer', 'carrier', 'customs', 'port_authority', 'internal')"))
    recipient_id = Column(String(50))
    channel = Column(String(20), CheckConstraint("channel IN ('email', 'sms', 'api', 'dashboard')"))
    subject = Column(String(500))
    message = Column(Text)
    sent_at = Column(TIMESTAMP, default=datetime.utcnow)
    status = Column(String(20), CheckConstraint("status IN ('draft', 'sent', 'delivered', 'read', 'failed')"))
    automated = Column(Boolean, default=True)
    requires_response = Column(Boolean, default=False)
    response_deadline = Column(TIMESTAMP)
    
    # Relationships
    shipment = relationship('Shipment', back_populates='stakeholder_communications')
    event = relationship('RiskEvent', back_populates='stakeholder_communications')


# Internal - Analytics
class OperationalMetric(Base):
    __tablename__ = 'operational_metrics'
    
    metric_id = Column(String(50), primary_key=True)
    metric_date = Column(Date, nullable=False, index=True)
    total_shipments = Column(Integer)
    on_time_shipments = Column(Integer)
    delayed_shipments = Column(Integer)
    at_risk_shipments = Column(Integer)
    risks_detected = Column(Integer)
    risks_mitigated = Column(Integer)
    risks_predicted = Column(Integer)
    predictions_accurate = Column(Integer)
    autonomous_decisions = Column(Integer)
    human_decisions = Column(Integer)
    avg_detection_time_minutes = Column(Integer)
    avg_mitigation_time_minutes = Column(Integer)
    avg_prediction_accuracy = Column(Numeric(5, 2))
    cost_saved_usd = Column(Numeric(15, 2))
    customer_satisfaction_score = Column(Numeric(5, 2))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
