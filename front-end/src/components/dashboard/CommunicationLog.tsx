import React, { Component } from 'react';
import { StakeholderMessage } from '../../types/shipment';
import {
  MessageSquare,
  Send,
  Users,
  Clock,
  Mail,
  CheckCircle,
  Circle,
  Eye,
  AlertCircle,
} from 'lucide-react';

interface CommunicationLogProps {
  messages: StakeholderMessage[];
  onSendMessage: (message: Partial<StakeholderMessage>) => void;
}

interface CommunicationLogState {
  newMessage: string;
  selectedRecipients: string[];
  isComposing: boolean;
}

class CommunicationLog extends Component<CommunicationLogProps, CommunicationLogState> {
  constructor(props: CommunicationLogProps) {
    super(props);
    this.state = {
      newMessage: '',
      selectedRecipients: [],
      isComposing: false,
    };
  }

  getPriorityStyles(priority: StakeholderMessage['priority']): {
    badge: string;
    icon: React.ReactNode;
  } {
    switch (priority) {
      case 'urgent':
        return {
          badge: 'bg-risk-critical/20 text-risk-critical',
          icon: <AlertCircle className="w-3 h-3" />,
        };
      case 'high':
        return {
          badge: 'bg-risk-high/20 text-risk-high',
          icon: <AlertCircle className="w-3 h-3" />,
        };
      default:
        return {
          badge: 'bg-muted text-muted-foreground',
          icon: <Mail className="w-3 h-3" />,
        };
    }
  }

  getStatusIcon(status: StakeholderMessage['status']): React.ReactNode {
    switch (status) {
      case 'read':
        return <CheckCircle className="w-3 h-3 text-risk-low" />;
      case 'delivered':
        return <CheckCircle className="w-3 h-3 text-muted-foreground" />;
      case 'sent':
        return <Circle className="w-3 h-3 text-muted-foreground" />;
      default:
        return null;
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

  handleToggleCompose = (): void => {
    this.setState((prev) => ({ isComposing: !prev.isComposing }));
  };

  handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    this.setState({ newMessage: e.target.value });
  };

  handleSend = (): void => {
    const { onSendMessage } = this.props;
    const { newMessage, selectedRecipients } = this.state;

    if (!newMessage.trim()) return;

    onSendMessage({
      content: newMessage,
      to: selectedRecipients.length > 0 ? selectedRecipients : ['All Stakeholders'],
      priority: 'normal',
      timestamp: new Date(),
    });

    this.setState({
      newMessage: '',
      selectedRecipients: [],
      isComposing: false,
    });
  };

  render(): React.ReactNode {
    const { messages } = this.props;
    const { newMessage, isComposing } = this.state;

    return (
      <div className="glass-card h-full flex flex-col">
        <div className="panel-header px-5 pt-5">
          <h2 className="panel-title flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Stakeholder Communications
          </h2>
          <button
            onClick={this.handleToggleCompose}
            className="action-btn action-btn-primary flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Compose
          </button>
        </div>

        {/* Compose Area */}
        {isComposing && (
          <div className="px-5 py-4 border-b border-border/50 bg-muted/20 animate-fade-in">
            <textarea
              value={newMessage}
              onChange={this.handleMessageChange}
              placeholder="Type your message to stakeholders..."
              className="w-full h-24 bg-background border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Recipients: All affected stakeholders</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={this.handleToggleCompose}
                  className="action-btn action-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={this.handleSend}
                  disabled={!newMessage.trim()}
                  className="action-btn action-btn-primary flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
          {messages.map((message, index) => {
            const priorityStyles = this.getPriorityStyles(message.priority);
            return (
              <div
                key={message.id}
                className="p-4 bg-muted/20 rounded-lg border border-border/50 hover:border-border transition-colors animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${priorityStyles.badge}`}>
                      {priorityStyles.icon}
                      {message.priority}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {this.formatTimeAgo(message.timestamp)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {this.getStatusIcon(message.status)}
                    <span className="text-xs text-muted-foreground capitalize">
                      {message.status}
                    </span>
                  </div>
                </div>

                <h4 className="font-semibold text-sm text-foreground mb-1">
                  {message.subject}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {message.content}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">To:</span>
                    <div className="flex flex-wrap gap-1">
                      {message.to.slice(0, 2).map((recipient, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-secondary rounded text-xs text-foreground"
                        >
                          {recipient}
                        </span>
                      ))}
                      {message.to.length > 2 && (
                        <span className="px-2 py-0.5 bg-secondary rounded text-xs text-muted-foreground">
                          +{message.to.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                  {message.shipmentIds.length > 0 && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {message.shipmentIds.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No messages yet</p>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default CommunicationLog;
