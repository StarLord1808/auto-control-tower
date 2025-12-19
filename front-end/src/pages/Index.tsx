import React, { Component } from 'react';
import Header from '../components/layout/Header';
import MetricCard from '../components/dashboard/MetricCard';
import ShipmentTable from '../components/dashboard/ShipmentTable';
import AlertsPanel from '../components/dashboard/AlertsPanel';
import MitigationPanel from '../components/dashboard/MitigationPanel';
import CommunicationLog from '../components/dashboard/CommunicationLog';
import AgentStatus from '../components/dashboard/AgentStatus';
import ShipmentDetail from '../components/dashboard/ShipmentDetail';
import {
  mockShipments,
  mockAlerts,
  mockMessages,
  mockMetrics,
} from '../data/mockData';
import { Shipment, Alert, StakeholderMessage, DashboardMetrics } from '../types/shipment';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Clock,
  Shield,
  DollarSign,
  Zap,
  Activity,
  Ship,
  OctagonAlert,
  Ban,
  Hourglass,
  X,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

const SHIPMENT_ICON_MAP = {
  delayed_shipments: Ship,
  high_priority_delayed: OctagonAlert,
  high_risk_shipments: Ban,
  high_value_at_risk: AlertTriangle,
  on_time_shipments: Clock,
  shipments_at_risk: AlertTriangle,
  total_active_shipments: Hourglass,
}

interface IndexState {
  shipments: Shipment[];
  alerts: Alert[];
  messages: StakeholderMessage[];
  metrics: DashboardMetrics;
  selectedShipment: Shipment | null;
  selectedAlert: Alert | null;
  agentActive: boolean;
}

class Index extends Component<object, IndexState> {
  constructor(props: object) {
    super(props);
    this.state = {
      shipments: mockShipments,
      alerts: mockAlerts,
      messages: mockMessages,
      metrics: mockMetrics,
      selectedShipment: null,
      selectedAlert: null,
      agentActive: true,
      data: null,
      tbldata: null,
      error: null,
      showChatbot: false,
      inputValue: "",
      chatQuery: "",
      chatResponse: null,
      loading: false,
      placeholder: true,
    };
  }

  componentDidMount() {
    fetch("http://127.0.0.1:8081/api/dashboard/overview", {
      method: "GET",
      headers: {
        "X-Auth-Key": "1234567890ABCDEF",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("API Error");
        return res.json();
      })
      .then((data) => {
        // console.log("API Response:", data);
        // console.log("API Response:", data.data_freshness);
        this.setState({
          data,        // or dashboardData: data
          loading: false,
        });
      })
      .catch((err) => {
        console.error(err);
        this.setState({
          error: err.message,
          loading: false,
        });
      });

    fetch("http://127.0.0.1:8081/api/shipments?limit=40", {
      method: "GET",
      headers: {
        "X-Auth-Key": "1234567890ABCDEF",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("API Error");
        return res.json();
      })
      .then((tbldata) => {
        // console.log("Table Response:", tbldata);
        // console.log("Table Response:", tbldata.data_freshness);
        this.setState({
          tbldata,        // or dashboardData: data
          loading: false,
        });
      })
      .catch((err) => {
        console.error(err);
        this.setState({
          error: err.message,
          loading: false,
        });
      });

    // fetch("http://127.0.0.1:8081/api/chatbot/query", {
    //   method: "POST",
    //   headers: {
    //     "X-Auth-Key": "1234567890ABCDEF",
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ question: "hello" }),
    // })
    //   .then((res) => {
    //     console.log("Status:", res.status);
    //     console.log("Headers:", [...res.headers.entries()]);
    //     return res.text(); // ⬅ IMPORTANT: read as text first
    //   })
    //   .then((text) => {
    //     console.log("Response chat:", text);
    //     this.setState({ chatResponse: text });
    //   })
    //   .catch((err) => {
    //     console.error("Fetch Error:", err);
    //   });



  }

