import React, { useMemo } from "react";

function EnergySummary({ energyData }) {
    console.log("EnergySummary received:", energyData);  // Debug log

    const summary = useMemo(() => {
        const energies = (energyData || [])
            .map(item => parseFloat(item.energy))
            .filter(energy => !isNaN(energy));
    
        const total = energies.reduce((sum, value) => sum + value, 0);
        const average = energies.length ? total / energies.length : 0;
        const min = energies.length ? Math.min(...energies) : 0;
        const max = energies.length ? Math.max(...energies) : 0;
    
        return { total, average, min, max };
    }, [energyData]);
    
    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Energy Burn Summary</h2>
            <p><strong>Total Energy Burned:</strong> {summary.total.toFixed(1)} kJ</p>
            <p><strong>Average Energy Burned:</strong> {summary.average.toFixed(1)} kJ</p>
            <p><strong>Minimum Energy Burned:</strong> {summary.min} kJ</p>
            <p><strong>Maximum Energy Burned:</strong> {summary.max} kJ</p>
        </div>
    );
}

export default EnergySummary;