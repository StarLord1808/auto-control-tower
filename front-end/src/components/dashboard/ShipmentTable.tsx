import React, { Component } from 'react';
import { Shipment, RiskLevel } from '../../types/shipment';
import { Ship, Plane, Train, Truck, ChevronRight, Eye, MoveRight, X } from 'lucide-react';

interface ShipmentTableProps {
  shipments: Shipment[];
  onSelectShipment: (shipment: Shipment) => void;
  selectedShipmentId?: string;
}

interface ShipmentTableState {
  sortField: keyof Shipment | null;
  sortDirection: 'asc' | 'desc';
}

class ShipmentTable extends Component<ShipmentTableProps, ShipmentTableState> {
  constructor(props: ShipmentTableProps) {
    super(props);
    this.state = {
      sortField: null,
      sortDirection: 'asc',
      tblmetadata: null,
    };
  }

  getRiskBadgeClass(risk: RiskLevel): string {
    switch (risk) {
      case 'LOW':
        return 'risk-badge risk-low';
      case 'MEDIUM':
        return 'risk-badge risk-medium';
      case 'HIGH':
        return 'risk-badge risk-high';
      case 'CRITICAL':
        return 'risk-badge risk-critical';
      default:
        return 'risk-badge';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'delivered':
        return 'status-dot status-active';
      case 'ON_TIME':
        return 'status-dot bg-primary';
      case 'at-port':
      case 'customs':
        return 'status-dot status-warning';
      case 'quality-hold':
      case 'DELAYED':
        return 'status-dot status-danger';
      default:
        return 'status-dot bg-muted-foreground';
    }
  }

