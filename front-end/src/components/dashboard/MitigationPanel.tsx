import React, { Component } from 'react';
import { Alert, MitigationOption, RiskLevel } from '../../types/shipment';
import {
  Zap,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  Check,
  X,
  ArrowRight,
  Loader2,
  RefreshCw,
  Split,
  Pause,
  Route,
} from 'lucide-react';

interface MitigationPanelProps {
  selectedAlert: Alert | null;
  onExecuteMitigation: (alertId: string, mitigationId: string) => void;
}

interface MitigationPanelState {
  simulationRunning: boolean;
  selectedMitigation: string | null;
  executingMitigation: string | null;
}

class MitigationPanel extends Component<MitigationPanelProps, MitigationPanelState> {
  constructor(props: MitigationPanelProps) {
    super(props);
    this.state = {
      simulationRunning: false,
      selectedMitigation: null,
      executingMitigation: null,
    };
  }

  getMitigationIcon(type: MitigationOption['type']): React.ReactNode {
    const iconClass = 'w-5 h-5';
    switch (type) {
      case 're-route':
        return <Route className={iconClass} />;
      case 'mode-switch':
        return <RefreshCw className={iconClass} />;
      case 'expedite':
        return <Zap className={iconClass} />;
      case 'hold':
        return <Pause className={iconClass} />;
      case 'split-shipment':
        return <Split className={iconClass} />;
      default:
        return <Zap className={iconClass} />;
    }
  }

  getRiskReductionColor(risk: RiskLevel): string {
    switch (risk) {
      case 'low':
        return 'text-risk-low';
      case 'medium':
        return 'text-risk-medium';
      case 'high':
        return 'text-risk-high';
      case 'critical':
        return 'text-risk-critical';
      default:
        return 'text-muted-foreground';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatHours(hours: number): string {
    if (hours > 0) {
      return `+${hours}h`;
    } else {
      return `${hours}h`;
    }
  }

  handleSelectMitigation = (mitigationId: string): void => {
    this.setState((prev) => ({
      selectedMitigation: prev.selectedMitigation === mitigationId ? null : mitigationId,
    }));
  };

  handleRunSimulation = (): void => {
    this.setState({ simulationRunning: true });
    setTimeout(() => {
      this.setState({ simulationRunning: false });
    }, 2000);
  };

  handleExecute = (mitigationId: string): void => {
    const { selectedAlert, onExecuteMitigation } = this.props;
    if (!selectedAlert) return;

    this.setState({ executingMitigation: mitigationId });
    setTimeout(() => {
      onExecuteMitigation(selectedAlert.id, mitigationId);
      this.setState({ executingMitigation: null, selectedMitigation: null });
    }, 1500);
  };

  render(): React.ReactNode {
    const { selectedAlert } = this.props;
    const { simulationRunning, selectedMitigation, executingMitigation } = this.state;

    if (!selectedAlert) {
      return (
        <div className="glass-card h-full flex flex-col">
          <div className="panel-header px-5 pt-5">
            <h2 className="panel-title flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Mitigation Simulator
            </h2>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center text-muted-foreground">
              <Target className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Select an alert to view mitigation options</p>
            </div>
          </div>
        </div>
      );
    }

    const mitigations = selectedAlert.mitigationOptions || [];

    return (
      <div className="glass-card h-full flex flex-col">
        <div className="panel-header px-5 pt-5">
          <h2 className="panel-title flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Mitigation Simulator
          </h2>
          <button
            onClick={this.handleRunSimulation}
            disabled={simulationRunning}
            className="action-btn action-btn-secondary flex items-center gap-2"
          >
            {simulationRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Run Simulation
              </>
            )}
          </button>
        </div>

        {/* Alert Context */}
        <div className="px-5 py-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Alert Context
            </span>
          </div>
          <h3 className="font-semibold text-foreground mb-1">{selectedAlert.title}</h3>
          <p className="text-xs text-muted-foreground">{selectedAlert.description}</p>
        </div>

        {/* Mitigation Options */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
          {mitigations.length > 0 ? (
            mitigations.map((mitigation, index) => (
              <div
                key={mitigation.id}
                className={`border rounded-lg overflow-hidden transition-all animate-fade-in ${
                  selectedMitigation === mitigation.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Option Header */}
                <div
                  onClick={() => this.handleSelectMitigation(mitigation.id)}
                  className="p-4 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-secondary text-primary">
                      {this.getMitigationIcon(mitigation.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm text-foreground">
                          {mitigation.title}
                        </h4>
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-mono text-risk-low">
                            {mitigation.successProbability}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {mitigation.description}
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-mono text-foreground">
                        {this.formatCurrency(mitigation.estimatedCost)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className={`text-xs font-mono ${
                        mitigation.impact.etaChange < 0 ? 'text-risk-low' : 'text-risk-high'
                      }`}>
                        {this.formatHours(mitigation.impact.etaChange)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className={`text-xs font-mono ${this.getRiskReductionColor(mitigation.impact.riskReduction)}`}>
                        → {mitigation.impact.riskReduction}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Actions */}
                {selectedMitigation === mitigation.id && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => this.handleExecute(mitigation.id)}
                        disabled={executingMitigation === mitigation.id}
                        className="flex-1 action-btn action-btn-primary flex items-center justify-center gap-2"
                      >
                        {executingMitigation === mitigation.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Execute Mitigation
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => this.handleSelectMitigation(mitigation.id)}
                        className="action-btn action-btn-secondary"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Target className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No mitigation options available</p>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default MitigationPanel;
