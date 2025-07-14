function initializeUI() {
    createSensorCards();
    createControlPanel();
    createDataManagementSection();
    setupEventListeners();
}

function createSensorCards() {
    const container = document.getElementById(ELEMENTS.sensorCards);
    
    Object.values(SENSORS).forEach(sensor => {
        const card = document.createElement("div");
        card.className = `col-md-${sensor.id === 'alerts' ? 4 : 4}`;
        
        let cardContent;
        if (sensor.id === 'alerts') {
            cardContent = `
                <div class="sensor-card ${sensor.bgClass}" style="background-color: #3c3836;">
                    <h5><i class="fas fa-${sensor.icon}"></i> ${sensor.name}</h5>
                    <div id="alerts-container">
                        <p class="mb-1" id="cyanobacteria-alert">No cyanobacteria detected</p>
                        <p class="mb-0" id="quality-alert">Water quality: Normal</p>
                    </div>
                </div>
            `;
        } else {
            cardContent = `
                <div class="sensor-card ${sensor.bgClass} text-white">
                    <h5><i class="fas fa-${sensor.icon}"></i> ${sensor.name}</h5>
                    <h1 id="${sensor.id}-value">0${sensor.unit ? ' ' + sensor.unit : ''}</h1>
                    <p class="mb-0">Current reading</p>
                </div>
            `;
        }
        
        card.innerHTML = cardContent;
        container.appendChild(card);
    });
}

function createControlPanel() {
    const container = document.getElementById(ELEMENTS.controlPanel);
    
    container.innerHTML = `
        <h5><i class="fas fa-sliders-h"></i> System Controls</h5>
        <div class="mb-3">
            <label class="form-label">Sampling Rate</label>
            <select class="form-select" id="sampling-rate">
                <option value="1">1 second</option>
                <option value="5" selected>5 seconds</option>
                <option value="10">10 seconds</option>
                <option value="15">15 seconds</option>
                <option value="30">30 seconds</option>
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label">Sample Label</label>
            <input type="text" class="form-control" id="sample-label" placeholder="Ex. Lake Eola" />
        </div>
        <button id="start-btn" class="btn btn-primary flex-fill">
            <i class="fas fa-play"></i> Start Sampling
        </button>
        <button id="stop-btn" class="btn btn-danger flex-fill">
            <i class="fas fa-stop"></i> Stop Sampling
        </button>
        <button id="laser-on-btn" class="btn btn-success flex-fill">
            <i class="fas fa-bolt"></i> Laser On
        </button>
        <button id="laser-off-btn" class="btn btn-secondary">
            <i class="fas fa-power-off"></i> Laser Off
        </button>
        <hr />
        <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="cloud-sync" checked />
            <label class="form-check-label" for="cloud-sync">Enable Cloud Sync</label>
        </div>
    `;
}

function createDataManagementSection() {
    const container = document.getElementById(ELEMENTS.dataManagement);
    
    container.innerHTML = `
    <h5><i class="fas fa-database"></i> Data Management</h5>
    <div class="mb-3 d-flex gap-2">
        <input type="text" class="form-control form-control-sm" id="export-label" placeholder="Sample label (optional)" />
        <button id="export-csv" class="btn btn-sm btn-outline-primary">
            <i class="fas fa-file-csv"></i> Export CSV
        </button>
        <button id="export-json" class="btn btn-sm btn-outline-success">
            <i class="fas fa-file-code"></i> Export JSON
        </button>
    </div>
    <div class="float-end">
        <span class="text-muted">Last updated: <span id="${ELEMENTS.lastUpdated}">Never</span></span>
    </div>
    `;
}

function sendFirebaseCommand(commandPath, value) {
    firebase.database().ref(commandPath).set(value);
}

function setupEventListeners() {
    document.getElementById("start-btn").addEventListener("click", () => {
        const sampleLabel = document.getElementById("sample-label").value.trim();
        const samplingRate = parseInt(document.getElementById("sampling-rate").value);
        if (sampleLabel === "") {
            alert("Please enter a sample label before starting.");
            return;
        }

        sendFirebaseCommand("commands/start_test", {
            start: true,
            label: sampleLabel,
            sampling_rate: samplingRate
        });
        sendFirebaseCommand("commands/stop_test", false);
    });

    document.getElementById("stop-btn").addEventListener("click", () => {
        sendFirebaseCommand("commands/stop_test", true);
        sendFirebaseCommand("commands/start_test", false);

        firebase.database().ref("live_data").set({
            fluorescence: 0,
            concentration: 0,
            detection: "None",
            intensity_values: Array(829).fill(0)
        });
    });

    document.getElementById("laser-on-btn").addEventListener("click", () => {
        sendFirebaseCommand("commands/laser_on", true);
        sendFirebaseCommand("commands/laser_off", false);
    });

    document.getElementById("laser-off-btn").addEventListener("click", () => {
        sendFirebaseCommand("commands/laser_off", true);
        sendFirebaseCommand("commands/laser_on", false);
    });

    document.getElementById("export-csv").addEventListener("click", () => {
        alert("Exporting CSV data... (demo)");
    });

    document.getElementById("export-json").addEventListener("click", () => {
        alert("Exporting JSON data... (demo)");
    });

    document.getElementById("load-history-btn").addEventListener("click", () => {
        const label = document.getElementById("history-label").value.trim();
        if (!label) {
            alert("Please enter a sample label.");
            return;
        }

        firebase.database().ref(`historical_data/${label}`).once("value").then(snapshot => {
            const data = snapshot.val();
            if (!data) {
                alert(`Sample '${label}' not found.`);
                return;
            }

            // Plot to history chart
            historyChart.data.labels = data.intensity_values.map((_, i) => (354.8 + i * 0.61).toFixed(1));
            historyChart.data.datasets[0].data = data.intensity_values;
            historyChart.update();

            console.log(`✅ Loaded Sample: ${label}`);
            console.log(`→ Detection: ${data.detection}`);
            console.log(`→ Concentration: ${data.concentration} mg/mL`);
        });
    });

    document.getElementById("export-csv").addEventListener("click", () => {
        const label = document.getElementById("export-label").value.trim();
        if (!label) {
            alert("Please enter a sample label for export.");
            return;
        } else {
            exportData(label, "csv");
        }
    });

    document.getElementById("export-json").addEventListener("click", () => {
        const label = document.getElementById("export-label").value.trim();
        if (!label) {
            alert("Please enter a sample label for export.");
            return;
        } else {
            exportData(label, "json");
        }
    });
}

