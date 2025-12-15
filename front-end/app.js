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
        loadCarrierPerformance()
    ]);
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

    // Chat enter key
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('chat-send').click();
        }
    });
});
