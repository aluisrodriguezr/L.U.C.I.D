
let socket;

function initializeWebSocket() {
    socket = new WebSocket(CONFIG.WS_URL);

    socket.onopen = function(e) {
        updateConnectionStatus(true);
        // Initialize with demo data when in development
        if (CONFIG.WS_URL.includes("your-esp32-ip")) {
        }
    };

    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        updateUI(data);
    };

    socket.onclose = function(event) {
        updateConnectionStatus(false);
    };

    socket.onerror = function(error) {
        console.error("WebSocket error:", error);
    };
}

function sendCommand(command, data = {}) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ command, ...data }));
    } else {
        console.error("WebSocket is not connected");
    }
}

function updateConnectionStatus(connected) {
    const statusElement = document.getElementById(ELEMENTS.connectionStatus);
    if (connected) {
        statusElement.className = "badge bg-success";
        statusElement.innerHTML = '<i class="fas fa-circle"></i> Connected to LUCID';
    } else {
        statusElement.className = "badge bg-danger";
        statusElement.innerHTML = '<i class="fas fa-circle"></i> Disconnected from LUCID';
    }
}