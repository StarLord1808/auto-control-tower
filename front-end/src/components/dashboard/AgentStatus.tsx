import React, { Component } from 'react';
import {
  Brain,
  Activity,
  Cpu,
  Zap,
  Shield,
  Eye,
  Clock,
  CheckCircle2,
  TimerReset,
  Ship,
  TriangleAlert,
} from 'lucide-react';

interface AgentStatusProps {
  isActive: boolean;
}

interface AgentStatusState {
  actionsToday: number;
  alertsProcessed: number;
  mitigationsExecuted: number;
  uptime: string;
}

class AgentStatus extends Component<AgentStatusProps, AgentStatusState> {
  private uptimeInterval: NodeJS.Timeout | null = null;

  constructor(props: AgentStatusProps) {
    super(props);
    this.state = {
      actionsToday: 47,
      alertsProcessed: 156,
      mitigationsExecuted: 12,
      uptime: '99.97%',
      localData: null,
    };
  }

  componentDidMount(): void {
    // Simulate real-time updates
    this.uptimeInterval = setInterval(() => {
      this.setState((prev) => ({
        actionsToday: prev.actionsToday + Math.floor(Math.random() * 2),
        alertsProcessed: prev.alertsProcessed + Math.floor(Math.random() * 3),
      }));
    }, 30000);
    this.setState({localData : this.props.data});
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data && this.props.data) {
      this.setState({ localData: this.props.data });
    }
  }

  componentWillUnmount(): void {
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
    }
  }

  formatTitle(key: string) {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  render(): React.ReactNode {
    const { isActive } = this.props;
    const { actionsToday, alertsProcessed, mitigationsExecuted, uptime, localData } = this.state;
    console.log("LocalData", localData);
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl border border-solid border-primary bg-transparent flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              {isActive && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-risk-low rounded-full border-2 border-background flex items-center justify-center">
                  <div className="w-2 h-2 bg-background rounded-full animate-pulse" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Supply Chain AI Agent</h3>
              <div className="flex items-center gap-2">
                <span
                  className={`status-dot ${isActive ? 'status-active' : 'bg-muted-foreground'}`}
                />
                <span className="text-xs text-muted-foreground">
                  {isActive ? 'Active & Monitoring' : 'Standby'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-risk-low" />
            <span className="text-xs font-mono text-risk-low">{uptime} uptime</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {localData?.financials && Object.entries(localData.financials).map (([key, value],index) => (
            <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              {index === 0 ? <Ship className="w-6 h-6 text-primary" /> : <TriangleAlert className="w-6 h-6 text-primary" />}
            </div>
            <p className="text-lg font-mono font-bold text-foreground my-3">₹{value}</p>
            <p className="text-xs text-muted-foreground">{this.formatTitle(key)}</p>
          </div>
          ))}
          {localData?.data_freshness && Object.entries(localData.data_freshness).map (([key, value],index) => (
            <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              {index === 0 ? <Clock className="w-6 h-6 text-primary" /> : <TimerReset className="w-6 h-6 text-primary" />}
            </div>
            <p className="text-lg font-mono font-bold text-foreground my-3">{value}</p>
            <p className="text-xs text-muted-foreground">{this.formatTitle(key)}</p>
          </div>
          ))}
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          {/* <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <p className="text-lg font-mono font-bold text-foreground">{actionsToday}</p>
            <p className="text-xs text-muted-foreground">Actions Today</p>
          </div>

          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Eye className="w-4 h-4 text-risk-medium" />
            </div>
            <p className="text-lg font-mono font-bold text-foreground">{alertsProcessed}</p>
            <p className="text-xs text-muted-foreground">Alerts Processed</p>
          </div> */}

          {/* <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-4 h-4 text-risk-high" />
            </div>
            <p className="text-lg font-mono font-bold text-foreground">{mitigationsExecuted}</p>
            <p className="text-xs text-muted-foreground">Mitigations</p>
          </div>

          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="w-4 h-4 text-risk-low" />
            </div>
            <p className="text-lg font-mono font-bold text-foreground">94%</p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div> */}
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Cpu className="w-3 h-3" />
            <span>Current task:</span>
            <span className="text-foreground font-medium animate-pulse">
              Analyzing port congestion patterns at Port of LA...
            </span>
          </div>
        </div>
      </div>
    );
  }
}

export default AgentStatus;
