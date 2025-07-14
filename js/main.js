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

firebase.initializeApp(firebaseConfig);

document.addEventListener("DOMContentLoaded", function () {
  initializeUI();
  initializeCharts();
  initializeWebSocket();

  // Set default UI values
  if (document.getElementById("sampling-rate"))
    document.getElementById("sampling-rate").value = CONFIG.DEFAULTS.samplingRate;
  if (document.getElementById("integration-time"))
    document.getElementById("integration-time").value = CONFIG.DEFAULTS.integrationTime;
  if (document.getElementById("history-range"))
    document.getElementById("history-range").value = CONFIG.DEFAULTS.historyRange;
});

// 🔁 Listen for live_data updates from Firebase
firebase.database().ref("live_data").on("value", (snapshot) => {
  const data = snapshot.val();
  console.log("✅ Received live_data from Firebase:", data);

  // Convert object to array if needed
  if (data?.intensity_values && !Array.isArray(data.intensity_values)) {
    const values = data.intensity_values;
    data.intensity_values = Object.keys(values)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(key => values[key]);
  }

  updateUI(data); // call your existing function
});