function exportData(label, type) {
    const refPath = label ? `historical_data/${label}` : "historical_data";
    firebase.database().ref(refPath).once("value").then(snapshot => {
        const data = snapshot.val();
        if (!data) {
            alert(label ? 'Sample "${label}" not found.' : "No historical data available.");
            return;
        }
        let filename = label ? `${label}.${type}` : `historical_data.${type}`;

        if (type === "json") {
            const jsonData = JSON.stringify(data, null, 2);
            downloadFile(jsonData, `${filename}.json`, "application/json");
        } else if (type === "csv") {
            const csvData = convertToCSV(data, label);
            downloadFile(csvData, `${filename}.csv`, "text/csv");
        }
    });
}

function convertToCSV(data, singleSample = "") {
    const rows = [];

    if (singleSample) {
        // One sample: flatten into CSV
        const sample = data;
        const header = ["Wavelength (nm)", "Intensity"];
        rows.push(header.join(","));
        const wavelengths = sample.intensity_values.map((_, i) => (354.8 + i * 0.61).toFixed(1));
        for (let i = 0; i < wavelengths.length; i++) {
            rows.push(`${wavelengths[i]},${sample.intensity_values[i]}`);
        }
        // Add metadata at bottom
        rows.push("");
        rows.push(`Label: ${singleSample}`);
        rows.push(`Detection: ${sample.detection}`);
        rows.push(`Concentration: ${sample.concentration}`);
        rows.push(`Calibration: ${sample.calibration}`);
    } else {
        // All samples: one line per sample with summary info
        rows.push("Label,Detection,Concentration,Calibration,Fluorescence");
        for (const [key, val] of Object.entries(data)) {
            rows.push([
                key,
                val.detection || "",
                val.concentration || "",
                val.calibration || "",
                val.fluorescence || ""
            ].join(","));
        }
    }

    return rows.join("\n");
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function updateUI(data) {
    if (data.fluorescence !== undefined) {
        document.getElementById("fluorescence-value").textContent = data.fluorescence;
    }
    if (data.concentration !== undefined) {
        document.getElementById("concentration-value").textContent = `${data.concentration} mg/mL`;
    }

    document.getElementById(ELEMENTS.lastUpdated).textContent = new Date().toLocaleString();

    updateCharts(data);
    updateAlerts(data);
}

function updateAlerts(data) {
    const cyanobacteriaAlert = document.getElementById("cyanobacteria-alert");
    const qualityAlert = document.getElementById("quality-alert");

    const detection = data.detection || "None";
    const fluorescence = data.fluorescence || 0;
    const concentration = data.concentration || 0;

    if (detection === "Cyanobacteria") {
        cyanobacteriaAlert.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> Cyanobacteria detected!';
        cyanobacteriaAlert.className = "mb-1 text-danger";
    } else if (detection === "Green Algae") {
        cyanobacteriaAlert.innerHTML = '<i class="fas fa-check-circle text-success"></i> Green Algae detected';
        cyanobacteriaAlert.className = "mb-1 text-success";
    } else {
        cyanobacteriaAlert.innerHTML = '<i class="fas fa-info-circle text-secondary"></i> No cyanobacteria detected';
        cyanobacteriaAlert.className = "mb-1 text-muted";
    }

    if (concentration > 25 || fluorescence > 700) {
        qualityAlert.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> Water quality: Potentially compromised';
        qualityAlert.className = "mb-0 text-warning";
    } else {
        qualityAlert.innerHTML = '<i class="fas fa-check-circle text-success"></i> Water quality: Safe';
        qualityAlert.className = "mb-0 text-success";
    }
}

function initializeDemoData() {
    const demoData = {
        fluorescence: Math.round(generateDemoSpectrumData()[90]),
        concentration: Math.round(generateDemoSpectrumData()[90] / 10),
        intensity_values: generateDemoSpectrumData(),
        pd1: generateDemoPhotodiodeData()[0]
    };
    
    updateUI(demoData);
    updateHistoryChart(CONFIG.DEFAULTS.historyRange);
}
