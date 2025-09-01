import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCattle } from '../contexts/CattleContext';
import { formatDate } from '../utils/dateUtils';
import './Dashboard.css';

const Dashboard = () => {
  const { cattle, loading, error, refreshCattle } = useCattle();
  const [stats, setStats] = useState({
    total: 0,
    healthy: 0,
    needsAttention: 0,
    critical: 0,
  });
  
  const [recentActivity, setRecentActivity] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        await refreshCattle();
      } catch (err) {
        console.error('Failed to fetch cattle data:', err);
      }
    };
    
    loadData();
  }, [refreshCattle]);

  useEffect(() => {
    if (cattle.length > 0) {
      // Calculate stats
      const total = cattle.length;
      let healthy = 0;
      let needsAttention = 0;
      let critical = 0;
      
      cattle.forEach(cow => {
        switch (cow.health_status) {
          case 'At risk':
            critical++;
            break;
          case 'Needs Attention':
            needsAttention++;
            break;
          case 'Healthy':
          default:
            healthy++;
            break;
        }
      });
      
      setStats({ total, healthy, needsAttention, critical });
      
      // Prepare recent activity
      const activities = [];
      cattle.forEach(cow => {
        if (cow.health_readings && cow.health_readings.length > 0) {
          const latestReading = cow.health_readings.reduce((latest, current) => {
            return new Date(latest.date) > new Date(current.date) ? latest : current;
          }, cow.health_readings[0]);
          
          activities.push({
            id: cow._id,
            tagId: cow.tag_id,
            date: latestReading.date,
            temperature: latestReading.body_temperature,
            heartRate: latestReading.heart_rate,
            status: latestReading.body_temperature > 102.5 || latestReading.heart_rate > 80 ? 'critical' : 
                    latestReading.body_temperature > 101.5 || latestReading.heart_rate > 70 ? 'warning' : 'normal'
          });
        }
      });
      
      // Sort by date, newest first
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentActivity(activities.slice(0, 5));
    }
  }, [cattle]);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">Error loading dashboard: {error}</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="dashboard-actions">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/cattle/new')}
          >
            Add New Cattle
          </button>
        </div>
      </div>
      
      <div className="stats-container">
        <div className="stat-card total">
          <h3>Total Cattle</h3>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-icon">🐄</div>
        </div>
        
        <div className="stat-card healthy">
          <h3>Healthy</h3>
          <div className="stat-value">{stats.healthy}</div>
          <div className="stat-icon">✅</div>
        </div>
        
        <div className="stat-card critical">
          <h3>At Risk</h3>
          <div className="stat-value">{stats.critical}</div>
          <div className="stat-icon">🚨</div>
        </div>
      </div>
      
      <div className="dashboard-sections">
        <div className="recent-activity">
          <h2>Recent Activity</h2>
          {recentActivity.length > 0 ? (
            <div className="activity-list">
              {recentActivity.map(activity => (
                <div key={`${activity.id}-${activity.date}`} className={`activity-item ${activity.status}`}>
                  <div className="activity-meta">
                    <span className="activity-tag">🐄 {activity.tagId}</span>
                    <span className="activity-date">
                      {activity.date ? formatDate(activity.date, { relative: true }) : 'Just now'}
                    </span>
                  </div>
                  <div className="activity-details">
                    <span>🌡️ {activity.temperature}°F</span>
                    <span>❤️ {activity.heartRate} BPM</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-activity">
              <p>No recent activity found</p>
              <button 
                className="btn btn-outline"
                onClick={() => navigate('/cattle')}
              >
                View All Cattle
              </button>
            </div>
          )}
        </div>
        
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button 
              className="action-btn"
              onClick={() => navigate('/cattle/new')}
            >
              <span className="icon">➕</span>
              <span>Add New Cattle</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/cattle')}
            >
              <span className="icon">📋</span>
              <span>View All Cattle</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/reports')}
            >
              <span className="icon">📊</span>
              <span>View Reports</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/settings')}
            >
              <span className="icon">⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
