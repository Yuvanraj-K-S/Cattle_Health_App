import React from 'react';
import { formatDate } from '../../utils/dateUtils';
import './HealthTimeline.css';

const HealthTimeline = ({ healthReadings = [] }) => {
  if (healthReadings.length === 0) {
    return <div className="empty-state">No health readings available</div>;
  }

  return (
    <div className="health-timeline">
      <h3>Health History</h3>
      <div className="timeline">
        {healthReadings.map((reading) => (
          <div key={reading._id} className="timeline-item">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="date">{formatDate(reading.date)}</span>
                <div className="metrics">
                  <span className="metric temp">{reading.body_temperature}°F</span>
                  <span className="metric bpm">{reading.heart_rate} BPM</span>
                  {reading.respiratory_rate && (
                    <span className="metric resp">{reading.respiratory_rate} RPM</span>
                  )}
                </div>
              </div>
              {reading.notes && (
                <div className="timeline-notes">
                  <p>{reading.notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HealthTimeline;
