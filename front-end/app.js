// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let updateInterval = null;

// API Client
const api = {
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            logout();
            throw new Error('Unauthorized');
        }

        return response.json();
    },

    async get(endpoint) {
        return this.request(endpoint);
    },

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};

// Authentication
async function login(username, password) {
    try {
        const result = await api.post('/auth/login', { username, password });
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showDashboard();
        startAutoUpdate();
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

async function register(username, email, password) {
    try {
        await api.post('/auth/register', { username, email, password });
        alert('Registration successful! Please login.');
        showLoginForm();
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    stopAutoUpdate();
    showLoginPage();
}

function showLoginPage() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('dashboard-page').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('dashboard-page').style.display = 'flex';
    document.getElementById('user-name').textContent = currentUser.username;
    loadDashboardData();
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

// Dashboard Data Loading
async function loadDashboardData() {
    await Promise.all([
        loadDashboardSummary(),
        loadShipments(),
        loadAlerts(),
        loadMitigations(),
        loadCarrierPerformance()
    ]);
}

async function loadMitigations() {
    try {
        const mitigations = await api.get('/mitigation-actions?status=proposed&limit=6');
        const container = document.getElementById('mitigations-grid');
        container.innerHTML = '';

        if (mitigations.length === 0) {
            container.innerHTML = '<p class="no-data">No pending mitigations.</p>';
            return;
        }

        mitigations.forEach(mitigation => {
            const card = document.createElement('div');
            card.className = 'mitigation-card';
            card.innerHTML = `
                <div class="mitigation-header">
                    <span class="mitigation-type">${mitigation.action_type}</span>
                    <span class="mitigation-status">${formatStatus(mitigation.status)}</span>
                </div>
                <div class="mitigation-description">${mitigation.description}</div>
                <div class="mitigation-metrics">
                    <div class="metric-item" title="Estimated Cost">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v12M16 10h-4M16 14h-4"/>
                        </svg>
                        $${mitigation.estimated_cost_usd || 0}
                    </div>
                    <div class="metric-item" title="Time Saved">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        ${mitigation.estimated_time_saved_hours || 0}h
                    </div>
                    <div class="metric-item" title="Probability of Success">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        ${mitigation.probability_success || 0}%
                    </div>
                </div>
                <div class="mitigation-actions">
                    <button class="btn-sm btn-approve" onclick="openFeedbackModal('${mitigation.action_id}', 'approve')">Approve</button>
                    <button class="btn-sm btn-reject" onclick="openFeedbackModal('${mitigation.action_id}', 'reject')">Reject</button>
                    <button class="btn-sm btn-explain" onclick="showReasoning('${mitigation.event_id}', '${mitigation.action_id}')">Why?</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading mitigations:', error);
    }
}

async function showReasoning(eventId, actionId) {
    const modal = document.getElementById('reasoning-modal');
    modal.style.display = 'block';

    document.getElementById('modal-reasoning').textContent = 'Loading reasoning...';
    document.getElementById('modal-confidence-text').textContent = '...';
    document.getElementById('modal-confidence-bar').style.width = '0%';
    document.getElementById('modal-alternatives').innerHTML = '';

    try {
        // Fetch decision for the event
        // We assume /api/agent-decisions returns a list, filter by event_id
        // Ideally we should have a specific endpoint, but let's filter client side or use a query param
        // Using existing /agent-decisions logic: ?event_id=... is not standard in my main_app yet
        // Let's assume fetching by shipment decisions /shipments/:id/decisions or implement a specific fetch

        // Actually, I added /api/decisions/:id/explain but I don't have decision_id here easily.
        // Let's use /api/risk-events/:id/actions to get the thought process? No.
        // Let's fetch decisions for the shipment via /api/shipments/:id/decisions? 
        // Or better: update main_app.py to allow filtering decisions by event_id on /api/agent-decisions?
        // Wait, main_app.py `get_agent_decisions` doesn't filter by event_id. 
        // I will try to fetch /api/agent-decisions?limit=100 and filter client side for now (not efficient but works for demo)

        const decisions = await api.get('/agent-decisions?limit=50');
        const decision = decisions.find(d => d.event_id === eventId && d.decision_type === 'risk_assessment');

        if (decision) {
            document.getElementById('modal-reasoning').textContent = decision.reasoning || "Reasoning not available.";
            const confidence = decision.confidence_score || 0;
            document.getElementById('modal-confidence-text').textContent = confidence + '%';
            document.getElementById('modal-confidence-bar').style.width = confidence + '%';

            // Color code confidence
            const bar = document.getElementById('modal-confidence-bar');
            if (confidence >= 80) bar.style.background = 'var(--color-green)';
            else if (confidence >= 50) bar.style.background = 'var(--color-orange)';
            else bar.style.background = 'var(--color-red)';
        } else {
            document.getElementById('modal-reasoning').textContent = "Detailed reasoning not available for this event.";
        }

        // Fetch Alternatives for this action/shipment
        // Using /api/mitigation-actions?status=proposed
        // Or if we want strictly alternatives, look for 'AlternativeRoute'
        // Let's finding other mitigations for same event
        const allMitigations = await api.get('/mitigation-actions?limit=50');
        const alternatives = allMitigations.filter(m => m.event_id === eventId && m.action_id !== actionId);

        const altList = document.getElementById('modal-alternatives');
        if (alternatives.length > 0) {
            alternatives.forEach(alt => {
                const li = document.createElement('li');
                li.textContent = `${alt.action_type}: ${alt.description} (Cost: $${alt.estimated_cost_usd}, Time: -${alt.estimated_time_saved_hours}h)`;
                altList.appendChild(li);
            });
        } else {
            altList.innerHTML = '<li>No specific alternatives proposed.</li>';
        }

    } catch (error) {
        console.error('Error fetching reasoning:', error);
        document.getElementById('modal-reasoning').textContent = 'Error loading reasoning.';
    }
}

let currentFeedbackActionId = null;
let currentFeedbackType = null;

function openFeedbackModal(actionId, type) {
    const modal = document.getElementById('feedback-modal');
    modal.style.display = 'block';
    currentFeedbackActionId = actionId;
    currentFeedbackType = type;

    const title = type === 'approve' ? 'Approve Mitigation' : 'Reject Mitigation';
    document.getElementById('feedback-title').textContent = title;

    // Reset form
    document.getElementById('feedback-rating').value = '5';
    document.getElementById('feedback-text').value = '';

    // Logic specific to type
    if (type === 'reject') {
        document.getElementById('feedback-rating').value = '1';
    }
}

async function submitFeedback() {
    const rating = document.getElementById('feedback-rating').value;
    const text = document.getElementById('feedback-text').value;

    try {
        if (currentFeedbackType === 'approve') {
            await api.post(`/mitigation-actions/${currentFeedbackActionId}/approve`, {
                rating: parseInt(rating),
                feedback: text
            });
            alert('Mitigation Approved!');
        } else {
            if (!text) {
                alert('Please provide a reason for rejection.');
                return;
            }
            await api.post(`/mitigation-actions/${currentFeedbackActionId}/reject`, {
                reason: text
            });
            alert('Mitigation Rejected.');
        }

        document.getElementById('feedback-modal').style.display = 'none';
        loadMitigations(); // Refresh list
        loadAlerts(); // Refresh alerts
    } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('Error: ' + error.message);
    }
}


async function showTraffic() {
    const modal = document.getElementById('traffic-modal');
    modal.style.display = 'block';
    const container = document.getElementById('traffic-data-container');
    container.innerHTML = 'Loading traffic data...';

    try {
        const trafficData = await api.get('/traffic/current');

        if (trafficData.length === 0) {
            container.innerHTML = '<p>No traffic data available.</p>';
            return;
        }

        let html = `
            <table class="shipments-table" style="width:100%">
                <thead>
                    <tr>
                        <th>Location</th>
                        <th>Condition</th>
                        <th>Congestion Level</th>
                        <th>Note</th>
                    </tr>
                </thead>
                <tbody>
        `;

        trafficData.forEach(item => {
            // Parse details from incident_types if available
            let details = '-';
            if (item.incident_types) {
                try {
                    // Handle if it's a string (JSON) or already object
                    const incidents = typeof item.incident_types === 'string'
                        ? JSON.parse(item.incident_types)
                        : item.incident_types;

                    details = incidents.description || incidents.details || incidents.type || '-';
                } catch (e) {
                    details = 'See details';
                }
            }

            html += `
                <tr>
                    <td>${item.route_segment_id || item.segment_name}</td>
                    <td>${item.road_condition || 'Normal'}</td>
                    <td><span class="status-badge ${getCongestionClass(item.congestion_level)}">${item.congestion_level}</span></td>
                    <td>${details}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Error loading traffic:', error);
        container.innerHTML = 'Error loading traffic data.';
    }
}

function getCongestionClass(level) {
    if (level === 'high' || level === 'critical') return 'delayed'; // Red
    if (level === 'medium') return 'at-risk'; // Orange
    return 'delivered'; // Green/Normal
}

async function loadDashboardSummary() {
    try {
        const summary = await api.get('/dashboard/summary');

        // Update metrics
        document.getElementById('total-shipments').textContent = summary.total_active_shipments || 0;
        document.getElementById('on-time-rate').textContent = (summary.on_time_rate || 0) + '%';
        document.getElementById('exceptions').textContent = summary.exceptions || 0;
        document.querySelector('#avg-transit .value-number').textContent = summary.avg_transit_time_days || 0;

        // Update sparkline charts
        updateSparklines(summary);
    } catch (error) {
        console.error('Error loading dashboard summary:', error);
    }
}

async function loadShipments(statusFilter = '') {
    try {
        const params = statusFilter ? `?status=${statusFilter}` : '?limit=50';
        const shipments = await api.get(`/shipments${params}`);

        const tbody = document.getElementById('shipments-tbody');
        tbody.innerHTML = '';

        shipments.forEach(shipment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${shipment.shipment_id}</strong></td>
                <td>${shipment.origin_port_id || 'N/A'}</td>
                <td>${shipment.destination_port_id || 'N/A'}</td>
                <td>${getCarrierType(shipment)}</td>
                <td>${shipment.current_port_id || 'In Transit'}</td>
                <td><span class="status-badge ${getStatusClass(shipment.status)}">${formatStatus(shipment.status)}</span></td>
                <td>${formatDate(shipment.estimated_arrival)}</td>
                <td>${getAlertIcon(shipment)}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading shipments:', error);
    }
}

async function loadAlerts() {
    try {
        const alerts = await api.get('/alerts/recent?limit=10');

        const alertsList = document.getElementById('alerts-list');
        alertsList.innerHTML = '';

        alerts.forEach(alert => {
            const alertItem = document.createElement('div');
            alertItem.className = `alert-item ${alert.severity}`;
            alertItem.innerHTML = `
                <div class="alert-header">
                    <span class="alert-severity" style="color: ${getSeverityColor(alert.severity)}">${alert.severity}</span>
                    <span class="alert-time">${formatTimeAgo(alert.detected_at)}</span>
                </div>
                <div class="alert-description">${alert.description || alert.risk_type}</div>
                <div class="alert-shipment">Shipment: ${alert.shipment_id}</div>
            `;
            alertsList.appendChild(alertItem);
        });
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

let carrierChart = null;

async function loadCarrierPerformance() {
    try {
        const carriers = await api.get('/carriers/performance');

        const ctx = document.getElementById('carrier-chart').getContext('2d');

        if (carrierChart) {
            carrierChart.destroy();
        }

        carrierChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: carriers.slice(0, 5).map(c => c.name),
                datasets: [{
                    label: 'Reliability Score',
                    data: carriers.slice(0, 5).map(c => c.reliability_score),
                    backgroundColor: 'rgba(74, 158, 255, 0.6)',
                    borderColor: 'rgba(74, 158, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(51, 65, 85, 0.5)'
                        },
                        ticks: {
                            color: '#94A3B8'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94A3B8'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading carrier performance:', error);
    }
}

// Sparkline Charts
function updateSparklines(summary) {
    // Simple sparkline data (mock trend data)
    const trendData = [65, 70, 68, 75, 72, 78, 80];

    createSparkline('chart-shipments', trendData, '#4A9EFF');
    createSparkline('chart-ontime', trendData, '#10B981');
    createSparkline('chart-exceptions', [20, 18, 22, 19, 25, 23, 20], '#EF4444');
    createSparkline('chart-transit', [12, 11, 13, 12, 11, 10, 12], '#8B5CF6');
}

function createSparkline(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map((_, i) => i),
            datasets: [{
                data: data,
                borderColor: color,
                backgroundColor: `${color}20`,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

// Chat Bot
async function sendChatMessage(message) {
    try {
        const response = await api.post('/chat/query', { message });
        return response.response;
    } catch (error) {
        console.error('Error sending chat message:', error);
        return 'Sorry, I encountered an error processing your request.';
    }
}

function addChatMessage(message, isUser = false) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'user' : 'bot'}`;
    messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Auto-update
function startAutoUpdate() {
    updateInterval = setInterval(() => {
        loadDashboardData();
    }, 10000); // Update every 10 seconds
}

function stopAutoUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

// Utility Functions
function getStatusClass(status) {
    const statusMap = {
        'in_transit': 'in-transit',
        'delayed': 'delayed',
        'at_risk': 'at-risk',
        'delivered': 'delivered',
        'at_port': 'at-port',
        'customs': 'at-port'
    };
    return statusMap[status] || 'in-transit';
}

function formatStatus(status) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getCarrierType(shipment) {
    // Mock carrier type based on shipment data
    return 'Ocean';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimeAgo(dateString) {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function getSeverityColor(severity) {
    const colors = {
        'critical': '#EF4444',
        'high': '#F59E0B',
        'medium': '#4A9EFF',
        'low': '#10B981'
    };
    return colors[severity] || '#94A3B8';
}

function getAlertIcon(shipment) {
    if (shipment.status === 'at_risk' || shipment.status === 'delayed') {
        const severity = shipment.status === 'delayed' ? 'critical' : 'high';
        return `<span class="alert-icon ${severity}">⚠</span>`;
    }
    return '';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    if (authToken) {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            showDashboard();
            startAutoUpdate();
        } else {
            logout();
        }
    } else {
        showLoginPage();
    }

    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        await login(username, password);
    });

    // Register form
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        await register(username, email, password);
    });

    // Toggle forms
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Status filter
    document.getElementById('status-filter').addEventListener('change', (e) => {
        loadShipments(e.target.value);
    });

    // Refresh alerts
    document.getElementById('refresh-alerts').addEventListener('click', loadAlerts);

    // Chat toggle
    document.getElementById('chat-toggle').addEventListener('click', () => {
        const chatBody = document.getElementById('chat-body');
        const toggleBtn = document.getElementById('chat-toggle');
        chatBody.classList.toggle('collapsed');
        toggleBtn.textContent = chatBody.classList.contains('collapsed') ? '+' : '−';
    });

    // Chat send
    document.getElementById('chat-send').addEventListener('click', async () => {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (!message) return;

        addChatMessage(message, true);
        input.value = '';

        const response = await sendChatMessage(message);
        addChatMessage(response, false);
    });

    // Modals
    const modals = document.querySelectorAll('.modal');
    const closeBtns = document.querySelectorAll('.close-modal, .close-feedback, .close-traffic, .close-modal-btn, .close-feedback-btn');

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modals.forEach(modal => modal.style.display = 'none');
        });
    });

    window.addEventListener('click', (e) => {
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Refresh Mitigations
    document.getElementById('refresh-mitigations')?.addEventListener('click', loadMitigations);

    // Submit Feedback
    document.getElementById('submit-feedback-btn')?.addEventListener('click', submitFeedback);

    // View Traffic
    document.getElementById('view-traffic-btn')?.addEventListener('click', showTraffic);
});