  handleSend = async () => {
  const { inputValue } = this.state;

  // safety check
  if (!inputValue || !inputValue.trim()) return;

  // 1️⃣ Clear old response & set new query
  this.setState({
    loading: true,
    chatQuery: inputValue,   // show this query
    chatResponse: null,      // 🔴 clear old response
    inputValue: "",         // 🔴 clear input box
    placeholder: false,      // 🔴 clear placeholder
  });

  try {
    const res = await fetch("http://127.0.0.1:8081/api/chatbot/query", {
      method: "POST",
      headers: {
        "X-Auth-Key": "1234567890ABCDEF",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: inputValue }),
    });

    if (!res.ok) {
      throw new Error("API Error: " + res.status);
    }

    const data = await res.json();

    // 2️⃣ Set ONLY new response
    this.setState({
      chatResponse: data,
      loading: false,
    });

  } catch (err) {
    console.error("Chat API Error:", err);
    this.setState({ loading: false });
  }
};





  handleSelectShipment = (shipment: Shipment): void => {
    this.setState({ selectedShipment: shipment });
  };

  handleCloseShipmentDetail = (): void => {
    this.setState({ selectedShipment: null });
  };

  handleSelectAlert = (alert: Alert): void => {
    this.setState({ selectedAlert: alert });
  };

  handleExecuteMitigation = (alertId: string, mitigationId: string): void => {
    const { alerts } = this.state;
    const alert = alerts.find((a) => a.id === alertId);
    const mitigation = alert?.mitigationOptions?.find((m) => m.id === mitigationId);

    if (alert && mitigation) {
      toast.success(`Mitigation Executed: ${mitigation.title}`, {
        description: `Applied to alert: ${alert.title}`,
      });

      // Update alert as resolved
      this.setState((prev) => ({
        alerts: prev.alerts.map((a) =>
          a.id === alertId ? { ...a, resolved: true } : a
        ),
        selectedAlert: null,
      }));
    }
  };

  handleSendMessage = (message: Partial<StakeholderMessage>): void => {
    const newMessage: StakeholderMessage = {
      id: `MSG-${Date.now()}`,
      timestamp: new Date(),
      from: 'Supply Chain AI Agent',
      to: message.to || ['All Stakeholders'],
      subject: message.subject || 'Agent Communication',
      content: message.content || '',
      priority: message.priority || 'normal',
      shipmentIds: message.shipmentIds || [],
      status: 'sent',
    };

    this.setState((prev) => ({
      messages: [newMessage, ...prev.messages],
    }));

    toast.success('Message Sent', {
      description: `Delivered to ${newMessage.to.join(', ')}`,
    });
  };

  formatTitle(key: string) {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  showChatBotBox = () => {
    this.setState({ showChatbot: true });
  }

  hideChatBotBox = () => {
    this.setState({ showChatbot: false });
  }

  handleInputChange = (e) => {
    this.setState({ inputValue: e.target.value });
  }

  renderResponse() {
    const res = this.state.chatResponse;
    if (!res) return null;

    // TEXT
    if (res.answer_type === "description") {
      return (
        <p className="text-sm text-white">
          {res.value}
        </p>
      );
    }

    // TABLE
    if (res.answer_type === "table") {
      const columns = Object.keys(res.value[0]); // get keys dynamically

      return (
        <>
          <p className="text-sm text-white mb-4">
            {res.starting_context}
          </p>
          <div className={`overflow-auto scrollbar-thin h-full max-h-[500px] relative mb-4`}>
            <table className="data-table">
              <thead>
                <tr className="bg-[#0d1320]">
                  {columns.map((col) => (
                    <th key={col} className="!text-sm !py-2 !px-3 sticky top-0 text-white z-10 bg-[#0d1320] whitespace-nowrap">
                      {col.replace(/_/g, " ").toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {res.value.map((row, rowIndex) => (
                  <tr key={rowIndex} className='cursor-pointer transition-colors animate-fade-in bg-secondary/10'>
                    {columns.map((col) => (
                      <td key={col} className="!text-sm !py-2 !px-3 text-white/75 whitespace-nowrap !border-b !border-white/10">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-white mb-4">
            {res.ending_context}
          </p>
        </>
      );
    }


    // CHART (for now show raw data)
    if (res.answer_type === "chart") {
      return (
        <pre className="text-xs bg-gray-100 p-2 rounded">
          {JSON.stringify(res.value, null, 2)}
        </pre>
      );
    }

    return (
      <p className="text-sm text-white">
        {res}
      </p>
    );
  }


  render(): React.ReactNode {
    const {
      shipments,
      alerts,
      messages,
      metrics,
      selectedShipment,
      selectedAlert,
      agentActive,
    } = this.state;


    const activeAlerts = alerts.filter((a) => !a.resolved);
    console.log("aaaaaaaa")
    return (
      <div className="min-h-screen bg-background">
        <Header alertCount={activeAlerts.length} />

        <main className="p-6">
          {/* Agent Status */}
          <div className="mb-6 animate-fade-in">
            <AgentStatus isActive={agentActive} data={this.state.data} />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {this.state.data?.shipment_health &&
              Object.entries(this.state.data.shipment_health).map(([key, value], index) => {
                const Icon = SHIPMENT_ICON_MAP[key] || Package; // ✅ allowed here

                return (
                  <div
                    key={key}
                    className="animate-fade-in animation-delay-100"
                  >
                    <MetricCard
                      title={this.formatTitle(key)}
                      value={value}
                      subtitle="Currently tracked"
                      icon={Icon}
                    />
                  </div>
                );
              })}
            {/* <div className="animate-fade-in animation-delay-100">
              <MetricCard
                title="Total Shipments"
                value={metrics.totalShipments}
                subtitle="Currently tracked"
                icon={Package}
                trend={{ value: 12, direction: 'up' }}
              />
            </div> */}
            {/* <div className="animate-fade-in animation-delay-100">
              <MetricCard
                title="Total Shipments"
                value={metrics.totalShipments}
                subtitle="Currently tracked"
                icon={Package}
                trend={{ value: 12, direction: 'up' }}
              />
            </div>
            <div className="animate-fade-in animation-delay-200">
              <MetricCard
                title="Active Alerts"
                value={activeAlerts.length}
                subtitle={`${alerts.filter((a) => a.severity === 'critical').length} critical`}
                icon={AlertTriangle}
                variant="danger"
              />
            </div>
            <div className="animate-fade-in animation-delay-300">
              <MetricCard
                title="On-Time Delivery"
                value={`${metrics.onTimeDelivery}%`}
                subtitle="Last 30 days"
                icon={Clock}
                trend={{ value: 3.2, direction: 'up' }}
                variant="success"
              />
            </div>
            <div className="animate-fade-in animation-delay-400">
              <MetricCard
                title="Cost Savings"
                value={`$${(metrics.costSavings / 1000000).toFixed(1)}M`}
                subtitle="YTD from mitigations"
                icon={DollarSign}
                trend={{ value: 18, direction: 'up' }}
                variant="success"
              />
            </div> */}
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 hidden">
            <div className="animate-fade-in">
              <MetricCard
                title="Shipments at Risk"
                value={metrics.shipmentsAtRisk}
                icon={Shield}
                variant="warning"
              />
            </div>
            <div className="animate-fade-in animation-delay-100">
              <MetricCard
                title="Avg Risk Score"
                value={metrics.avgRiskScore}
                subtitle="0-100 scale"
                icon={Activity}
              />
            </div>
            <div className="animate-fade-in animation-delay-200">
              <MetricCard
                title="Mitigations Executed"
                value={metrics.mitigationsExecuted}
                subtitle="This month"
                icon={Zap}
              />
            </div>
            <div className="animate-fade-in animation-delay-300">
              <MetricCard
                title="Delays Prevented"
                value={metrics.delaysPrevented}
                subtitle="Avg 18h saved"
                icon={TrendingUp}
                variant="success"
              />
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Shipments Table or Detail View */}
            <div className="lg:col-span-12 animate-fade-in">
              {selectedShipment ? (
                <ShipmentDetail
                  shipment={selectedShipment}
                  onClose={this.handleCloseShipmentDetail}
                />
              ) : (
                <ShipmentTable
                  tbldata={this.state.tbldata}
                  onSelectShipment={this.handleSelectShipment}
                  selectedShipmentId={selectedShipment?.id}
                />
              )}
            </div>

            {/* Alerts Panel */}
            <div className="lg:col-span-5 h-[500px] animate-fade-in animation-delay-100 hidden">
              <AlertsPanel
                alerts={alerts}
                onSelectAlert={this.handleSelectAlert}
                selectedAlertId={selectedAlert?.id}
              />
            </div>

            {/* Mitigation Panel */}
            <div className="lg:col-span-6 h-[450px] animate-fade-in animation-delay-200 hidden">
              <MitigationPanel
                selectedAlert={selectedAlert}
                onExecuteMitigation={this.handleExecuteMitigation}
              />
            </div>

            {/* Communication Log */}
            <div className="lg:col-span-12 h-[450px] animate-fade-in animation-delay-300 hidden">
              <CommunicationLog
                messages={messages}
                onSendMessage={this.handleSendMessage}
              />
            </div>

            {/* Chat Bot */}
            <div className="fixed bottom-6 right-6 flex flex-col items-end">

              {/* Chat Box */}
              {this.state.showChatbot && (
                <div className="mb-2 w-[500px] h-[650px] bg-[#0d1320] rounded-[12px]  flex flex-col overflow-hidden shadow-[0_0_16px_rgba(255,255,255,0.25)" style={{boxShadow: '0 0 16px rgba(255,255,255,0.1)'}}>

                  {/* Header */}
                  <div className="bg-primary text-white p-4 font-semibold flex items-center justify-between">
                    <div className='flex items-center'>
                      <i className='me-2 w-8 h-8 rounded-lg bg-primary flex items-center justify-center'>
                          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.0013 1.66406C6.9173 1.66406 1.16797 7.4134 1.16797 14.4974C1.16797 21.5814 6.9173 27.3307 14.0013 27.3307C21.0853 27.3307 26.8346 21.5814 26.8346 14.4974C26.8346 7.4134 21.0853 1.66406 14.0013 1.66406ZM25.654 13.2911L22.9461 11.0837L24.3578 9.0304C25.0508 10.3266 25.4871 11.7639 25.654 13.2911ZM10.8315 12.7777C10.716 13.1371 10.5748 13.4964 10.408 13.8686C9.81763 15.2289 9.0733 16.3711 8.29047 17.3079C8.2263 16.9999 8.17497 16.6919 8.12364 16.3711C7.7643 13.9199 7.94397 11.6997 8.35464 9.81323C8.79097 9.9544 9.25297 10.1084 9.7278 10.3009L10.8315 12.7906V12.7777ZM10.4465 10.5832C10.7288 10.6987 11.024 10.8399 11.3191 10.9811C11.255 11.3276 11.1651 11.6741 11.0625 12.0334L10.4465 10.5832ZM11.0496 14.1381C11.1138 13.9969 11.1908 13.8557 11.2421 13.7017L13.3981 18.5784C12.2688 20.0414 11.1395 21.2734 10.0743 22.3257C9.43263 21.1066 8.82947 19.6564 8.44447 17.9881C9.3813 16.9614 10.3053 15.6909 11.0496 14.1381ZM11.5116 13.0601C11.7426 12.4826 11.9095 11.9179 12.0506 11.3532C12.6281 11.6484 13.2056 11.9949 13.796 12.3671C13.8858 13.1114 14.0655 13.8942 14.335 14.6899C14.5275 15.2674 14.7585 15.8064 15.0151 16.3069C14.5788 16.9614 14.1553 17.5774 13.7061 18.1677L11.5116 13.0601ZM15.9648 12.2387C15.4643 11.8922 14.9638 11.5842 14.4633 11.3019C14.3735 9.23573 14.8226 7.40056 15.3488 5.9889L18.7111 8.92773C18.2491 10.1854 17.6716 11.5457 16.953 12.9446C16.6321 12.7136 16.3113 12.4697 15.9648 12.2387ZM16.2728 14.2279C16.0675 14.6129 15.8365 14.9979 15.6055 15.3829C15.5541 15.4599 15.5028 15.5497 15.4515 15.6267C15.336 15.3444 15.2205 15.0621 15.1306 14.7669C14.9253 14.1509 14.7713 13.5477 14.6686 12.9702C14.7456 13.0216 14.8226 13.0729 14.8996 13.1371C15.3873 13.4964 15.8493 13.8686 16.2856 14.2407L16.2728 14.2279ZM15.7466 17.6031C16.0418 18.0651 16.3626 18.5014 16.7091 18.8864L15.0921 21.3889L14.2708 19.4767C14.7585 18.8864 15.259 18.2576 15.7466 17.5902V17.6031ZM16.1445 17.0512C16.4525 16.6149 16.7605 16.1529 17.0685 15.6909C17.1711 15.5369 17.261 15.3829 17.3508 15.2289C17.723 15.5882 18.0695 15.9476 18.3903 16.3069L17.0428 18.3859C16.722 17.9752 16.4268 17.5261 16.1445 17.0512ZM18.1336 13.9071C18.8908 12.5852 19.5196 11.3019 20.033 10.0956L21.5473 11.4302L19.2758 14.9466C18.9293 14.6001 18.5443 14.2536 18.1465 13.9071H18.1336ZM22.2788 12.0719L25.0123 14.4717C24.0498 15.0492 22.7151 16.0117 21.5858 17.5517C21.0981 16.9101 20.5335 16.2299 19.879 15.5497L22.2788 12.0591V12.0719ZM21.5088 6.00173C21.5601 5.86056 21.5858 5.73223 21.6243 5.6039C22.3173 6.1814 22.9333 6.84873 23.4595 7.58023C23.5621 7.7214 23.6648 7.86256 23.7546 7.9909L22.1761 10.4292L20.4693 9.0304C20.8928 7.93956 21.2393 6.9129 21.5088 5.9889V6.00173ZM18.7753 3.80723C19.2116 3.99973 19.6223 4.2179 20.033 4.46173C20.0073 4.5644 19.9816 4.66706 19.9688 4.7569C19.7506 5.69373 19.4683 6.74606 19.0705 7.90106L15.6953 5.15473C16.1573 4.12806 16.6193 3.4094 16.8118 3.11423C17.492 3.28106 18.1465 3.49923 18.7753 3.7944V3.80723ZM14.0013 2.78056C14.6815 2.78056 15.3616 2.84473 16.0033 2.96023C15.8108 3.2554 15.4515 3.8329 15.0665 4.6414L12.8463 2.8319C13.2313 2.7934 13.6035 2.78056 14.0013 2.78056ZM11.9351 2.97306L14.7328 5.43706C14.1553 6.8359 13.642 8.70956 13.6805 10.8656C13.2185 10.6217 12.7565 10.4036 12.3073 10.1982C12.8976 6.8359 12.2046 3.96123 11.9351 2.9859V2.97306ZM10.9085 3.6404C11.2036 4.57723 11.8453 6.92573 11.4988 9.8389C10.947 9.6079 10.3951 9.4154 9.86897 9.23573L9.06047 7.34923C9.6893 5.59106 10.5235 4.24356 10.9085 3.62756V3.6404ZM8.79097 8.15773L9.17597 9.0304C8.97063 8.96623 8.77814 8.9149 8.58564 8.86356C8.6498 8.61973 8.7268 8.38873 8.79097 8.15773ZM8.36747 4.23073C8.27764 4.42323 8.16214 4.6799 8.0338 4.9879L7.8413 4.55156C8.00813 4.43606 8.1878 4.3334 8.36747 4.24356V4.23073ZM7.32797 4.8724L7.71297 5.7579C7.44347 6.4894 7.1483 7.4134 6.90447 8.47856C6.39114 8.3759 5.90347 8.2989 5.46714 8.23473C5.46714 7.5674 5.4158 7.00273 5.35164 6.59206C5.94197 5.9504 6.59647 5.3729 7.31514 4.8724H7.32797ZM5.00514 11.1864C5.24897 10.4292 5.3773 9.7234 5.44147 9.0689C5.8393 9.1459 6.27564 9.23573 6.75047 9.35123C6.31414 11.6997 6.19864 14.6257 7.01997 17.8341C7.0713 18.0522 7.13547 18.2704 7.19964 18.4886C6.62214 19.0404 6.0703 19.5024 5.55697 19.8617L3.0673 14.6257C3.7603 13.8172 4.5303 12.6751 5.01797 11.1736L5.00514 11.1864ZM4.73564 7.3364C4.7613 7.58023 4.78697 7.84973 4.78697 8.15773C4.58164 8.13206 4.3763 8.11923 4.19664 8.1064C4.36347 7.8369 4.54314 7.58023 4.74847 7.3364H4.73564ZM3.74747 8.82506C4.04264 8.85073 4.3763 8.90206 4.7613 8.9534C4.7228 9.63356 4.59447 10.4036 4.35064 11.2249C3.96564 12.4697 3.40097 13.4707 2.86197 14.2279L2.36147 13.1756C2.5283 11.6099 3.01597 10.1341 3.74747 8.82506ZM2.2973 14.7541L2.36147 14.8696C2.36147 14.8696 2.32297 14.9081 2.31014 14.9337C2.31014 14.8696 2.31014 14.8182 2.31014 14.7541H2.2973ZM2.32297 15.3829C2.38714 15.3316 2.4513 15.2674 2.51547 15.1904L5.0693 20.1826C4.70997 20.4264 4.38914 20.6189 4.11964 20.7729C3.1058 19.1944 2.47697 17.3592 2.32297 15.3957V15.3829ZM4.3763 21.1707C4.6458 21.0296 4.9538 20.8371 5.3003 20.6189L6.94297 23.8401C5.9548 23.0957 5.09497 22.1846 4.38914 21.1707H4.3763ZM7.67447 24.3534L5.74947 20.3109C6.24997 19.9644 6.78897 19.5537 7.35364 19.0532C7.85414 20.6189 8.52147 21.9792 9.21447 23.1471C8.70114 23.6219 8.21347 24.0326 7.7643 24.4176C7.73864 24.4176 7.71297 24.3919 7.67447 24.3662V24.3534ZM8.67547 24.9309C9.02197 24.6486 9.39414 24.3534 9.77914 24.0197C10.254 24.7256 10.7288 25.3416 11.178 25.8549C10.3053 25.6367 9.47114 25.3287 8.6883 24.9181L8.67547 24.9309ZM10.6261 23.2754C11.6785 22.3129 12.8206 21.1836 13.9628 19.8489L14.8355 21.7996L12.333 25.6624C11.8196 25.0464 11.2165 24.2507 10.6261 23.2754ZM14.0013 26.2142C13.5778 26.2142 13.1543 26.1886 12.7308 26.1501C12.6923 26.1501 12.6538 26.1501 12.6153 26.1372L12.6538 26.0731L15.1178 22.4926L16.6321 25.9191C15.7851 26.1116 14.8996 26.2142 13.9885 26.2142H14.0013ZM19.3015 24.9437C18.57 25.3159 17.8 25.6111 17.0043 25.8164L15.4001 22.0947L17.2225 19.4511C18.0566 20.3237 18.9293 21.0039 19.6993 21.5172C19.34 22.8776 19.2886 24.0967 19.3143 24.9437H19.3015ZM17.5305 18.9891L18.9293 16.9357C19.571 17.7057 20.11 18.4629 20.572 19.1816C20.2383 19.8361 19.9816 20.4777 19.802 21.0937C19.0576 20.5419 18.262 19.8489 17.5305 19.0019V18.9891ZM20.0843 24.5074C20.1228 23.8914 20.2255 23.0187 20.5078 22.0177C21.3548 22.5054 21.9965 22.7492 22.2146 22.8391C21.573 23.4679 20.8543 24.0326 20.0715 24.4946L20.0843 24.5074ZM22.4071 22.6466C22.4071 22.6466 22.3943 22.6081 22.3815 22.5824C21.9451 22.3899 21.3291 22.0819 20.6233 21.6456C20.7773 21.1836 20.9698 20.7087 21.2136 20.2211C21.7398 21.1451 22.1248 21.9536 22.3815 22.5824C22.4071 22.5824 22.42 22.5952 22.4328 22.6081C22.4328 22.6209 22.42 22.6337 22.4071 22.6466ZM22.2788 18.5142C23.4595 16.9742 24.807 16.0887 25.654 15.6267C25.4743 17.5774 24.807 19.3997 23.7675 20.9654C23.4081 20.2981 22.9205 19.4511 22.2788 18.5142Z" fill="white" />
                          </svg>
                        </i>
                      <h6 className='m-0'>Analytical Assistant</h6>
                    </div>
                    <button className='p-2 w-10 h-10 flex items-center justify-center rounded-full bg-secondary/10 text-primary' onClick={this.hideChatBotBox}>
                      <X className="text-white w-5 h-5" />
                    </button>
                  </div>

                  {/* Messages Container */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {/* Example messages */}
                    {
                      this.state.placeholder === true ?
                      <div className='flex items-center justify-center w-full h-full'>
                      <div className='text-center max-w-[85%]'>
                        <i className='w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-4'>
                          <svg width="40" height="40" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.0013 1.66406C6.9173 1.66406 1.16797 7.4134 1.16797 14.4974C1.16797 21.5814 6.9173 27.3307 14.0013 27.3307C21.0853 27.3307 26.8346 21.5814 26.8346 14.4974C26.8346 7.4134 21.0853 1.66406 14.0013 1.66406ZM25.654 13.2911L22.9461 11.0837L24.3578 9.0304C25.0508 10.3266 25.4871 11.7639 25.654 13.2911ZM10.8315 12.7777C10.716 13.1371 10.5748 13.4964 10.408 13.8686C9.81763 15.2289 9.0733 16.3711 8.29047 17.3079C8.2263 16.9999 8.17497 16.6919 8.12364 16.3711C7.7643 13.9199 7.94397 11.6997 8.35464 9.81323C8.79097 9.9544 9.25297 10.1084 9.7278 10.3009L10.8315 12.7906V12.7777ZM10.4465 10.5832C10.7288 10.6987 11.024 10.8399 11.3191 10.9811C11.255 11.3276 11.1651 11.6741 11.0625 12.0334L10.4465 10.5832ZM11.0496 14.1381C11.1138 13.9969 11.1908 13.8557 11.2421 13.7017L13.3981 18.5784C12.2688 20.0414 11.1395 21.2734 10.0743 22.3257C9.43263 21.1066 8.82947 19.6564 8.44447 17.9881C9.3813 16.9614 10.3053 15.6909 11.0496 14.1381ZM11.5116 13.0601C11.7426 12.4826 11.9095 11.9179 12.0506 11.3532C12.6281 11.6484 13.2056 11.9949 13.796 12.3671C13.8858 13.1114 14.0655 13.8942 14.335 14.6899C14.5275 15.2674 14.7585 15.8064 15.0151 16.3069C14.5788 16.9614 14.1553 17.5774 13.7061 18.1677L11.5116 13.0601ZM15.9648 12.2387C15.4643 11.8922 14.9638 11.5842 14.4633 11.3019C14.3735 9.23573 14.8226 7.40056 15.3488 5.9889L18.7111 8.92773C18.2491 10.1854 17.6716 11.5457 16.953 12.9446C16.6321 12.7136 16.3113 12.4697 15.9648 12.2387ZM16.2728 14.2279C16.0675 14.6129 15.8365 14.9979 15.6055 15.3829C15.5541 15.4599 15.5028 15.5497 15.4515 15.6267C15.336 15.3444 15.2205 15.0621 15.1306 14.7669C14.9253 14.1509 14.7713 13.5477 14.6686 12.9702C14.7456 13.0216 14.8226 13.0729 14.8996 13.1371C15.3873 13.4964 15.8493 13.8686 16.2856 14.2407L16.2728 14.2279ZM15.7466 17.6031C16.0418 18.0651 16.3626 18.5014 16.7091 18.8864L15.0921 21.3889L14.2708 19.4767C14.7585 18.8864 15.259 18.2576 15.7466 17.5902V17.6031ZM16.1445 17.0512C16.4525 16.6149 16.7605 16.1529 17.0685 15.6909C17.1711 15.5369 17.261 15.3829 17.3508 15.2289C17.723 15.5882 18.0695 15.9476 18.3903 16.3069L17.0428 18.3859C16.722 17.9752 16.4268 17.5261 16.1445 17.0512ZM18.1336 13.9071C18.8908 12.5852 19.5196 11.3019 20.033 10.0956L21.5473 11.4302L19.2758 14.9466C18.9293 14.6001 18.5443 14.2536 18.1465 13.9071H18.1336ZM22.2788 12.0719L25.0123 14.4717C24.0498 15.0492 22.7151 16.0117 21.5858 17.5517C21.0981 16.9101 20.5335 16.2299 19.879 15.5497L22.2788 12.0591V12.0719ZM21.5088 6.00173C21.5601 5.86056 21.5858 5.73223 21.6243 5.6039C22.3173 6.1814 22.9333 6.84873 23.4595 7.58023C23.5621 7.7214 23.6648 7.86256 23.7546 7.9909L22.1761 10.4292L20.4693 9.0304C20.8928 7.93956 21.2393 6.9129 21.5088 5.9889V6.00173ZM18.7753 3.80723C19.2116 3.99973 19.6223 4.2179 20.033 4.46173C20.0073 4.5644 19.9816 4.66706 19.9688 4.7569C19.7506 5.69373 19.4683 6.74606 19.0705 7.90106L15.6953 5.15473C16.1573 4.12806 16.6193 3.4094 16.8118 3.11423C17.492 3.28106 18.1465 3.49923 18.7753 3.7944V3.80723ZM14.0013 2.78056C14.6815 2.78056 15.3616 2.84473 16.0033 2.96023C15.8108 3.2554 15.4515 3.8329 15.0665 4.6414L12.8463 2.8319C13.2313 2.7934 13.6035 2.78056 14.0013 2.78056ZM11.9351 2.97306L14.7328 5.43706C14.1553 6.8359 13.642 8.70956 13.6805 10.8656C13.2185 10.6217 12.7565 10.4036 12.3073 10.1982C12.8976 6.8359 12.2046 3.96123 11.9351 2.9859V2.97306ZM10.9085 3.6404C11.2036 4.57723 11.8453 6.92573 11.4988 9.8389C10.947 9.6079 10.3951 9.4154 9.86897 9.23573L9.06047 7.34923C9.6893 5.59106 10.5235 4.24356 10.9085 3.62756V3.6404ZM8.79097 8.15773L9.17597 9.0304C8.97063 8.96623 8.77814 8.9149 8.58564 8.86356C8.6498 8.61973 8.7268 8.38873 8.79097 8.15773ZM8.36747 4.23073C8.27764 4.42323 8.16214 4.6799 8.0338 4.9879L7.8413 4.55156C8.00813 4.43606 8.1878 4.3334 8.36747 4.24356V4.23073ZM7.32797 4.8724L7.71297 5.7579C7.44347 6.4894 7.1483 7.4134 6.90447 8.47856C6.39114 8.3759 5.90347 8.2989 5.46714 8.23473C5.46714 7.5674 5.4158 7.00273 5.35164 6.59206C5.94197 5.9504 6.59647 5.3729 7.31514 4.8724H7.32797ZM5.00514 11.1864C5.24897 10.4292 5.3773 9.7234 5.44147 9.0689C5.8393 9.1459 6.27564 9.23573 6.75047 9.35123C6.31414 11.6997 6.19864 14.6257 7.01997 17.8341C7.0713 18.0522 7.13547 18.2704 7.19964 18.4886C6.62214 19.0404 6.0703 19.5024 5.55697 19.8617L3.0673 14.6257C3.7603 13.8172 4.5303 12.6751 5.01797 11.1736L5.00514 11.1864ZM4.73564 7.3364C4.7613 7.58023 4.78697 7.84973 4.78697 8.15773C4.58164 8.13206 4.3763 8.11923 4.19664 8.1064C4.36347 7.8369 4.54314 7.58023 4.74847 7.3364H4.73564ZM3.74747 8.82506C4.04264 8.85073 4.3763 8.90206 4.7613 8.9534C4.7228 9.63356 4.59447 10.4036 4.35064 11.2249C3.96564 12.4697 3.40097 13.4707 2.86197 14.2279L2.36147 13.1756C2.5283 11.6099 3.01597 10.1341 3.74747 8.82506ZM2.2973 14.7541L2.36147 14.8696C2.36147 14.8696 2.32297 14.9081 2.31014 14.9337C2.31014 14.8696 2.31014 14.8182 2.31014 14.7541H2.2973ZM2.32297 15.3829C2.38714 15.3316 2.4513 15.2674 2.51547 15.1904L5.0693 20.1826C4.70997 20.4264 4.38914 20.6189 4.11964 20.7729C3.1058 19.1944 2.47697 17.3592 2.32297 15.3957V15.3829ZM4.3763 21.1707C4.6458 21.0296 4.9538 20.8371 5.3003 20.6189L6.94297 23.8401C5.9548 23.0957 5.09497 22.1846 4.38914 21.1707H4.3763ZM7.67447 24.3534L5.74947 20.3109C6.24997 19.9644 6.78897 19.5537 7.35364 19.0532C7.85414 20.6189 8.52147 21.9792 9.21447 23.1471C8.70114 23.6219 8.21347 24.0326 7.7643 24.4176C7.73864 24.4176 7.71297 24.3919 7.67447 24.3662V24.3534ZM8.67547 24.9309C9.02197 24.6486 9.39414 24.3534 9.77914 24.0197C10.254 24.7256 10.7288 25.3416 11.178 25.8549C10.3053 25.6367 9.47114 25.3287 8.6883 24.9181L8.67547 24.9309ZM10.6261 23.2754C11.6785 22.3129 12.8206 21.1836 13.9628 19.8489L14.8355 21.7996L12.333 25.6624C11.8196 25.0464 11.2165 24.2507 10.6261 23.2754ZM14.0013 26.2142C13.5778 26.2142 13.1543 26.1886 12.7308 26.1501C12.6923 26.1501 12.6538 26.1501 12.6153 26.1372L12.6538 26.0731L15.1178 22.4926L16.6321 25.9191C15.7851 26.1116 14.8996 26.2142 13.9885 26.2142H14.0013ZM19.3015 24.9437C18.57 25.3159 17.8 25.6111 17.0043 25.8164L15.4001 22.0947L17.2225 19.4511C18.0566 20.3237 18.9293 21.0039 19.6993 21.5172C19.34 22.8776 19.2886 24.0967 19.3143 24.9437H19.3015ZM17.5305 18.9891L18.9293 16.9357C19.571 17.7057 20.11 18.4629 20.572 19.1816C20.2383 19.8361 19.9816 20.4777 19.802 21.0937C19.0576 20.5419 18.262 19.8489 17.5305 19.0019V18.9891ZM20.0843 24.5074C20.1228 23.8914 20.2255 23.0187 20.5078 22.0177C21.3548 22.5054 21.9965 22.7492 22.2146 22.8391C21.573 23.4679 20.8543 24.0326 20.0715 24.4946L20.0843 24.5074ZM22.4071 22.6466C22.4071 22.6466 22.3943 22.6081 22.3815 22.5824C21.9451 22.3899 21.3291 22.0819 20.6233 21.6456C20.7773 21.1836 20.9698 20.7087 21.2136 20.2211C21.7398 21.1451 22.1248 21.9536 22.3815 22.5824C22.4071 22.5824 22.42 22.5952 22.4328 22.6081C22.4328 22.6209 22.42 22.6337 22.4071 22.6466ZM22.2788 18.5142C23.4595 16.9742 24.807 16.0887 25.654 15.6267C25.4743 17.5774 24.807 19.3997 23.7675 20.9654C23.4081 20.2981 22.9205 19.4511 22.2788 18.5142Z" fill="white" />
                          </svg>
                        </i>
                        <h6 className='mb-4 font-semibold text-white text-lg'>Analytical Assistant</h6>
                        <p className='text-white/65 text-base'>Watching your end-to-end shipments, surfacing risks, and generating actionable logistics insights. How can I support your supply chain today?</p>
                      </div>
                    </div>
                    : ' '
                    }
                    {this.state.chatQuery && (

                      <div className="flex items-start">
                        <i className='me-2 w-10 h-10 rounded-lg bg-primary flex items-center justify-center'>
                          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.0013 1.66406C6.9173 1.66406 1.16797 7.4134 1.16797 14.4974C1.16797 21.5814 6.9173 27.3307 14.0013 27.3307C21.0853 27.3307 26.8346 21.5814 26.8346 14.4974C26.8346 7.4134 21.0853 1.66406 14.0013 1.66406ZM25.654 13.2911L22.9461 11.0837L24.3578 9.0304C25.0508 10.3266 25.4871 11.7639 25.654 13.2911ZM10.8315 12.7777C10.716 13.1371 10.5748 13.4964 10.408 13.8686C9.81763 15.2289 9.0733 16.3711 8.29047 17.3079C8.2263 16.9999 8.17497 16.6919 8.12364 16.3711C7.7643 13.9199 7.94397 11.6997 8.35464 9.81323C8.79097 9.9544 9.25297 10.1084 9.7278 10.3009L10.8315 12.7906V12.7777ZM10.4465 10.5832C10.7288 10.6987 11.024 10.8399 11.3191 10.9811C11.255 11.3276 11.1651 11.6741 11.0625 12.0334L10.4465 10.5832ZM11.0496 14.1381C11.1138 13.9969 11.1908 13.8557 11.2421 13.7017L13.3981 18.5784C12.2688 20.0414 11.1395 21.2734 10.0743 22.3257C9.43263 21.1066 8.82947 19.6564 8.44447 17.9881C9.3813 16.9614 10.3053 15.6909 11.0496 14.1381ZM11.5116 13.0601C11.7426 12.4826 11.9095 11.9179 12.0506 11.3532C12.6281 11.6484 13.2056 11.9949 13.796 12.3671C13.8858 13.1114 14.0655 13.8942 14.335 14.6899C14.5275 15.2674 14.7585 15.8064 15.0151 16.3069C14.5788 16.9614 14.1553 17.5774 13.7061 18.1677L11.5116 13.0601ZM15.9648 12.2387C15.4643 11.8922 14.9638 11.5842 14.4633 11.3019C14.3735 9.23573 14.8226 7.40056 15.3488 5.9889L18.7111 8.92773C18.2491 10.1854 17.6716 11.5457 16.953 12.9446C16.6321 12.7136 16.3113 12.4697 15.9648 12.2387ZM16.2728 14.2279C16.0675 14.6129 15.8365 14.9979 15.6055 15.3829C15.5541 15.4599 15.5028 15.5497 15.4515 15.6267C15.336 15.3444 15.2205 15.0621 15.1306 14.7669C14.9253 14.1509 14.7713 13.5477 14.6686 12.9702C14.7456 13.0216 14.8226 13.0729 14.8996 13.1371C15.3873 13.4964 15.8493 13.8686 16.2856 14.2407L16.2728 14.2279ZM15.7466 17.6031C16.0418 18.0651 16.3626 18.5014 16.7091 18.8864L15.0921 21.3889L14.2708 19.4767C14.7585 18.8864 15.259 18.2576 15.7466 17.5902V17.6031ZM16.1445 17.0512C16.4525 16.6149 16.7605 16.1529 17.0685 15.6909C17.1711 15.5369 17.261 15.3829 17.3508 15.2289C17.723 15.5882 18.0695 15.9476 18.3903 16.3069L17.0428 18.3859C16.722 17.9752 16.4268 17.5261 16.1445 17.0512ZM18.1336 13.9071C18.8908 12.5852 19.5196 11.3019 20.033 10.0956L21.5473 11.4302L19.2758 14.9466C18.9293 14.6001 18.5443 14.2536 18.1465 13.9071H18.1336ZM22.2788 12.0719L25.0123 14.4717C24.0498 15.0492 22.7151 16.0117 21.5858 17.5517C21.0981 16.9101 20.5335 16.2299 19.879 15.5497L22.2788 12.0591V12.0719ZM21.5088 6.00173C21.5601 5.86056 21.5858 5.73223 21.6243 5.6039C22.3173 6.1814 22.9333 6.84873 23.4595 7.58023C23.5621 7.7214 23.6648 7.86256 23.7546 7.9909L22.1761 10.4292L20.4693 9.0304C20.8928 7.93956 21.2393 6.9129 21.5088 5.9889V6.00173ZM18.7753 3.80723C19.2116 3.99973 19.6223 4.2179 20.033 4.46173C20.0073 4.5644 19.9816 4.66706 19.9688 4.7569C19.7506 5.69373 19.4683 6.74606 19.0705 7.90106L15.6953 5.15473C16.1573 4.12806 16.6193 3.4094 16.8118 3.11423C17.492 3.28106 18.1465 3.49923 18.7753 3.7944V3.80723ZM14.0013 2.78056C14.6815 2.78056 15.3616 2.84473 16.0033 2.96023C15.8108 3.2554 15.4515 3.8329 15.0665 4.6414L12.8463 2.8319C13.2313 2.7934 13.6035 2.78056 14.0013 2.78056ZM11.9351 2.97306L14.7328 5.43706C14.1553 6.8359 13.642 8.70956 13.6805 10.8656C13.2185 10.6217 12.7565 10.4036 12.3073 10.1982C12.8976 6.8359 12.2046 3.96123 11.9351 2.9859V2.97306ZM10.9085 3.6404C11.2036 4.57723 11.8453 6.92573 11.4988 9.8389C10.947 9.6079 10.3951 9.4154 9.86897 9.23573L9.06047 7.34923C9.6893 5.59106 10.5235 4.24356 10.9085 3.62756V3.6404ZM8.79097 8.15773L9.17597 9.0304C8.97063 8.96623 8.77814 8.9149 8.58564 8.86356C8.6498 8.61973 8.7268 8.38873 8.79097 8.15773ZM8.36747 4.23073C8.27764 4.42323 8.16214 4.6799 8.0338 4.9879L7.8413 4.55156C8.00813 4.43606 8.1878 4.3334 8.36747 4.24356V4.23073ZM7.32797 4.8724L7.71297 5.7579C7.44347 6.4894 7.1483 7.4134 6.90447 8.47856C6.39114 8.3759 5.90347 8.2989 5.46714 8.23473C5.46714 7.5674 5.4158 7.00273 5.35164 6.59206C5.94197 5.9504 6.59647 5.3729 7.31514 4.8724H7.32797ZM5.00514 11.1864C5.24897 10.4292 5.3773 9.7234 5.44147 9.0689C5.8393 9.1459 6.27564 9.23573 6.75047 9.35123C6.31414 11.6997 6.19864 14.6257 7.01997 17.8341C7.0713 18.0522 7.13547 18.2704 7.19964 18.4886C6.62214 19.0404 6.0703 19.5024 5.55697 19.8617L3.0673 14.6257C3.7603 13.8172 4.5303 12.6751 5.01797 11.1736L5.00514 11.1864ZM4.73564 7.3364C4.7613 7.58023 4.78697 7.84973 4.78697 8.15773C4.58164 8.13206 4.3763 8.11923 4.19664 8.1064C4.36347 7.8369 4.54314 7.58023 4.74847 7.3364H4.73564ZM3.74747 8.82506C4.04264 8.85073 4.3763 8.90206 4.7613 8.9534C4.7228 9.63356 4.59447 10.4036 4.35064 11.2249C3.96564 12.4697 3.40097 13.4707 2.86197 14.2279L2.36147 13.1756C2.5283 11.6099 3.01597 10.1341 3.74747 8.82506ZM2.2973 14.7541L2.36147 14.8696C2.36147 14.8696 2.32297 14.9081 2.31014 14.9337C2.31014 14.8696 2.31014 14.8182 2.31014 14.7541H2.2973ZM2.32297 15.3829C2.38714 15.3316 2.4513 15.2674 2.51547 15.1904L5.0693 20.1826C4.70997 20.4264 4.38914 20.6189 4.11964 20.7729C3.1058 19.1944 2.47697 17.3592 2.32297 15.3957V15.3829ZM4.3763 21.1707C4.6458 21.0296 4.9538 20.8371 5.3003 20.6189L6.94297 23.8401C5.9548 23.0957 5.09497 22.1846 4.38914 21.1707H4.3763ZM7.67447 24.3534L5.74947 20.3109C6.24997 19.9644 6.78897 19.5537 7.35364 19.0532C7.85414 20.6189 8.52147 21.9792 9.21447 23.1471C8.70114 23.6219 8.21347 24.0326 7.7643 24.4176C7.73864 24.4176 7.71297 24.3919 7.67447 24.3662V24.3534ZM8.67547 24.9309C9.02197 24.6486 9.39414 24.3534 9.77914 24.0197C10.254 24.7256 10.7288 25.3416 11.178 25.8549C10.3053 25.6367 9.47114 25.3287 8.6883 24.9181L8.67547 24.9309ZM10.6261 23.2754C11.6785 22.3129 12.8206 21.1836 13.9628 19.8489L14.8355 21.7996L12.333 25.6624C11.8196 25.0464 11.2165 24.2507 10.6261 23.2754ZM14.0013 26.2142C13.5778 26.2142 13.1543 26.1886 12.7308 26.1501C12.6923 26.1501 12.6538 26.1501 12.6153 26.1372L12.6538 26.0731L15.1178 22.4926L16.6321 25.9191C15.7851 26.1116 14.8996 26.2142 13.9885 26.2142H14.0013ZM19.3015 24.9437C18.57 25.3159 17.8 25.6111 17.0043 25.8164L15.4001 22.0947L17.2225 19.4511C18.0566 20.3237 18.9293 21.0039 19.6993 21.5172C19.34 22.8776 19.2886 24.0967 19.3143 24.9437H19.3015ZM17.5305 18.9891L18.9293 16.9357C19.571 17.7057 20.11 18.4629 20.572 19.1816C20.2383 19.8361 19.9816 20.4777 19.802 21.0937C19.0576 20.5419 18.262 19.8489 17.5305 19.0019V18.9891ZM20.0843 24.5074C20.1228 23.8914 20.2255 23.0187 20.5078 22.0177C21.3548 22.5054 21.9965 22.7492 22.2146 22.8391C21.573 23.4679 20.8543 24.0326 20.0715 24.4946L20.0843 24.5074ZM22.4071 22.6466C22.4071 22.6466 22.3943 22.6081 22.3815 22.5824C21.9451 22.3899 21.3291 22.0819 20.6233 21.6456C20.7773 21.1836 20.9698 20.7087 21.2136 20.2211C21.7398 21.1451 22.1248 21.9536 22.3815 22.5824C22.4071 22.5824 22.42 22.5952 22.4328 22.6081C22.4328 22.6209 22.42 22.6337 22.4071 22.6466ZM22.2788 18.5142C23.4595 16.9742 24.807 16.0887 25.654 15.6267C25.4743 17.5774 24.807 19.3997 23.7675 20.9654C23.4081 20.2981 22.9205 19.4511 22.2788 18.5142Z" fill="white" />
                          </svg>
                        </i>
                        <div className="bg-[#141c2b] text-white/75 px-4 py-3 rounded">{this.state.chatQuery}</div>
                      </div>
                    )}

                    {this.state.chatResponse && (
                      <div className="flex items-start justify-end">
                        <div className="bg-[#0e1c34] text-white px-4 py-3 rounded self-end w-[90%]">
                          {this.renderResponse()}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Input & Send Button */}
                  <div className="p-4 border-t border-[#1d2839] flex items-center gap-2">
                    <div className='p-2 border border-[#1d2839] rounded w-full flex items-center gap-2'>
                      <input
                        type="text"
                        onChange={this.handleInputChange}
                        placeholder="Type your query..."
                        className="flex-1 p-2 bg-[#0d1320] text-white/75  focus:outline-none"
                      />
                      <button
                        onClick={this.handleSend}
                        disabled={this.state.loading}
                        className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-60"
                      >
                        {this.state.loading && (
                          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        )}
                        {this.state.loading ? '' : <Send className="w-5 h-5" />}
                      </button>

                    </div>
                  </div>

                </div>
              )}
              {/* Floating Chat Button */}
              <button className="p-2 w-12 h-12 flex items-center justify-center rounded-full bg-primary text-white shadow-[0_0_12px_rgba(255,255,255,0.5)]" onClick={this.showChatBotBox}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.0013 1.66406C6.9173 1.66406 1.16797 7.4134 1.16797 14.4974C1.16797 21.5814 6.9173 27.3307 14.0013 27.3307C21.0853 27.3307 26.8346 21.5814 26.8346 14.4974C26.8346 7.4134 21.0853 1.66406 14.0013 1.66406ZM25.654 13.2911L22.9461 11.0837L24.3578 9.0304C25.0508 10.3266 25.4871 11.7639 25.654 13.2911ZM10.8315 12.7777C10.716 13.1371 10.5748 13.4964 10.408 13.8686C9.81763 15.2289 9.0733 16.3711 8.29047 17.3079C8.2263 16.9999 8.17497 16.6919 8.12364 16.3711C7.7643 13.9199 7.94397 11.6997 8.35464 9.81323C8.79097 9.9544 9.25297 10.1084 9.7278 10.3009L10.8315 12.7906V12.7777ZM10.4465 10.5832C10.7288 10.6987 11.024 10.8399 11.3191 10.9811C11.255 11.3276 11.1651 11.6741 11.0625 12.0334L10.4465 10.5832ZM11.0496 14.1381C11.1138 13.9969 11.1908 13.8557 11.2421 13.7017L13.3981 18.5784C12.2688 20.0414 11.1395 21.2734 10.0743 22.3257C9.43263 21.1066 8.82947 19.6564 8.44447 17.9881C9.3813 16.9614 10.3053 15.6909 11.0496 14.1381ZM11.5116 13.0601C11.7426 12.4826 11.9095 11.9179 12.0506 11.3532C12.6281 11.6484 13.2056 11.9949 13.796 12.3671C13.8858 13.1114 14.0655 13.8942 14.335 14.6899C14.5275 15.2674 14.7585 15.8064 15.0151 16.3069C14.5788 16.9614 14.1553 17.5774 13.7061 18.1677L11.5116 13.0601ZM15.9648 12.2387C15.4643 11.8922 14.9638 11.5842 14.4633 11.3019C14.3735 9.23573 14.8226 7.40056 15.3488 5.9889L18.7111 8.92773C18.2491 10.1854 17.6716 11.5457 16.953 12.9446C16.6321 12.7136 16.3113 12.4697 15.9648 12.2387ZM16.2728 14.2279C16.0675 14.6129 15.8365 14.9979 15.6055 15.3829C15.5541 15.4599 15.5028 15.5497 15.4515 15.6267C15.336 15.3444 15.2205 15.0621 15.1306 14.7669C14.9253 14.1509 14.7713 13.5477 14.6686 12.9702C14.7456 13.0216 14.8226 13.0729 14.8996 13.1371C15.3873 13.4964 15.8493 13.8686 16.2856 14.2407L16.2728 14.2279ZM15.7466 17.6031C16.0418 18.0651 16.3626 18.5014 16.7091 18.8864L15.0921 21.3889L14.2708 19.4767C14.7585 18.8864 15.259 18.2576 15.7466 17.5902V17.6031ZM16.1445 17.0512C16.4525 16.6149 16.7605 16.1529 17.0685 15.6909C17.1711 15.5369 17.261 15.3829 17.3508 15.2289C17.723 15.5882 18.0695 15.9476 18.3903 16.3069L17.0428 18.3859C16.722 17.9752 16.4268 17.5261 16.1445 17.0512ZM18.1336 13.9071C18.8908 12.5852 19.5196 11.3019 20.033 10.0956L21.5473 11.4302L19.2758 14.9466C18.9293 14.6001 18.5443 14.2536 18.1465 13.9071H18.1336ZM22.2788 12.0719L25.0123 14.4717C24.0498 15.0492 22.7151 16.0117 21.5858 17.5517C21.0981 16.9101 20.5335 16.2299 19.879 15.5497L22.2788 12.0591V12.0719ZM21.5088 6.00173C21.5601 5.86056 21.5858 5.73223 21.6243 5.6039C22.3173 6.1814 22.9333 6.84873 23.4595 7.58023C23.5621 7.7214 23.6648 7.86256 23.7546 7.9909L22.1761 10.4292L20.4693 9.0304C20.8928 7.93956 21.2393 6.9129 21.5088 5.9889V6.00173ZM18.7753 3.80723C19.2116 3.99973 19.6223 4.2179 20.033 4.46173C20.0073 4.5644 19.9816 4.66706 19.9688 4.7569C19.7506 5.69373 19.4683 6.74606 19.0705 7.90106L15.6953 5.15473C16.1573 4.12806 16.6193 3.4094 16.8118 3.11423C17.492 3.28106 18.1465 3.49923 18.7753 3.7944V3.80723ZM14.0013 2.78056C14.6815 2.78056 15.3616 2.84473 16.0033 2.96023C15.8108 3.2554 15.4515 3.8329 15.0665 4.6414L12.8463 2.8319C13.2313 2.7934 13.6035 2.78056 14.0013 2.78056ZM11.9351 2.97306L14.7328 5.43706C14.1553 6.8359 13.642 8.70956 13.6805 10.8656C13.2185 10.6217 12.7565 10.4036 12.3073 10.1982C12.8976 6.8359 12.2046 3.96123 11.9351 2.9859V2.97306ZM10.9085 3.6404C11.2036 4.57723 11.8453 6.92573 11.4988 9.8389C10.947 9.6079 10.3951 9.4154 9.86897 9.23573L9.06047 7.34923C9.6893 5.59106 10.5235 4.24356 10.9085 3.62756V3.6404ZM8.79097 8.15773L9.17597 9.0304C8.97063 8.96623 8.77814 8.9149 8.58564 8.86356C8.6498 8.61973 8.7268 8.38873 8.79097 8.15773ZM8.36747 4.23073C8.27764 4.42323 8.16214 4.6799 8.0338 4.9879L7.8413 4.55156C8.00813 4.43606 8.1878 4.3334 8.36747 4.24356V4.23073ZM7.32797 4.8724L7.71297 5.7579C7.44347 6.4894 7.1483 7.4134 6.90447 8.47856C6.39114 8.3759 5.90347 8.2989 5.46714 8.23473C5.46714 7.5674 5.4158 7.00273 5.35164 6.59206C5.94197 5.9504 6.59647 5.3729 7.31514 4.8724H7.32797ZM5.00514 11.1864C5.24897 10.4292 5.3773 9.7234 5.44147 9.0689C5.8393 9.1459 6.27564 9.23573 6.75047 9.35123C6.31414 11.6997 6.19864 14.6257 7.01997 17.8341C7.0713 18.0522 7.13547 18.2704 7.19964 18.4886C6.62214 19.0404 6.0703 19.5024 5.55697 19.8617L3.0673 14.6257C3.7603 13.8172 4.5303 12.6751 5.01797 11.1736L5.00514 11.1864ZM4.73564 7.3364C4.7613 7.58023 4.78697 7.84973 4.78697 8.15773C4.58164 8.13206 4.3763 8.11923 4.19664 8.1064C4.36347 7.8369 4.54314 7.58023 4.74847 7.3364H4.73564ZM3.74747 8.82506C4.04264 8.85073 4.3763 8.90206 4.7613 8.9534C4.7228 9.63356 4.59447 10.4036 4.35064 11.2249C3.96564 12.4697 3.40097 13.4707 2.86197 14.2279L2.36147 13.1756C2.5283 11.6099 3.01597 10.1341 3.74747 8.82506ZM2.2973 14.7541L2.36147 14.8696C2.36147 14.8696 2.32297 14.9081 2.31014 14.9337C2.31014 14.8696 2.31014 14.8182 2.31014 14.7541H2.2973ZM2.32297 15.3829C2.38714 15.3316 2.4513 15.2674 2.51547 15.1904L5.0693 20.1826C4.70997 20.4264 4.38914 20.6189 4.11964 20.7729C3.1058 19.1944 2.47697 17.3592 2.32297 15.3957V15.3829ZM4.3763 21.1707C4.6458 21.0296 4.9538 20.8371 5.3003 20.6189L6.94297 23.8401C5.9548 23.0957 5.09497 22.1846 4.38914 21.1707H4.3763ZM7.67447 24.3534L5.74947 20.3109C6.24997 19.9644 6.78897 19.5537 7.35364 19.0532C7.85414 20.6189 8.52147 21.9792 9.21447 23.1471C8.70114 23.6219 8.21347 24.0326 7.7643 24.4176C7.73864 24.4176 7.71297 24.3919 7.67447 24.3662V24.3534ZM8.67547 24.9309C9.02197 24.6486 9.39414 24.3534 9.77914 24.0197C10.254 24.7256 10.7288 25.3416 11.178 25.8549C10.3053 25.6367 9.47114 25.3287 8.6883 24.9181L8.67547 24.9309ZM10.6261 23.2754C11.6785 22.3129 12.8206 21.1836 13.9628 19.8489L14.8355 21.7996L12.333 25.6624C11.8196 25.0464 11.2165 24.2507 10.6261 23.2754ZM14.0013 26.2142C13.5778 26.2142 13.1543 26.1886 12.7308 26.1501C12.6923 26.1501 12.6538 26.1501 12.6153 26.1372L12.6538 26.0731L15.1178 22.4926L16.6321 25.9191C15.7851 26.1116 14.8996 26.2142 13.9885 26.2142H14.0013ZM19.3015 24.9437C18.57 25.3159 17.8 25.6111 17.0043 25.8164L15.4001 22.0947L17.2225 19.4511C18.0566 20.3237 18.9293 21.0039 19.6993 21.5172C19.34 22.8776 19.2886 24.0967 19.3143 24.9437H19.3015ZM17.5305 18.9891L18.9293 16.9357C19.571 17.7057 20.11 18.4629 20.572 19.1816C20.2383 19.8361 19.9816 20.4777 19.802 21.0937C19.0576 20.5419 18.262 19.8489 17.5305 19.0019V18.9891ZM20.0843 24.5074C20.1228 23.8914 20.2255 23.0187 20.5078 22.0177C21.3548 22.5054 21.9965 22.7492 22.2146 22.8391C21.573 23.4679 20.8543 24.0326 20.0715 24.4946L20.0843 24.5074ZM22.4071 22.6466C22.4071 22.6466 22.3943 22.6081 22.3815 22.5824C21.9451 22.3899 21.3291 22.0819 20.6233 21.6456C20.7773 21.1836 20.9698 20.7087 21.2136 20.2211C21.7398 21.1451 22.1248 21.9536 22.3815 22.5824C22.4071 22.5824 22.42 22.5952 22.4328 22.6081C22.4328 22.6209 22.42 22.6337 22.4071 22.6466ZM22.2788 18.5142C23.4595 16.9742 24.807 16.0887 25.654 15.6267C25.4743 17.5774 24.807 19.3997 23.7675 20.9654C23.4081 20.2981 22.9205 19.4511 22.2788 18.5142Z" fill="white" />
                </svg>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default Index;
