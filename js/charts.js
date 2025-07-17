let spectrumChart, photodiodeChart, historyChart;

const WAVELENGTH_CONFIG = {
  start: 354.8,
  step: 0.61,
  count: 830,
  maxIntensity: 255
};

function generateWavelengthLabels() {
  return Array.from({ length: WAVELENGTH_CONFIG.count }, (_, i) =>
    (WAVELENGTH_CONFIG.start + i * WAVELENGTH_CONFIG.step).toFixed(1)
  );
}

function getChartOptions(xTitle, yTitle, showXGrid = true, yMax = null) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: yMax || WAVELENGTH_CONFIG.maxIntensity,
        title: {
          display: true,
          text: yTitle,
          color: '#ebdbb2'
        },
        ticks: {
          color: '#ebdbb2'
        },
        grid: {
          color: '#665c54'
        }
      },
      x: {
        title: {
          display: !!xTitle,
          text: xTitle,
          color: '#ebdbb2'
        },
        ticks: {
          color: '#ebdbb2',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 20
        },
        grid: {
          color: showXGrid ? '#665c54' : 'transparent'
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: '#ebdbb2',
          boxWidth: 12,
          padding: 15
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    }
  };
}

function initializeCharts() {
  const wavelengthLabels = generateWavelengthLabels();

  // Spectrum Chart (Live)
  spectrumChart = new Chart(document.getElementById("spectrum-chart"), {
    type: "line",
    data: {
      labels: wavelengthLabels,
      datasets: [{
        label: "Wavelength Mapping",
        data: Array(WAVELENGTH_CONFIG.count).fill(0),
        borderColor: "#1aad7544",
        backgroundColor: "rgba(27, 199, 133, 1)",
        borderWidth: 1,
        tension: 0.1
      }]
    },
    options: getChartOptions("Wavelength (nm)", "Intensity (au)")
  });

  // Photodiode Chart
  photodiodeChart = new Chart(document.getElementById("photodiode-chart"), {
    type: "bar",
    data: {
      labels: ["FDS100"],
      datasets: [{
        label: "Photodiode Reading",
        data: [0],
        backgroundColor: "rgba(248, 237, 135, 0.72)",
        borderColor: "rgba(255, 251, 0, 1)",
        borderWidth: 1
      }]
    },
    options: {
      ...getChartOptions("", "Power (mW)", false, 15),
      scales: { x: { display: false }, y: { beginAtZero: true, max: 15, title: { display: true, text: "Power (mW)", color: '#ebdbb2' } } },
    }
  });

  // History Chart
  historyChart = new Chart(document.getElementById("history-chart"), {
    type: "line",
    data: {
      labels: wavelengthLabels,
      datasets: [{
        label: "Historical Intensity Profile",
        data: Array(WAVELENGTH_CONFIG.count).fill(0),
        borderColor: "#d3869b",
        backgroundColor: "rgba(214, 134, 155, 0.34)",
        borderWidth: 0.1,
        tension: 0.1,
        fill: true
      }]
    },
    options: getChartOptions("Wavelength (nm)", "Intensity (au)")
  });
}

function updateCharts(data) {
  if (data?.intensity_values) {
    const values = Array.isArray(data.intensity_values)
      ? data.intensity_values
      : Object.values(data.intensity_values);

    const limitedValues = values.slice(0, WAVELENGTH_CONFIG.count);
    spectrumChart.data.datasets[0].data = limitedValues;
    spectrumChart.update();
  }

  if (data?.photodiode !== undefined) {
    const value = Math.min(15, parseFloat(data.photodiode));
    photodiodeChart.data.datasets[0].data = [value];
    photodiodeChart.update();
  }
}

function updateHistoryChartFromSample(sample) {
  const values = Array.isArray(sample.intensity_values)
    ? sample.intensity_values
    : Object.values(sample.intensity_values);

  historyChart.data.datasets[0].data = values.slice(0, WAVELENGTH_CONFIG.count);
  historyChart.update();
}


// safe: 0-0.5mg/mL
// Cocerntration: 0.5-1.0mg/mL
// Dangerous: 1.0-1.5mg/mL