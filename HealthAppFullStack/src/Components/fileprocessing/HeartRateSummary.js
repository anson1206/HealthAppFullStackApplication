import React from "react";

function HeartRateSummary({ heartRates }) {
    // Convert heart rate values to numbers safely
    const rates = heartRates
        .map(item => parseFloat(item.heartRate))
        .filter(rate => !isNaN(rate));

    const total = rates.reduce((sum, value) => sum + value, 0);
    const average = rates.length ? total / rates.length : 0;
    const min = rates.length ? Math.min(...rates) : 0;
    const max = rates.length ? Math.max(...rates) : 0;

    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Heart Rate Summary</h2>
            <p><strong>Average:</strong> {average.toFixed(1)} BPM</p>
            <p><strong>Minimum:</strong> {min} BPM</p>
            <p><strong>Maximum:</strong> {max} BPM</p>
        </div>
    );
}

export default HeartRateSummary;