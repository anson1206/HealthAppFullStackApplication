import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function WorkoutsPieChart({ workouts }) {
    console.log("WorkoutsPieChart received workouts:", workouts);
  
    const workoutCounts = workouts.reduce((acc, workout) => {
        const type = workout.workoutType || "Unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
  
    const labels = Object.keys(workoutCounts);
    const dataValues = Object.values(workoutCounts);
  
    const data = {
        labels,
        datasets: [
            {
                data: dataValues,
                backgroundColor: [
                    "rgba(255, 99, 132, 0.6)",
                    "rgba(54, 162, 235, 0.6)",
                    "rgba(255, 206, 86, 0.6)",
                    "rgba(75, 192, 192, 0.6)",
                    "rgba(153, 102, 255, 0.6)",
                    "rgba(255, 159, 64, 0.6)",
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: "bottom",
                labels: {
                    font: {
                        size: 12,
                    },
                    boxwidth: 12,
                    padding: 4
                },
             }
        }
    };
  
    return (
        <div
            className="p-4 bg-white rounded-lg shadow-md"
            style={{ width: "300px", height: "300px", margin: "0 auto" }}
        >
            <h2 className="text-xl font-bold mb-4 text-center">Workout Distribution</h2>
            <Pie data={data} options={options} />
        </div>
    );
}
  
export default WorkoutsPieChart;