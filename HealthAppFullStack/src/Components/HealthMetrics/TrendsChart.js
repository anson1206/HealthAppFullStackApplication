import React from 'react';
import LineChart from '../fileprocessing/LineGraph';

// Simple moving average
function movingAverage(arr, windowSize) {
    const res = [];
    for (let i = 0; i < arr.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const window = arr.slice(start, i + 1).map(x => x.value);
        const sum = window.reduce((a,b) => a + b, 0);
        res.push(sum / window.length);
    }
    return res;
}

// Linear regression (least squares) returns {slope, intercept}
function linearRegression(xs, ys) {
    if (xs.length === 0) return { slope: 0, intercept: 0 };
    const n = xs.length;
    const sumX = xs.reduce((a,b) => a + b, 0);
    const sumY = ys.reduce((a,b) => a + b, 0);
    const sumXY = xs.reduce((a,b,i) => a + b * ys[i], 0);
    const sumXX = xs.reduce((a,b) => a + b*b, 0);
    const denom = (n * sumXX - sumX*sumX) || 1;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

export default function TrendsChart({ series, labels, label, maWindow = 7 }) {
    // series: [{date: ISO, value: number}, ...] sorted by date ascending
    const values = series.map(s => ({ value: Number(s.value || 0) }));
    const ma = movingAverage(values, maWindow);

    // build linear regression over index
    const xs = series.map((_, i) => i);
    const ys = series.map(s => Number(s.value || 0));
    const { slope, intercept } = linearRegression(xs, ys);
    const trend = xs.map(x => intercept + slope * x);


    const formattedLabels = labels || series.map(s => new Date(s.date).toLocaleDateString());
    const data = {
        labels: formattedLabels,
        datasets: [
            { label: label || 'Value', data: ys, borderColor: 'rgba(14,165,233,0.9)', backgroundColor: 'rgba(14,165,233,0.08)', tension: 0.25, pointRadius: 2, pointHoverRadius: 6 },
            { label: `${maWindow}-day MA`, data: ma, borderColor: 'rgba(249,115,22,0.95)', backgroundColor: 'rgba(249,115,22,0.06)', tension: 0.25, pointRadius: 0, borderWidth: 2 },
            { label: 'Trend', data: trend, borderColor: 'rgba(99,102,241,0.9)', borderDash: [6,4], pointRadius: 0, borderWidth: 2 }
        ]
    };

    const yAxisLabel = label || '';
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 8 } },
            tooltip: { mode: 'nearest', intersect: false, callbacks: { label: (ctx) => Number(ctx.raw).toLocaleString() } }
        },
        scales: {
            x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
            y: { grid: { color: 'rgba(15,23,42,0.06)' }, title: { display: !!yAxisLabel, text: yAxisLabel } }
        },
        elements: { line: { tension: 0.25 }, point: { radius: 2 } }
    };

    return (
        <div className="w-full h-[360px] p-2 bg-white rounded">
            <h4 className="text-sm font-medium mb-2">{label || 'Trend'}</h4>
            <div className="h-[300px]">
                <LineChart data={data} options={options} />
            </div>
        </div>
    );
}