  getModeIcon(mode: string): React.ReactNode {
    const iconClass = 'w-4 h-4 text-muted-foreground';
    switch (mode) {
      case 'ocean':
        return <Ship className={iconClass} />;
      case 'air':
        return <Plane className={iconClass} />;
      case 'rail':
        return <Train className={iconClass} />;
      case 'truck':
        return <Truck className={iconClass} />;
      default:
        return null;
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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

  handleShipmentClick = async (shipmentId) => {
    const url = `http://127.0.0.1:8081/api/shipments/${shipmentId}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Auth-Key": "1234567890ABCDEF",
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      this.setState({ tblmetadata: data }, () => { console.log("tttttt", data)});
      
    } catch (error) {
      console.error("API Error:", error);
    }
  };

  formatTitle(key: string) {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  handleTableClose =() =>{
    this.setState({ tblmetadata: null });
  }


  render(): React.ReactNode {
    const { tbldata, onSelectShipment, selectedShipmentId } = this.props;
    // console.log("Table Data in ShipmentTable:", tbldata);

    return (
      <div className="glass-card overflow-hidden">
        <div className="panel-header px-6 pt-5">
          <h2 className="panel-title">Active Shipments</h2>
          <span className="text-xs text-muted-foreground font-mono">
            {tbldata?.items?.length ?? 0} shipments
          </span>
        </div>
        <div className={`overflow-auto scrollbar-thin h-[500px] relative ${this.state.tblmetadata ? 'overflow-hidden' : ''}`}>
          <table className="data-table">
            <thead>
              <tr className="bg-muted/30">
                <th className='sticky top-0 z-10 bg-muted'>No</th>
                <th className='sticky top-0 z-10 bg-muted'>Shipment ID</th>
                <th className='sticky top-0 z-10 bg-muted'>Route</th>
                <th className='sticky top-0 z-10 bg-muted'>Current Status</th>
                <th className='sticky top-0 z-10 bg-muted'>Delay Hours</th>
                <th className='sticky top-0 z-10 bg-muted'>Priority</th>
                <th className='sticky top-0 z-10 bg-muted'>Transport Mode</th>
                <th className='sticky top-0 z-10 bg-muted'>Risk Probability</th>
                <th className='sticky top-0 z-10 bg-muted'>Action</th>
              </tr>
            </thead>
            <tbody>
              {tbldata?.items?.map((shipment, index) => (
                <tr
                  key={shipment.shipment_id}
                  className={`cursor-pointer transition-colors animate-fade-in ${selectedShipmentId === shipment.shipment_id
                    ? 'bg-primary/10 border-l-2 border-l-primary'
                    : ''
                    }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => this.handleShipmentClick(shipment.shipment_id)}
                >
                  <td className='h-full'>{index + 1}</td>
                  <td className='h-full'>{shipment.shipment_id}</td>

                  <td className='h-full'>
                    {shipment.origin} → {shipment.destination}
                    <div className="text-xs text-muted-foreground">
                      {shipment.customer}
                    </div>
                  </td>

                  <td className='flex items-center h-[61px]'>
                    <span className={this.getStatusDotClass(shipment.current_status)} />
                    <span className="text-danger capitalize text-foreground ml-2">
                      {shipment.current_status.replace('-', ' ')}
                    </span>
                  </td>

                  <td className='h-full'>{shipment.delay_hours ?? 0}</td>

                  <td className='h-full'>
                    <span className={this.getRiskBadgeClass(shipment.priority)}>
                      {shipment.priority}
                    </span>
                  </td>

                  <td className='h-full'>
                    <div className="flex items-center gap-2">
                      {this.getModeIcon(shipment.transportMode)}
                      <span className="text-xs text-muted-foreground">
                        Ocean
                      </span>
                    </div>
                  </td>

                  <td className='h-full'>{shipment.risk_probability ?? 0}%</td>
                  <td className='h-full'>
                    <button className=" flex items-center p-2 bg-primary/10 text-primary hover:bg-secondary rounded-lg transition-colors">
                      More
                      <MoveRight className="w-4 h-4 ml-2" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
          {this.state.tblmetadata && (
            <div className='bg-muted w-full h-full fixed top-[64px] left-0 p-4 overflow-auto z-20'>
              <div className='flex items-center justify-end'>
                <button className='p-2 w-10 h-10 flex items-center justify-center rounded-lg bg-secondary/80 text-primary mb-3' onClick={this.handleTableClose}>
                  <X className="w-5 h-5 text-primary" />
                </button>
              </div>
              <div className="px-4 py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 glass-card">
                {["meta", "risk", "route", "status", "mitigation"].map((section) => (
                  <div key={section} className="pl-4">
                    <dl>
                      <dt className="text-lg font-semibold mb-3 capitalize text-primary">
                        {section === "meta" ? "Meta Info" : section.charAt(0).toUpperCase() + section.slice(1)}
                      </dt>
                      <dd>
                        <ul>
                          {Object.entries(this.state.tblmetadata[section]).map(([key, value]) => (
                            <li key={key} className="text-sm mb-2 break-words text-muted-foreground">
                              <span>{this.formatTitle(key)}:</span> <strong className="ml-2 text-white">{JSON.stringify(value)}</strong>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      // <div className="glass-card overflow-hidden">
      //   <div className="panel-header px-6 pt-5">
      //     <h2 className="panel-title">Active Shipments</h2>
      //     <span className="text-xs text-muted-foreground font-mono">
      //       {shipments.length} shipments
      //     </span>
      //   </div>
      //   <div className="overflow-x-auto scrollbar-thin">
      //     <table className="data-table">
      //       <thead>
      //         <tr className="bg-muted/30">
      //           <th>Tracking</th>
      //           <th>Route</th>
      //           <th>Status</th>
      //           <th>Risk</th>
      //           <th>Mode</th>
      //           <th>ETA</th>
      //           <th>Value</th>
      //           <th></th>
      //         </tr>
      //       </thead>
      //       <tbody>
      //         {shipments.map((shipment, index) => (
      //           <tr
      //             key={shipment.id}
      //             className={`cursor-pointer transition-colors animate-fade-in ${
      //               selectedShipmentId === shipment.id
      //                 ? 'bg-primary/10 border-l-2 border-l-primary'
      //                 : ''
      //             }`}
      //             style={{ animationDelay: `${index * 50}ms` }}
      //             onClick={() => onSelectShipment(shipment)}
      //           >
      //             <td>
      //               <div className="flex flex-col">
      //                 <span className="font-semibold text-foreground">
      //                   {shipment.trackingNumber}
      //                 </span>
      //                 <span className="text-xs text-muted-foreground">
      //                   {shipment.carrier}
      //                 </span>
      //               </div>
      //             </td>
      //             <td>
      //               <div className="flex flex-col">
      //                 <span className="text-foreground">
      //                   {shipment.origin.city} → {shipment.destination.city}
      //                 </span>
      //                 <span className="text-xs text-muted-foreground">
      //                   {shipment.customer}
      //                 </span>
      //               </div>
      //             </td>
      //             <td>
      //               <div className="flex items-center gap-2">
      //                 <span className={this.getStatusDotClass(shipment.status)} />
      //                 <span className="capitalize text-foreground">
      //                   {shipment.status.replace('-', ' ')}
      //                 </span>
      //               </div>
      //             </td>
      //             <td>
      //               <span className={this.getRiskBadgeClass(shipment.riskLevel)}>
      //                 {shipment.riskLevel}
      //               </span>
      //             </td>
      //             <td>
      //               <div className="flex items-center gap-2">
      //                 {this.getModeIcon(shipment.transportMode)}
      //                 <span className="capitalize text-muted-foreground text-xs">
      //                   {shipment.transportMode}
      //                 </span>
      //               </div>
      //             </td>
      //             <td>
      //               <div className="flex flex-col">
      //                 <span className="text-foreground">
      //                   {this.formatDate(shipment.eta)}
      //                 </span>
      //                 {shipment.eta > shipment.originalEta && (
      //                   <span className="text-xs text-risk-high">
      //                     +{Math.ceil(
      //                       (new Date(shipment.eta).getTime() -
      //                         new Date(shipment.originalEta).getTime()) /
      //                         (1000 * 60 * 60)
      //                     )}h delay
      //                   </span>
      //                 )}
      //               </div>
      //             </td>
      //             <td className="text-foreground">
      //               {this.formatCurrency(shipment.cargo.value)}
      //             </td>
      //             <td>
      //               <button className="p-2 hover:bg-secondary rounded-md transition-colors">
      //                 <Eye className="w-4 h-4 text-muted-foreground" />
      //               </button>
      //             </td>
      //           </tr>
      //         ))}
      //       </tbody>
      //     </table>
      //   </div>
      // </div>
    );
  }
}

export default ShipmentTable;
