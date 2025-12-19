import React, { Component } from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

interface MetricCardState {
  isHovered: boolean;
}

class MetricCard extends Component<MetricCardProps, MetricCardState> {
  constructor(props: MetricCardProps) {
    super(props);
    this.state = {
      isHovered: false,
    };
  }

  getVariantStyles(): string {
    const { variant = 'default' } = this.props;
    switch (variant) {
      case 'success':
        return 'border-risk-low/30 hover:border-risk-low/50';
      case 'warning':
        return 'border-risk-medium/30 hover:border-risk-medium/50';
      case 'danger':
        return 'border-risk-critical/30 hover:border-risk-critical/50';
      default:
        return 'border-border hover:border-primary/50';
    }
  }

  getIconStyles(): string {
    const { variant = 'default' } = this.props;
    switch (variant) {
      case 'success':
        return 'text-risk-low';
      case 'warning':
        return 'text-risk-medium';
      case 'danger':
        return 'text-risk-critical';
      default:
        return 'text-primary';
    }
  }

  handleMouseEnter = (): void => {
    this.setState({ isHovered: true });
  };

  handleMouseLeave = (): void => {
    this.setState({ isHovered: false });
  };

  render(): React.ReactNode {
    const { title, value, subtitle, icon: Icon, trend } = this.props;
    const { isHovered } = this.state;

    return (
      <div
        className={`glass-card p-5 transition-all duration-300 h-full ${this.getVariantStyles()} ${
          isHovered ? 'transform scale-[1.02]' : ''
        }`}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="metric-label mb-2">{title}</p>
            <p className="metric-value">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center mt-2 text-xs font-medium ${
                trend.direction === 'up' ? 'text-risk-low' : 'text-risk-critical'
              }`}>
                <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
                <span className="ml-1">{trend.value}%</span>
                <span className="text-muted-foreground ml-1">vs last week</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-secondary/50 ${this.getIconStyles()}`}>
            <Icon size={24} />
          </div>
        </div>
      </div>
    );
  }
}

export default MetricCard;
