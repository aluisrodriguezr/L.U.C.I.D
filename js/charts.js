// Chart instances
let spectrumChart, photodiodeChart, historyChart;

function initializeCharts() {
    const spectrumCtx = document.getElementById("spectrum-chart").getContext("2d");
    const photodiodeCtx = document.getElementById("photodiode-chart").getContext("2d");
    const historyCtx = document.getElementById("history-chart").getContext("2d");

    Chart.defaults.color = '#ebdbb2';
    Chart.defaults.borderColor = '#665c54';

    // Initialize empty chart
    spectrumChart = new Chart(spectrumCtx, {
        type: "line",
        data: {
            labels: [], // We'll populate dynamically
            datasets: [{
                label: "Wavelength Mapping",
                data: [],
                borderColor: CONFIG.CHART_COLORS.spectrum,
                backgroundColor: "rgba(131, 165, 152, 0.1)",
                borderWidth: 2,
                tension: 0.1,
            }]
        },
        options: getChartOptions("Wavelength (nm)", "Intensity")
    });

    // Photodiode chart
    photodiodeChart = new Chart(photodiodeCtx, {
        type: "bar",
        data: {
            labels: ["FDS100"],
            datasets: [{
                label: "Photodiode Readings",
                data: [0],
                backgroundColor: CONFIG.CHART_COLORS.photodiode.map(c => `${c}7`),
                borderColor: CONFIG.CHART_COLORS.photodiode,
                borderWidth: 1,
            }]
        },
        options: getChartOptions("", "Value", false)
    });

    const wavelengthLabels = Array.from({ length: 829 }, (_, i) => (354.8 + i * 0.61).toFixed(1));
    // History chart
    historyChart = new Chart(historyCtx, {
        type: "line",
        data: {
            labels: wavelengthLabels,
            datasets: [{
                label: "Historical Intensity Profile",
                data: [],
                borderColor: CONFIG.CHART_COLORS.history,
                backgroundColor: "rgba(131, 165, 152, 0.1)",
                borderWidth: 2,
                fill: true,
            }]
        },
        options: getChartOptions("Wavelength (nm)", "Intensity")
    });
}

function getChartOptions(xTitle, yTitle, showXGrid = true) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 5       // give room for x‐axis labels
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 255,
        title: { display: true, text: yTitle },
        grid: { color: '#665c54' }
      },
      x: {
        title: { display: !!xTitle, text: xTitle },
        grid: { color: showXGrid ? '#665c54' : 'transparent' },
        ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 15 }
      }
    }
  };
}

function updateCharts(data) {
    if (data.intensity_values) {
        // Constants for pixel-to-wavelength mapping
        const start_nm = 368.2;
        const step = 0.58;

        // Determine index where wavelength >= 500 nm
        const minIndex = Math.ceil((500 - start_nm) / step);  // ≈ 254
        const croppedIntensities = data.intensity_values.slice(minIndex);

        // Generate corresponding wavelengths
        const croppedLabels = Array.from({ length: croppedIntensities.length }, (_, i) =>
            (start_nm + (minIndex + i) * step).toFixed(1)
        );

        spectrumChart.data.labels = croppedLabels;
        spectrumChart.data.datasets[0].data = croppedIntensities;
        spectrumChart.update();
    }

    if (data.photodiode !== undefined) {
        photodiodeChart.data.datasets[0].data = [data.photodiode, 0];
        photodiodeChart.update();
    }
}

function updateHistoryChart(hours) {
    const historicalData = generateHistoricalData(hours);
    historyChart.data.labels = historicalData.labels;
    historyChart.data.datasets[0].data = historicalData.values;
    historyChart.update();
}
