function initializeUI() {
    createSensorCards();
    createControlPanel();
    createDataManagementSection();
    setupEventListeners();
}

function createSensorCards() {
    const container = document.getElementById('sensor-cards');
    if (!container) return;

    container.innerHTML = `
        <div class="col-md-4">
            <div class="sensor-card bg-primary text-white">
                <h5><i class="fas fa-lightbulb"></i> Fluorescence Intensity Peak</h5>
                <h1 id="fluorescence-value">0</h1>
                <p class="mb-0">Current reading</p>
            </div>
        </div>
        <div class="col-md-4">
            <div class="sensor-card bg-success text-white">
                <h5><i class="fas fa-chart-bar"></i> Cyanobacteria Concentration</h5>
                <h1 id="concentration-value">0 mg/mL</h1>
                <p class="mb-0">Estimated</p>
            </div>
        </div>
        <div class="col-md-4">
            <div class="sensor-card alert-threshold" style="background-color: #3c3836;">
                <h5><i class="fas fa-exclamation-triangle"></i> Alerts</h5>
                <div id="alerts-container">
                    <p class="mb-1" id="cyanobacteria-alert">No cyanobacteria detected</p>
                    <p class="mb-0" id="quality-alert">Water quality: Normal</p>
                </div>
            </div>
        </div>
    `;
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
        <div class="mb-3">
        <button id="start-btn" class="btn btn-primary flex-fill">
            <i class="fas fa-play"></i> Start Sampling
        </button>
        <button id="stop-btn" class="btn btn-danger flex-fill">
            <i class="fas fa-stop"></i> Stop Sampling
        </button>
        </div>
        <button id="laser-on-btn" class="btn btn-success flex-fill">
            <i class="fas fa-bolt"></i> Laser On
        </button>
        <button id="laser-off-btn" class="btn btn-secondary">
            <i class="fas fa-power-off"></i> Laser Off
        </button>
        <hr />
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
    if (!data) {
        console.warn('updateUI called without data');
        return;
    }

    // Update fluorescence display
    const fluorescenceElement = document.getElementById('fluorescence-value');
    if (fluorescenceElement && data.fluorescence !== undefined) {
        fluorescenceElement.textContent = 
            `${data.fluorescence.toFixed(2)} @ ${data.wavelength?.toFixed(0) || '--'}nm`;
    }

    // Update concentration display
    const concentrationElement = document.getElementById('concentration-value');
    if (concentrationElement && data.concentration !== undefined) {
        concentrationElement.textContent = `${data.concentration.toFixed(3)} mg/mL`;
    }

    // Update last updated time
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = new Date().toLocaleString();
    }

    // Update charts
    updateCharts(data);
    
    // Update alerts
    updateAlerts(data);
}

// Update alert indicators
function updateAlerts(data) {
    const cyanobacteriaAlert = document.getElementById('cyanobacteria-alert');
    const qualityAlert = document.getElementById('quality-alert');

    if (!cyanobacteriaAlert || !qualityAlert) return;

    const detection = data.detection || "None";
    const fluorescence = data.fluorescence || 0;
    const concentration = data.concentration || 0;

    // Cyanobacteria Alert
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

    // Water Quality Alert (could be deleted in the future idk --is green algae dangerous?)
    if (concentration > 1.0 || detection === "Cyanobacteria") {
        qualityAlert.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> Water quality: Dangerous';
        qualityAlert.className = "mb-0 text-danger";
    } else if (concentration > 0.5 || detection === "Cyanobacteria") {
        qualityAlert.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i> Water quality: Warning';
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

