import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Downsample labels and datasets to a maximum number of points to keep charts responsive
function downsampleData(data, maxPoints = 2000) {
  try {
    const labels = data.labels || [];
    const datasets = data.datasets || [];
    const len = labels.length;
    if (len <= maxPoints) return data;
    const stride = Math.ceil(len / maxPoints);
    const newLabels = labels.filter((_, i) => i % stride === 0);
    const newDatasets = datasets.map((ds) => ({
      ...ds,
      data: (ds.data || []).filter((_, i) => i % stride === 0),
    }));
    return { ...data, labels: newLabels, datasets: newDatasets };
  } catch (e) {
    return data;
  }
}

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 12 } },
    tooltip: {
      enabled: true,
      mode: 'nearest',
      intersect: false,
      padding: 8,
      callbacks: {
        label: function (context) {
          const v = context.raw;
          if (v === null || v === undefined) return '';
          // format numbers nicely
          if (typeof v === 'number') return Number(v).toLocaleString();
          if (typeof v === 'object' && v !== null) {
            // if object contains a numeric value field
            const val = v.value ?? v.distance ?? v.energy ?? v.heartRate ?? Object.values(v)[0];
            if (typeof val === 'number') return Number(val).toLocaleString();
            return JSON.stringify(v);
          }
          return String(v);
        },
      },
    },
  },
  elements: {
    point: { radius: 2, hoverRadius: 6, hoverBorderWidth: 2 },
    line: { tension: 0.25, borderWidth: 2 },
  },
  layout: { padding: { top: 8, bottom: 8, left: 6, right: 6 } },
  scales: {
    x: {
      grid: { display: false },
      ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
      title: { display: true, text: 'Time', color: '#374151' },
    },
    y: {
      grid: { color: 'rgba(15,23,42,0.06)' },
      ticks: {
        callback: function(value) { return Number(value).toLocaleString(); }
      },
      title: { display: true, text: '', color: '#374151' },
    },
  },
};

export const LineChart = ({ data, options = {} }) => {
  const ds = downsampleData(data, 2000);

  // Enhance the first dataset with sensible defaults if missing
  const enhancedData = { ...ds };
  if (enhancedData.datasets && enhancedData.datasets.length > 0) {
    const base = { ...enhancedData.datasets[0] };
    base.fill = base.fill ?? true;
    base.borderColor = base.borderColor || 'rgba(59,130,246,1)';
    base.backgroundColor = base.backgroundColor || 'rgba(59,130,246,0.12)';
    base.pointBackgroundColor = base.pointBackgroundColor || 'rgba(59,130,246,1)';
    base.pointBorderColor = base.pointBorderColor || 'rgba(255,255,255,0.8)';
    base.pointHoverBackgroundColor = base.pointHoverBackgroundColor || 'rgba(59,130,246,1)';
    enhancedData.datasets = [base, ...enhancedData.datasets.slice(1)];
  }

  const mergedOptions = { ...baseOptions, ...options };
  return <Line data={enhancedData} options={mergedOptions} />;
};

export default LineChart;