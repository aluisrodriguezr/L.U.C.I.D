// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBkcs8Ri3GB68McVZKVWTqzTm47OyPlOCU",
  authDomain: "lucid-d30e0.firebaseapp.com",
  databaseURL: "https://lucid-d30e0-default-rtdb.firebaseio.com",
  projectId: "lucid-d30e0",
  storageBucket: "lucid-d30e0.appspot.com",
  messagingSenderId: "695734393394",
  appId: "1:695734393394:web:ecca4754ac3bd2d47b7a2b",
  measurementId: "G-E10PZD63SL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// DOM Ready Handler
document.addEventListener("DOMContentLoaded", function() {
  // Initialize all components
  initializeUI();
  initializeCharts();
  
  // Set default UI values
  document.getElementById("sampling-rate").value = 5;
  
  // Setup Firebase listeners
  setupFirebaseListeners();
});

// Firebase Listeners
function setupFirebaseListeners() {
  // Main data listener
  firebase.database().ref("live_data").on("value", (snapshot) => {
    const data = snapshot.val();
    console.log("Live Data Update:", data);
    
    // Process intensity_values if needed
    if (data?.intensity_values && typeof data.intensity_values === 'object') {
      data.intensity_values = Object.values(data.intensity_values);
    }
    
    updateUI(data);
  });
  
  // Photodiode listener
  firebase.database().ref("lucid-data/photodiode").on("value", (snapshot) => {
    const photodiodeValue = parseFloat(snapshot.val());
    if (!isNaN(photodiodeValue)) {
      console.log("Photodiode Update:", photodiodeValue);
      updateCharts({ photodiode: photodiodeValue });
    }
  });
  
  // Connection status listener
  const connectedRef = firebase.database().ref(".info/connected");
  connectedRef.on("value", (snap) => {
    const statusElement = document.getElementById("connection-status");
    if (snap.val() === true) {
      statusElement.className = "badge bg-success";
      statusElement.innerHTML = '<i class="fas fa-circle"></i> Connected to LUCID';
    } else {
      statusElement.className = "badge bg-danger";
      statusElement.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
    }
  });
}

// sample data
function testWithSampleData() {
  console.log("Testing with sample data...");
  const testData = {
    intensity_values: Array.from({length: 830}, (_, i) => 
      Math.round(100 + 100 * Math.sin(i/50))),
    fluorescence: 150,
    wavelength: 665.5,
    photodiode: 0.6,
    concentration: 1.25,
    detection: "Cyanobacteria"
  };
  updateUI(testData);
}

// Debug utilities
window.debug = {
  testData: testWithSampleData,
  charts: () => ({
    spectrum: spectrumChart,
    photodiode: photodiodeChart,
    history: historyChart
  })
};

