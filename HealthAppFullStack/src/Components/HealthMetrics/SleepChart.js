import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function formatDate(d) {
  const dt = new Date(d);
  return dt.toISOString().slice(0, 10);
}

export default function SleepChart({ sleep = [] }) {
  // sleep records expected: { value, startDate, endDate }
  // Compute total sleep duration (hours) per date (group by start date)
  const totals = {};
  sleep.forEach((rec) => {
    try {
      const start = new Date(rec.startDate);
      const end = new Date(rec.endDate || rec.startDate);
      const day = formatDate(start);
      const durationMs = Math.max(0, end - start);
      const hours = durationMs / (1000 * 60 * 60);
      totals[day] = (totals[day] || 0) + hours;
    } catch (e) {
      // ignore bad records
    }
  });

  const labels = Object.keys(totals).sort();
  const data = labels.map((l) => Math.round(totals[l] * 100) / 100);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Sleep (hours)',
        data,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Daily Sleep (hours)' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Hours' } },
      x: { title: { display: true, text: 'Date' } },
    },
  };

  if (labels.length === 0) {
    return <p className="text-center text-gray-600">No sleep data available.</p>;
  }

  return (
    <div className="w-full h-[420px] p-4 bg-gray-50 rounded-lg shadow-lg">
      <Bar data={chartData} options={options} />
    </div>
  );
}
