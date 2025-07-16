// Configuration constants
const CONFIG = {
    // WebSocket configuration
    WS_URL: "ws://your-esp32-ip:81",
    
    // Chart colors
    CHART_COLORS: {
        spectrum: "#83a598",
        photodiode: ["#b8bb26", "#83a598", "#d65d0e"],
        history: "#83a598"
    },
    
    // Alert thresholds
    ALERT_THRESHOLDS: {
        high: 800,
        moderate: 500
    },
    
    // Default values
    DEFAULTS: {
        samplingRate: 10,
        integrationTime: 100,
        historyRange: 6
    }
};

// DOM element IDs
const ELEMENTS = {
    sensorCards: "sensor-cards",
    controlPanel: "control-panel",
    dataManagement: "data-management",
    connectionStatus: "connection-status",
    historyRange: "history-range",
    lastUpdated: "last-updated"
};

// Sensor types
const SENSORS = {
    FLUORESCENCE: {
        id: "fluorescence",
        name: "Fluorescence Intensity",
        icon: "lightbulb",
        unit: "",
        bgClass: "bg-primary"
    },
    CONCENTRATION: {
        id: "concentration",
        name: "Cyanobacteria Concentration Est.",
        icon: "chart-bar",
        unit: "mg",
        bgClass: "bg-success"
    },
    ALERTS: {
        id: "alerts",
        name: "Alerts",
        icon: "exclamation-triangle",
        bgClass: "alert-threshold"
    }
};