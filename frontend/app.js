
const API_BASE = 'http://localhost:5000/api';

// State
let dashboardState = {
    shipments: [],
    alerts: [],
    mitigations: [],
    metrics: {},
    selectedAlertId: null,
    selectedMitigationId: null,
    currentUser: null,
    agentActive: true
};

// --- AUTH & INIT ---
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
});

function checkLogin() {
    const token = localStorage.getItem('access_token');
    const user = JSON.parse(localStorage.getItem('user_info') || '{}');

    if (token && user.username) {
        dashboardState.currentUser = user;
        showDashboard();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('dashboard-page').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('dashboard-page').style.display = 'block';
    document.getElementById('user-name').textContent = dashboardState.currentUser.username;

    // Initial Load
    refreshDashboard();
    // Auto-refresh every 10s
    setInterval(refreshDashboard, 10000);
    // Agent Animation
    setInterval(updateAgentStatus, 3000);
}

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    location.reload();
});

// Mock Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    // For demo, accept any login
    const username = document.getElementById('username').value;
    const token = 'mock-jwt-token';
    const user = { username: username, role: 'admin' };

    localStorage.setItem('access_token', token);
    localStorage.setItem('user_info', JSON.stringify(user));

    checkLogin();
});

/* --- DATA FETCHING --- */
async function refreshDashboard() {
    await Promise.all([
        fetchMetrics(),
        fetchShipments(),
        fetchAlerts(),
        fetchMitigations() // Fetching proposed options
    ]);
    renderAll();
}

async function fetchMetrics() {
    try {
        // Mocking metric response structure based on old endpoints
        const res = await fetch(`${API_BASE}/dashboard/summary`);
        dashboardState.metrics = await res.json();
    } catch (e) { console.error("Metrics error", e); }
}

async function fetchShipments() {
    try {
        const res = await fetch(`${API_BASE}/shipments/chat-view?limit=50`);
        dashboardState.shipments = await res.json();
    } catch (e) { console.error("Shipments error", e); }
}

async function fetchAlerts() {
    try {
        const res = await fetch(`${API_BASE}/alerts/recent?limit=10`);
        dashboardState.alerts = await res.json();
    } catch (e) { console.error("Alerts error", e); }
}

async function fetchMitigations() {
    try {
        // We use mitigation-actions to find proposed ones linked to alerts
        const res = await fetch(`${API_BASE}/mitigation-actions?status=proposed`);
        dashboardState.mitigations = await res.json();
    } catch (e) { console.error("Mitigations error", e); }
}

/* --- RENDER LOGIC --- */

function renderAll() {
    renderMetrics();
    renderShipments();
    renderAlerts();
    renderMitigationPanel(); // Dependent on selected Alert
}

function renderMetrics() {
    document.getElementById('total-shipments').textContent = dashboardState.metrics.total_shipments || '--';
    document.getElementById('critical-alerts').textContent = dashboardState.metrics.critical_alerts || '0';
    document.getElementById('on-time-rate').textContent = (dashboardState.metrics.on_time_rate || 98) + '%';
    // Mock Savings
    document.getElementById('cost-savings').textContent = '$1.2M';
}

function renderShipments() {
    const tbody = document.getElementById('shipments-tbody');
    tbody.innerHTML = '';

    dashboardState.shipments.slice(0, 10).forEach(ship => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';

        // Tracking / ID
        const tdId = `<td><div class="flex flex-col"><span class="font-semibold text-white">${ship.shipment_id}</span><span class="text-xs text-muted">${ship.carrier}</span></div></td>`;

        // Route
        const origin = ship.origin_location_code || 'N/A';
        const dest = ship.destination_location_code || 'N/A';
        const tdRoute = `<td><div class="flex flex-col"><span>${origin} → ${dest}</span></div></td>`;

        // Status
        const statusClass = getStatusClass(ship.current_status); // Helper
        const tdStatus = `<td><div class="flex items-center gap-2"><span class="status-dot ${statusClass}"></span><span class="capitalize">${ship.current_status?.replace('_', ' ') || 'In Transit'}</span></div></td>`;

        // Risk
        const riskClass = getRiskClass(ship.risk_severity || 'low');
        const tdRisk = `<td><span class="risk-badge ${riskClass}">${ship.risk_severity > 50 ? 'High' : 'Low'}</span></td>`;

        // ETA
        const tdEta = `<td>${new Date(ship.current_estimated_arrival_at || Date.now()).toLocaleDateString()}</td>`;

        tr.innerHTML = tdId + tdRoute + tdStatus + tdRisk + tdEta;
        tbody.appendChild(tr);
    });
}

