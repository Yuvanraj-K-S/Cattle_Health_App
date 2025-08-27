import React, { useRef, useEffect, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import { formatDate } from '../../utils/dateUtils';
import './HealthStats.css';

// Register all Chart.js components
Chart.register(...registerables);

const HealthStats = ({ healthReadings = [] }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  const chartData = useMemo(() => {
    if (!healthReadings || healthReadings.length === 0) {
      return { labels: [], datasets: [] };
    }
    
    const sortedReadings = [...healthReadings].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return {
      labels: sortedReadings.map(reading => formatDate(reading.date, { short: true })),
      datasets: [
        {
          label: 'Temperature (°F)',
          data: sortedReadings.map(reading => reading.body_temperature),
          borderColor: '#e67e22',
          backgroundColor: 'rgba(230, 126, 34, 0.1)',
          tension: 0.3,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'Heart Rate (BPM)',
          data: sortedReadings.map(reading => reading.heart_rate),
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          tension: 0.3,
          fill: true,
          yAxisID: 'y1'
        }
      ]
    };
  }, [healthReadings]);

  useEffect(() => {
    if (!chartRef.current) return;

    // Get the canvas context
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart instance if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
    
    // Only create chart if we have data
    if (healthReadings && healthReadings.length > 0) {
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Date'
              }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Temperature (°F)'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Heart Rate (BPM)'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          }
        }
      });
    }
    
    // Cleanup function to destroy chart on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [chartData, healthReadings]);

  if (!healthReadings || healthReadings.length === 0) {
    return (
      <div className="health-stats">
        <h3>Health Metrics</h3>
        <p>No health data available</p>
      </div>
    );
  }

  return (
    <div className="health-stats">
      <h3>Health Metrics Over Time</h3>
      <div style={{ position: 'relative', height: '400px', width: '100%' }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  );
};

export default HealthStats;
