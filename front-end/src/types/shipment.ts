export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ShipmentStatus = 'in-transit' | 'at-port' | 'customs' | 'quality-hold' | 'delivered' | 'delayed';

export type TransportMode = 'ocean' | 'air' | 'rail' | 'truck';

export interface Location {
  city: string;
  country: string;
  port?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  origin: Location;
  destination: Location;
  currentLocation: Location;
  status: ShipmentStatus;
  riskLevel: RiskLevel;
  eta: Date;
  originalEta: Date;
  transportMode: TransportMode;
  cargo: {
    description: string;
    weight: number;
    value: number;
    units: number;
  };
  carrier: string;
  customer: string;
  alerts: Alert[];
  timeline: TimelineEvent[];
}

export interface Alert {
  id: string;
  type: 'port-congestion' | 'customs-delay' | 'quality-hold' | 'weather' | 'carrier-issue' | 'documentation';
  severity: RiskLevel;
  title: string;
  description: string;
  timestamp: Date;
  shipmentId: string;
  resolved: boolean;
  mitigationOptions?: MitigationOption[];
}

export interface MitigationOption {
  id: string;
  type: 're-route' | 'mode-switch' | 'expedite' | 'hold' | 'split-shipment';
  title: string;
  description: string;
  estimatedCost: number;
  estimatedDelay: number;
  successProbability: number;
  impact: {
    etaChange: number;
    costChange: number;
    riskReduction: RiskLevel;
  };
}

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  event: string;
  location: string;
  type: 'milestone' | 'alert' | 'action' | 'update';
}

export interface StakeholderMessage {
  id: string;
  timestamp: Date;
  from: string;
  to: string[];
  subject: string;
  content: string;
  priority: 'normal' | 'high' | 'urgent';
  shipmentIds: string[];
  status: 'sent' | 'delivered' | 'read';
}

export interface DashboardMetrics {
  totalShipments: number;
  activeAlerts: number;
  avgRiskScore: number;
  onTimeDelivery: number;
  shipmentsAtRisk: number;
  mitigationsExecuted: number;
  costSavings: number;
  delaysPrevented: number;
}
