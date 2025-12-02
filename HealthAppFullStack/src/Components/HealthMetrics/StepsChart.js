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
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function formatDate(d) {
  const dt = new Date(d);
  return dt.toISOString().slice(0, 10);
}

export default function StepsChart({ steps = [] }) {
  // steps records expected: { steps, date }
  const totals = {};
  steps.forEach((rec) => {
    try {
      const dt = new Date(rec.date || rec.startDate || rec.endDate);
      const day = formatDate(dt);
      const count = Number(rec.steps || rec.value || 0);
      totals[day] = (totals[day] || 0) + (isNaN(count) ? 0 : count);
    } catch (e) {
      // ignore
    }
  });

  const labels = Object.keys(totals).sort();
  const data = labels.map((l) => totals[l]);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Steps',
        data,
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Daily Steps' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Steps' } },
      x: { title: { display: true, text: 'Date' } },
    },
  };

  if (labels.length === 0) {
    return <p className="text-center text-gray-600">No step count data available.</p>;
  }

  return (
    <div className="w-full h-[420px] p-4 bg-gray-50 rounded-lg shadow-lg">
      <Line data={chartData} options={options} />
    </div>
  );
}
