import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCattle } from '../../contexts/CattleContext';
import { formatDate } from '../../utils/dateUtils';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './CattleList.css';

const CattleList = () => {
  const { cattle, loading, error, deleteCattle, fetchCattle } = useCattle();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'tag_id', direction: 'asc' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cattleToDelete, setCattleToDelete] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [healthStatuses, setHealthStatuses] = useState({});
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const statusFilter = searchParams.get('status');
  
  const navigate = useNavigate();
  
  // Ensure cattle is an array before filtering
  const safeCattle = Array.isArray(cattle) ? cattle : [];
  
  // Fetch health status for all cattle
  useEffect(() => {
    const fetchHealthStatuses = async () => {
      const statuses = {};
      for (const cow of safeCattle) {
        try {
          const status = await getHealthStatus(cow);
          statuses[cow._id] = status;
        } catch (error) {
          console.error(`Error fetching status for cow ${cow._id}:`, error);
          statuses[cow._id] = { status: 'unknown', label: 'Error' };
        }
      }
      setHealthStatuses(statuses);
    };
    
    if (safeCattle.length > 0) {
      fetchHealthStatuses();
    }
  }, [safeCattle]); // Re-run when cattle data changes
  
  // Handle search and status filtering
  const filteredCattle = safeCattle.filter(cow => {
    // Apply status filter if present
    if (statusFilter) {
      if (statusFilter === 'healthy' && cow.health_status !== 'Healthy') {
        return false;
      } else if (statusFilter === 'at_risk' && cow.health_status !== 'At risk' && cow.health_status !== 'At Risk') {
        return false;
      }
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        cow.tag_id.toLowerCase().includes(searchLower) ||
        (cow.breed && cow.breed.toLowerCase().includes(searchLower)) ||
        (cow.location && cow.location.toLowerCase().includes(searchLower)) ||
        (cow.notes && cow.notes.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  // Handle sorting
  const sortedCattle = [...filteredCattle].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Handle delete confirmation
  const handleDeleteClick = (cow) => {
    setCattleToDelete(cow);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (cattleToDelete) {
      try {
        await deleteCattle(cattleToDelete._id);
        setShowDeleteModal(false);
        setCattleToDelete(null);
      } catch (err) {
        console.error('Error deleting cattle:', err);
      }
    }
  };

  // Get health status for a cow using the backend's health_status field
  const getHealthStatus = (cow) => {
    if (!cow.health_status) {
      return { status: 'unknown', label: 'No Data' };
    }

    // Map backend health status to frontend status
    const statusMap = {
      'Healthy': { status: 'healthy', label: 'Healthy' },
      'At risk': { status: 'critical', label: 'At Risk' },
      'At Risk': { status: 'critical', label: 'At Risk' },
      'critical': { status: 'critical', label: 'At Risk' },
      'at_risk': { status: 'critical', label: 'At Risk' },
      'needs_attention': { status: 'critical', label: 'At Risk' }
    };

    return statusMap[cow.health_status] || { status: 'unknown', label: 'Unknown' };
  };

  // Function to refresh cattle health status from the backend
  const analyzeHealth = async (cattleId) => {
    if (analyzing) return;
    
    setAnalyzing(true);
    try {
      // Simply refresh the cattle data to get the latest health status
      await fetchCattle();
      
      // Show success message
      toast.success('Health status refreshed successfully');
    } catch (error) {
      console.error('Error analyzing health:', error);
      toast.error(error.message || 'Failed to analyze health');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading cattle data...</div>;
  }

  if (error) {
    return <div className="error">Error loading cattle: {error}</div>;
  }

  return (
    <div className="cattle-list-container">
      <div className="cattle-list-header">
        <h1>Cattle Management</h1>
        <div className="actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search cattle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <i className="fas fa-search"></i>
          </div>
          <Link to="/cattle/new" className="btn btn-primary">
            <i className="fas fa-plus"></i> Add New Cattle
          </Link>
        </div>
      </div>

      <div className="cattle-table-container">
        <table className="cattle-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('tag_id')}>
                Tag ID {sortConfig.key === 'tag_id' && (
                  <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th>Health Status</th>
              <th onClick={() => requestSort('location')}>
                Location {sortConfig.key === 'location' && (
                  <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th>Sleeping Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedCattle.length > 0 ? (
              sortedCattle.map((cow) => {
                const healthStatus = healthStatuses[cow._id] || { status: 'loading', label: 'Loading...' };
                const lastReading = cow.health_readings && cow.health_readings.length > 0
                  ? cow.health_readings.reduce((latest, current) => 
                      new Date(latest.date) > new Date(current.date) ? latest : current
                    )
                  : null;

                return (
                  <tr key={cow._id}>
                    <td>
                      <Link to={`/cattle/${cow._id}`} className="cattle-link">
                        {cow.tag_id}
                      </Link>
                    </td>
                    <td>
                      <span className={`status-badge ${healthStatus.status}`}>
                        {healthStatus.label}
                      </span>
                    </td>
                    <td>{cow.location || 'N/A'}</td>
                    <td>
                      {lastReading?.sleeping_duration 
                        ? `${lastReading.sleeping_duration} hours`
                        : 'No data'}
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => analyzeHealth(cow._id)}
                          title="Analyze Health"
                        >
                          <i className="fas fa-heartbeat"></i> Analyze
                        </button>
                        <button 
                          className="btn btn-success btn-sm"
                          title="Add Health Reading"
                          onClick={() => {
                            navigate(`/cattle/${cow._id}`, { 
                              state: { showHealthForm: true },
                              search: '?tab=health'
                            });
                          }}
                        >
                          <i className="fas fa-plus-circle"></i> Add reading
                        </button>
                        <Link 
                          to={`/cattle/${cow._id}`} 
                          className="btn-icon"
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="no-data">
                  {searchTerm ? 'No matching cattle found' : 'No cattle data available'}
                  <br />
                  <Link to="/cattle/new" className="btn btn-outline">
                    Add Your First Cattle
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && cattleToDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button 
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete cattle with tag <strong>{cattleToDelete.tag_id}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CattleList;
