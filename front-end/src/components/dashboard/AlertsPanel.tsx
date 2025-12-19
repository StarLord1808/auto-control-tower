import React, { Component } from 'react';
import { Alert, RiskLevel } from '../../types/shipment';
import {
  AlertTriangle,
  Anchor,
  FileWarning,
  Thermometer,
  Cloud,
  Clock,
  ChevronRight,
} from 'lucide-react';

interface AlertsPanelProps {
  alerts: Alert[];
  onSelectAlert: (alert: Alert) => void;
  selectedAlertId?: string;
}

interface AlertsPanelState {
  filter: RiskLevel | 'all';
}

class AlertsPanel extends Component<AlertsPanelProps, AlertsPanelState> {
  constructor(props: AlertsPanelProps) {
    super(props);
    this.state = {
      filter: 'all',
    };
  }

  getAlertIcon(type: Alert['type']): React.ReactNode {
    const iconClass = 'w-5 h-5';
    switch (type) {
      case 'port-congestion':
        return <Anchor className={iconClass} />;
      case 'customs-delay':
        return <FileWarning className={iconClass} />;
      case 'quality-hold':
        return <Thermometer className={iconClass} />;
      case 'weather':
        return <Cloud className={iconClass} />;
      case 'carrier-issue':
      case 'documentation':
        return <AlertTriangle className={iconClass} />;
      default:
        return <AlertTriangle className={iconClass} />;
    }
  }

  getSeverityStyles(severity: RiskLevel): {
    bg: string;
    border: string;
    text: string;
    icon: string;
  } {
    switch (severity) {
      case 'low':
        return {
          bg: 'bg-risk-low/10',
          border: 'border-risk-low/30',
          text: 'text-risk-low',
          icon: 'text-risk-low',
        };
      case 'medium':
        return {
          bg: 'bg-risk-medium/10',
          border: 'border-risk-medium/30',
          text: 'text-risk-medium',
          icon: 'text-risk-medium',
        };
      case 'high':
        return {
          bg: 'bg-risk-high/10',
          border: 'border-risk-high/30',
          text: 'text-risk-high',
          icon: 'text-risk-high',
        };
      case 'critical':
        return {
          bg: 'bg-risk-critical/10',
          border: 'border-risk-critical/30',
          text: 'text-risk-critical',
          icon: 'text-risk-critical',
        };
      default:
        return {
          bg: 'bg-muted',
          border: 'border-border',
          text: 'text-foreground',
          icon: 'text-muted-foreground',
        };
    }
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours > 24) {
      return `${Math.floor(hours / 24)}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return `${minutes}m ago`;
    }
  }

  handleFilterChange = (filter: RiskLevel | 'all'): void => {
    this.setState({ filter });
  };

  getFilteredAlerts(): Alert[] {
    const { alerts } = this.props;
    const { filter } = this.state;

    if (filter === 'all') return alerts;
    return alerts.filter((alert) => alert.severity === filter);
  }

  render(): React.ReactNode {
    const { onSelectAlert, selectedAlertId } = this.props;
    const { filter } = this.state;
    const filteredAlerts = this.getFilteredAlerts();

    const filterOptions: Array<{ value: RiskLevel | 'all'; label: string }> = [
      { value: 'all', label: 'All' },
      { value: 'critical', label: 'Critical' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ];

    return (
      <div className="glass-card h-full flex flex-col">
        <div className="panel-header px-5 pt-5">
          <h2 className="panel-title flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-risk-high" />
            Active Alerts
          </h2>
          <span className="px-2 py-1 bg-risk-critical/20 text-risk-critical text-xs font-mono rounded-full">
            {filteredAlerts.filter((a) => !a.resolved).length} active
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 px-5 py-3 border-b border-border/50">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => this.handleFilterChange(option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
          {filteredAlerts.map((alert, index) => {
            const styles = this.getSeverityStyles(alert.severity);
            return (
              <div
                key={alert.id}
                onClick={() => onSelectAlert(alert)}
                className={`p-4 rounded-lg border cursor-pointer transition-all animate-slide-in ${
                  styles.bg
                } ${styles.border} ${
                  selectedAlertId === alert.id
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'hover:bg-opacity-20'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-background/50 ${styles.icon}`}>
                    {this.getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {alert.title}
                      </h3>
                      <span className={`risk-badge ${
                        alert.severity === 'critical' ? 'risk-critical' :
                        alert.severity === 'high' ? 'risk-high' :
                        alert.severity === 'medium' ? 'risk-medium' : 'risk-low'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {alert.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {this.formatTimeAgo(alert.timestamp)}
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {alert.shipmentId}
                      </span>
                    </div>
                    {alert.mitigationOptions && alert.mitigationOptions.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                        <span>{alert.mitigationOptions.length} mitigation options</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredAlerts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No alerts matching filter</p>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default AlertsPanel;