function renderAlerts() {
    const container = document.getElementById('alerts-list');
    container.innerHTML = '';
    document.getElementById('alerts-count').textContent = `${dashboardState.alerts.length} Active`;

    if (dashboardState.alerts.length === 0) {
        container.innerHTML = '<div class="p-4 text-muted text-center text-sm">No active alerts</div>';
        return;
    }

    dashboardState.alerts.forEach(alert => {
        const div = document.createElement('div');
        div.className = `alert-row ${dashboardState.selectedAlertId === alert.event_id ? 'selected' : ''}`;
        div.onclick = () => selectAlert(alert.event_id);

        const severityColor = alert.severity === 'critical' ? 'text-destructive' : 'text-primary';

        div.innerHTML = `
            <div class="flex justify-between mb-1">
                <span class="font-semibold text-sm ${severityColor}">${alert.risk_type}</span>
                <span class="text-xs text-muted font-mono">${new Date(alert.detected_at).toLocaleTimeString()}</span>
            </div>
            <p class="text-xs text-muted-foreground mb-2">${alert.description}</p>
            <div class="flex items-center gap-2">
                 <span class="risk-badge risk-${alert.severity || 'medium'}">${alert.severity || 'MED'}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

function selectAlert(id) {
    dashboardState.selectedAlertId = dashboardState.selectedAlertId === id ? null : id;
    renderAll(); // Re-render to show selection state and update mitigation panel
}

function renderMitigationPanel() {
    const container = document.getElementById('mitigation-content');
    const emptyState = document.getElementById('mitigation-empty-state');

    if (!dashboardState.selectedAlertId) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');
    container.innerHTML = '';

    // Filter mitigations for this alert
    // In real app, we check mitigation.event_id === selectedAlertId
    // For demo, we show dummy options if none found, or filter 'proposed' ones
    let options = dashboardState.mitigations.filter(m => m.event_id === dashboardState.selectedAlertId);

    if (options.length === 0) {
        // Fallback for demo visualization if no options in DB
        options = [
            { action_id: '1', action_type: 'Reroute', description: 'Reroute via alternate port to avoid congestion.', estimated_cost_usd: 1200, estimated_time_saved_hours: 24, probability_success: 85 },
            { action_id: '2', action_type: 'Expedite', description: 'Switch to air freight for remaining leg.', estimated_cost_usd: 5000, estimated_time_saved_hours: 48, probability_success: 95 }
        ];
    }

    options.forEach(opt => {
        const el = document.createElement('div');
        el.className = `simulation-option ${dashboardState.selectedMitigationId === opt.action_id ? 'selected' : ''}`;
        el.onclick = () => {
            dashboardState.selectedMitigationId = dashboardState.selectedMitigationId === opt.action_id ? null : opt.action_id;
            renderMitigationPanel(); // Re-render to show selection
        };

        const isSelected = dashboardState.selectedMitigationId === opt.action_id;

        el.innerHTML = `
            <div class="flex items-start justify-between">
                <div>
                     <h4 class="font-semibold text-sm">${opt.action_type || 'Mitigation Action'}</h4>
                     <p class="text-xs text-muted leading-tight mt-1">${opt.description}</p>
                </div>
                <div class="text-xs font-mono text-primary">${(opt.probability_success * 100).toFixed(0)}% Safe</div>
            </div>
            
            <div class="simulation-stats">
                 <div class="sim-stat"><span class="text-muted">$</span> ${opt.estimated_cost_usd}</div>
                 <div class="sim-stat"><span class="text-muted">Save</span> ${opt.estimated_time_saved_hours}h</div>
            </div>
            
            ${isSelected ? `
            <div class="mt-3 pt-3 border-t border-white/10 flex gap-2 animate-fade-in">
                 <button onclick="executeMitigation(event, '${opt.action_id}')" class="action-btn action-btn-primary w-full justify-center text-xs">Execute Plan</button>
            </div>
            ` : ''}
        `;
        container.appendChild(el);
    });
}

function executeMitigation(e, id) {
    e.stopPropagation();
    // Optimistic update
    dashboardState.alerts = dashboardState.alerts.filter(a => a.event_id !== dashboardState.selectedAlertId);
    dashboardState.selectedAlertId = null;
    dashboardState.selectedMitigationId = null;

    // Add log
    const log = document.getElementById('comm-log-list');
    const entry = document.createElement('div');
    entry.className = "p-2 border border-border/50 rounded bg-white/5 text-xs animate-fade-in";
    entry.innerHTML = `<span class="text-primary font-bold">ACTION EXECUTED:</span> Mitigation ${id} applied by agent.`;
    log.prepend(entry);

    renderAll();
}

/* --- HELPERS --- */
function getStatusClass(status) {
    if (!status) return 'status-info';
    status = status.toLowerCase();
    if (status.includes('transit')) return 'status-active';
    if (status.includes('delay')) return 'status-danger';
    if (status.includes('hold')) return 'status-warning';
    return 'status-info';
}

function getRiskClass(sev) {
    if (typeof sev === 'string') {
        if (sev === 'critical') return 'risk-critical';
        if (sev === 'high') return 'risk-high';
        if (sev === 'medium') return 'risk-medium';
        return 'risk-low';
    }
    if (sev > 75) return 'risk-critical';
    if (sev > 50) return 'risk-high';
    if (sev > 25) return 'risk-medium';
    return 'risk-low';
}

// Agent Status Loop
function updateAgentStatus() {
    const txt = document.getElementById('agent-activity-text');
    if (!txt) return;
    const activities = [
        "Analyzing satellite data for Pacific route...",
        "Optimizing container allocation...",
        "Monitoring weather systems in Atlantic...",
        "Updating probability scores for Shipment #402..."
    ];
    txt.style.opacity = 0;
    setTimeout(() => {
        txt.textContent = activities[Math.floor(Math.random() * activities.length)];
        txt.style.opacity = 0.7;
    }, 500);
}
