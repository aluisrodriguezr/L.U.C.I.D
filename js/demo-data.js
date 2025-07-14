
function generateDemoSpectrumData() {
    return Array.from({length: 128}, (_, i) => {
        const baseValue = Math.random() * 50 + 50;
        const peak1 = Math.exp(-Math.pow((i - 30)/5, 2)) * 300;
        const peak2 = Math.exp(-Math.pow((i - 90)/7, 2)) * 400;
        return Math.round(baseValue + peak1 + peak2);
    });
}

function generateDemoPhotodiodeData() {
    return [
        Math.round(Math.random() * 500 + 200),
        Math.round(Math.random() * 300 + 100),
        Math.round(Math.random() * 400 + 150)
    ];
}

function generateHistoricalData(hours) {
    const now = new Date();
    const dataPoints = hours * 12; // 5 minute intervals
    const data = [];
    const labels = [];
    
    for (let i = 0; i < dataPoints; i++) {
        const hoursAgo = (dataPoints - i) / 12;
        const time = new Date(now - hoursAgo * 60 * 60 * 1000);
        
        let label;
        if (hours <= 24) {
            label = time.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        } else {
            label = time.toLocaleDateString([], {month: 'short', day: 'numeric'});
        }
        
        labels.unshift(label);
        
        const dailyPattern = Math.sin(i / (dataPoints / (24/hours)) * Math.PI * 2) * 100;
        const randomFactor = Math.random() * 50;
        const spike = Math.random() > 0.95 ? Math.random() * 300 + 100 : 0;
        const value = 200 + dailyPattern + randomFactor + spike;
        
        data.unshift(Math.round(value));
    }
    
    return { labels, values: data };
}
