import React, { Component } from 'react';
import { Shipment } from '../../types/shipment';
import {
  X,
  MapPin,
  Clock,
  Package,
  DollarSign,
  Truck,
  User,
  Calendar,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Activity,
} from 'lucide-react';

interface ShipmentDetailProps {
  shipment: Shipment;
  onClose: () => void;
}

interface ShipmentDetailState {
  activeTab: 'overview' | 'timeline' | 'cargo';
}

class ShipmentDetail extends Component<ShipmentDetailProps, ShipmentDetailState> {
  constructor(props: ShipmentDetailProps) {
    super(props);
    this.state = {
      activeTab: 'overview',
    };
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  getTimelineIcon(type: string): React.ReactNode {
    const iconClass = 'w-4 h-4';
    switch (type) {
      case 'milestone':
        return <CheckCircle className={`${iconClass} text-risk-low`} />;
      case 'alert':
        return <AlertTriangle className={`${iconClass} text-risk-high`} />;
      case 'action':
        return <Activity className={`${iconClass} text-primary`} />;
      default:
        return <Clock className={`${iconClass} text-muted-foreground`} />;
    }
  }

  handleTabChange = (tab: ShipmentDetailState['activeTab']): void => {
    this.setState({ activeTab: tab });
  };

  render(): React.ReactNode {
    const { shipment, onClose } = this.props;
    const { activeTab } = this.state;

    const tabs = [
      { id: 'overview' as const, label: 'Overview' },
      { id: 'timeline' as const, label: 'Timeline' },
      { id: 'cargo' as const, label: 'Cargo' },
    ];

    return (
      <div className="glass-card h-full flex flex-col animate-slide-in">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground font-mono">
                {shipment.trackingNumber}
              </h2>
              <p className="text-sm text-muted-foreground">{shipment.carrier}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Route Display */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {shipment.origin.city}, {shipment.origin.country}
                </span>
              </div>
              {shipment.origin.port && (
                <p className="text-xs text-muted-foreground ml-6">
                  {shipment.origin.port}
                </p>
              )}
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">
                  {shipment.destination.city}, {shipment.destination.country}
                </span>
                <MapPin className="w-4 h-4 text-risk-low" />
              </div>
              {shipment.destination.port && (
                <p className="text-xs text-muted-foreground mr-6">
                  {shipment.destination.port}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => this.handleTabChange(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      ETA
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {this.formatDate(shipment.eta)}
                  </p>
                  {shipment.eta > shipment.originalEta && (
                    <p className="text-xs text-risk-high mt-1">
                      Delayed from {this.formatDate(shipment.originalEta)}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      Status
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {shipment.status.replace('-', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    at {shipment.currentLocation.city}
                  </p>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      Customer
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {shipment.customer}
                  </p>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      Mode
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {shipment.transportMode}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {shipment.timeline.map((event, index) => (
                <div
                  key={event.id}
                  className="flex gap-4 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col items-center">
                    <div className="p-2 bg-muted rounded-full">
                      {this.getTimelineIcon(event.type)}
                    </div>
                    {index < shipment.timeline.length - 1 && (
                      <div className="w-px h-full bg-border mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-medium text-foreground">
                      {event.event}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {this.formatDate(event.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'cargo' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Cargo Details
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Description</span>
                    <span className="text-sm text-foreground">
                      {shipment.cargo.description}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Weight</span>
                    <span className="text-sm font-mono text-foreground">
                      {shipment.cargo.weight.toLocaleString()} kg
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Units</span>
                    <span className="text-sm font-mono text-foreground">
                      {shipment.cargo.units}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">Declared Value</span>
                    <span className="text-sm font-mono font-semibold text-foreground">
                      {this.formatCurrency(shipment.cargo.value)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default ShipmentDetail;
