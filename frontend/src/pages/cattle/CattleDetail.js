import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCattle } from '../../contexts/CattleContext';
import { formatDate, timeAgo } from '../../utils/dateUtils';
import HealthTimeline from '../../components/health/HealthTimeline';
import { cattleAPI } from '../../services/api';
import HealthStats from '../../components/health/HealthStats';
import './CattleDetail.css';

const CattleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    cattle, 
    updateCattle, 
    deleteCattle, 
    addHealthReading,
    loading,
    error
  } = useCattle();
  
  const [cow, setCow] = useState(null);
  
  // Find the cattle by ID from the context
  useEffect(() => {
    if (cattle && cattle.length > 0) {
      const foundCow = cattle.find(c => c._id === id);
      if (foundCow) {
        setCow(foundCow);
        setFormData({
          tag_id: foundCow.tag_id,
          breed: foundCow.breed || '',
          date_of_birth: foundCow.date_of_birth ? formatDate(new Date(foundCow.date_of_birth), 'yyyy-MM-dd') : '',
          gender: foundCow.gender || 'female',
          location: foundCow.location || '',
          notes: foundCow.notes || ''
        });
      }
    }
  }, [cattle, id]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    tag_id: '',
    breed: '',
    date_of_birth: '',
    gender: 'female',
    location: '',
    notes: ''
  });
  
  const [healthForm, setHealthForm] = useState({
    date: new Date().toISOString().split('T')[0],
    body_temperature: '',
    heart_rate: '',
    sleeping_duration: '',
    lying_down_duration: ''
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Handle tab from URL, location state, and show health form if needed
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const showForm = tab === 'health' || (location.state && location.state.showHealthForm);
    
    if (showForm) {
      setActiveTab('health');
      setShowHealthForm(true);
      
      // Pre-fill with previous reading data if available
      if (cow?.health_readings?.length > 0) {
        const latestReading = cow.health_readings.reduce((latest, current) => 
          new Date(latest.date) > new Date(current.date) ? latest : current
        );
        
        setHealthForm(prev => ({
          ...prev,
          body_temperature: latestReading.body_temperature || '',
          heart_rate: latestReading.heart_rate || '',
          sleeping_duration: latestReading.sleeping_duration || '',
          lying_down_duration: latestReading.lying_down_duration || ''
        }));
      }
      
      // Clear the location state to prevent the form from showing again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.search, location.state, cow]);

  // No need for separate fetch since we're using the context's cattle array

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle health form input changes
  const handleHealthInputChange = (e) => {
    const { name, value } = e.target;
    setHealthForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatedCow = await updateCattle(id, formData);
      setCow(updatedCow);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating cattle:', err);
    }
  };

  // Handle health analysis
  const handleAnalyzeHealth = async () => {
    if (!healthForm.body_temperature || !healthForm.heart_rate) {
      alert('Please fill in at least body temperature and heart rate for analysis');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      const analysisData = {
        body_temperature: parseFloat(healthForm.body_temperature),
        heart_rate: parseInt(healthForm.heart_rate, 10),
        sleeping_duration: healthForm.sleeping_duration ? parseFloat(healthForm.sleeping_duration) : 0,
        lying_down_duration: healthForm.lying_down_duration ? parseFloat(healthForm.lying_down_duration) : 0
      };
      
      const result = await cattleAPI.analyzeHealth(analysisData);
      setAnalysisResult(result);
    } catch (err) {
      console.error('Error analyzing health data:', err);
      alert(`Failed to analyze health data: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // State for notification
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Handle health form submission
  const handleHealthSubmit = async (e) => {
    e.preventDefault();
    
    // Check if required fields are filled
    if (!healthForm.body_temperature || !healthForm.heart_rate) {
      setNotification({
        show: true,
        message: 'Please fill in all required fields (temperature and heart rate)',
        type: 'error'
      });
      setTimeout(() => setNotification({ ...notification, show: false }), 5000);
      return;
    }
    
    try {
      const newReading = {
        ...healthForm,
        date: new Date(healthForm.date).toISOString(),
        tag_id: cow.tag_id // Include the cattle's tag_id in the reading
      };
      
      // Show loading state
      setNotification({ show: true, message: 'Adding health reading...', type: 'info' });
      
      // Add the new health reading
      const result = await addHealthReading(id, newReading);
      
      if (result && result.success) {
        // Update the local cow state with the new reading
        const updatedCow = {
          ...cow,
          health_readings: [
            ...(cow.health_readings || []),
            { 
              ...newReading, 
              _id: Date.now().toString(), // Temporary ID until next refresh
              tag_id: cow.tag_id // Ensure tag_id is included in local state
            }
          ]
        };
        
        setCow(updatedCow);
        
        // Show success message
        setNotification({
          show: true,
          message: 'Health reading added successfully!',
          type: 'success'
        });
        
        // Reset the form
        setHealthForm({
          date: new Date().toISOString().split('T')[0],
          body_temperature: '',
          heart_rate: '',
          sleeping_duration: '',
          lying_down_duration: ''
        });
        
        // Only close the form if we're not in the health tab
        if (activeTab !== 'health') {
          setTimeout(() => {
            setShowHealthForm(false);
            setNotification({ show: false, message: '', type: '' });
          }, 2000);
        } else {
          setTimeout(() => {
            setNotification({ show: false, message: '', type: '' });
          }, 3000);
        }
      } else {
        throw new Error('Failed to add health reading');
      }
    } catch (err) {
      console.error('Error adding health reading:', err);
      setNotification({
        show: true,
        message: `Failed to add health reading: ${err.message || 'Please try again'}`,
        type: 'error'
      });
      setTimeout(() => setNotification({ ...notification, show: false }), 5000);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      await deleteCattle(id);
      navigate('/cattle');
    } catch (err) {
      console.error('Error deleting cattle:', err);
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return 'Unknown';
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      years--;
    }
    return years > 0 ? `${years} year${years !== 1 ? 's' : ''}` : 'Less than a year';
  };

  // Get latest health reading
  const getLatestReading = () => {
    if (!cow?.health_readings?.length) return null;
    return [...cow.health_readings].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    )[0];
  };

  const latestReading = getLatestReading();

  if (loading && !cow) {
    return <div className="loading">Loading cattle details...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!cow) {
    return <div className="not-found">Cattle not found</div>;
  }

  // Notification component
  const Notification = () => {
    if (!notification.show) return null;
    
    const getNotificationClass = () => {
      switch (notification.type) {
        case 'success':
          return 'notification success';
        case 'error':
          return 'notification error';
        case 'info':
          return 'notification info';
        default:
          return 'notification';
      }
    };
    
    return (
      <div className={getNotificationClass()}>
        <div className="notification-message">{notification.message}</div>
      </div>
    );
  };

  return (
    <div className="cattle-detail">
      {notification.show && <Notification />}
      {/* Header Section */}
      <div className="cattle-header">
        <div className="header-content">
          <div className="cow-identity">
            <h1>
              {isEditing ? (
                <input
                  type="text"
                  name="tag_id"
                  value={formData.tag_id}
                  onChange={handleInputChange}
                  className="form-control"
                />
              ) : (
                `#${cow.tag_id}`
              )}
            </h1>
            <div className="cow-meta">
              {isEditing ? (
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="castrated">Castrated</option>
                </select>
              ) : (
                <span className={`gender ${cow.gender || 'unknown'}`}>
                  {cow.gender || 'Unknown gender'}
                </span>
              )}
              {formData.date_of_birth && (
                <span className="age">
                  {calculateAge(formData.date_of_birth)} old
                </span>
              )}
            </div>
          </div>
          
          <div className="header-actions">
            {isEditing ? (
              <>
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form data
                    setFormData({
                      tag_id: cow.tag_id,
                      breed: cow.breed || '',
                      date_of_birth: cow.date_of_birth ? formatDate(new Date(cow.date_of_birth), 'yyyy-MM-dd') : '',
                      gender: cow.gender || 'female',
                      location: cow.location || '',
                      notes: cow.notes || ''
                    });
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleSubmit}
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button 
                  className="btn btn-outline"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Details
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowHealthForm(true)}
                >
                  Add Health Reading
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="cattle-content">
        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'health' ? 'active' : ''}`}
            onClick={() => setActiveTab('health')}
          >
            Health
          </button>
          <button 
            className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Notes
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="grid-layout">
                {/* Left Column */}
                <div className="info-card">
                  <h3>Basic Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Tag ID:</span>
                      <span className="info-value">
                        {isEditing ? (
                          <input
                            type="text"
                            name="tag_id"
                            value={formData.tag_id}
                            onChange={handleInputChange}
                            className="form-control"
                          />
                        ) : (
                          cow.tag_id
                        )}
                      </span>
                    </div>
                    
                    <div className="info-item">
                      <span className="info-label">Breed:</span>
                      <span className="info-value">
                        {isEditing ? (
                          <input
                            type="text"
                            name="breed"
                            value={formData.breed}
                            onChange={handleInputChange}
                            className="form-control"
                          />
                        ) : (
                          cow.breed || 'Not specified'
                        )}
                      </span>
                    </div>
                    
                    <div className="info-item">
                      <span className="info-label">Date of Birth:</span>
                      <span className="info-value">
                        {isEditing ? (
                          <input
                            type="date"
                            name="date_of_birth"
                            value={formData.date_of_birth}
                            onChange={handleInputChange}
                            className="form-control"
                          />
                        ) : (
                          cow.date_of_birth ? formatDate(new Date(cow.date_of_birth)) : 'Unknown'
                        )}
                      </span>
                    </div>
                    
                    <div className="info-item">
                      <span className="info-label">Age:</span>
                      <span className="info-value">
                        {calculateAge(cow.date_of_birth)}
                      </span>
                    </div>
                    
                    <div className="info-item">
                      <span className="info-label">Location:</span>
                      <span className="info-value">
                        {isEditing ? (
                          <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            className="form-control"
                          />
                        ) : (
                          cow.location || 'Not specified'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="health-card">
                  <div className="card-header">
                    <h3>Health Summary</h3>
                    {latestReading && (
                      <span className="last-updated">
                        Last updated: {timeAgo(latestReading.date)}
                      </span>
                    )}
                  </div>
                  
                  {latestReading ? (
                    <div className="health-metrics">
                      <div className={`metric ${latestReading.body_temperature > 102.5 ? 'critical' : latestReading.body_temperature > 101.5 ? 'warning' : ''}`}>
                        <div className="metric-value">
                          {latestReading.body_temperature}°F
                        </div>
                        <div className="metric-label">Temperature</div>
                        <div className="metric-range">
                          Normal: 100.4°F - 102.5°F
                        </div>
                      </div>
                      
                      <div className={`metric ${latestReading.heart_rate > 80 ? 'critical' : latestReading.heart_rate > 70 ? 'warning' : ''}`}>
                        <div className="metric-value">
                          {latestReading.heart_rate} BPM
                        </div>
                        <div className="metric-label">Heart Rate</div>
                        <div className="metric-range">
                          Normal: 48 - 84 BPM
                        </div>
                      </div>
                      
                      <div className="metric">
                        <div className="metric-value">
                          {latestReading.sleeping_duration || '--'} hours
                        </div>
                        <div className="metric-label">Sleeping Duration</div>
                      </div>
                      
                      <div className="metric">
                        <div className="metric-value">
                          {latestReading.lying_down_duration || '--'} hours
                        </div>
                        <div className="metric-label">Lying Down Duration</div>
                      </div>
                    </div>
                  ) : (
                    <div className="no-readings">
                      <p>No health readings available</p>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowHealthForm(true)}
                      >
                        Add First Reading
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              <div className="notes-section">
                <h3>Notes</h3>
                {isEditing ? (
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="form-control"
                    rows="4"
                    placeholder="Add notes about this cattle..."
                  />
                ) : (
                  <div className="notes-content">
                    {cow.notes ? (
                      <p>{cow.notes}</p>
                    ) : (
                      <p className="no-notes">No notes available</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="health-tab">
              {!showHealthForm ? (
                <>
                  {cow.health_readings?.length > 0 ? (
                    <>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h3>Health History</h3>
                        <button 
                          className="btn btn-primary"
                          onClick={() => setShowHealthForm(true)}
                        >
                          <i className="fas fa-plus"></i> Add New Reading
                        </button>
                      </div>
                      <HealthStats healthReadings={cow.health_readings} />
                      <HealthTimeline healthReadings={cow.health_readings} />
                    </>
                  ) : (
                    <div className="no-health-data text-center py-5">
                      <div className="mb-3">
                        <i className="fas fa-heartbeat fa-4x text-muted mb-3"></i>
                        <h4>No Health Data Available</h4>
                        <p className="text-muted">Add your first health reading to start monitoring this cattle's health.</p>
                      </div>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowHealthForm(true)}
                      >
                        <i className="fas fa-plus"></i> Add First Reading
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="health-form-container">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3>Add Health Reading</h3>
                    <button 
                      className="btn btn-link text-muted"
                      onClick={() => setShowHealthForm(false)}
                    >
                      <i className="fas fa-arrow-left"></i> Back to Health History
                    </button>
                  </div>
                  <form onSubmit={handleHealthSubmit} className="health-reading-form">
                    <div className="form-row">
                      <div className="form-group col-md-4">
                        <label>Tag ID</label>
                        <input
                          type="text"
                          value={cow?.tag_id || ''}
                          className="form-control"
                          readOnly
                          disabled
                        />
                      </div>
                      <div className="form-group col-md-4">
                        <label>Date</label>
                        <input
                          type="date"
                          name="date"
                          value={healthForm.date}
                          onChange={handleHealthInputChange}
                          className="form-control"
                          required
                        />
                      </div>
                      <div className="form-group col-md-4">
                        <label>Body Temperature (°F)</label>
                        <input
                          type="number"
                          name="body_temperature"
                          value={healthForm.body_temperature}
                          onChange={handleHealthInputChange}
                          className="form-control"
                          step="0.1"
                          min="90"
                          max="110"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group col-md-4">
                        <label>Heart Rate (BPM)</label>
                        <input
                          type="number"
                          name="heart_rate"
                          value={healthForm.heart_rate}
                          onChange={handleHealthInputChange}
                          className="form-control"
                          min="30"
                          max="150"
                          required
                        />
                      </div>
                      <div className="form-group col-md-4">
                        <label>Sleeping Duration (hours)</label>
                        <input
                          type="number"
                          name="sleeping_duration"
                          value={healthForm.sleeping_duration}
                          onChange={handleHealthInputChange}
                          className="form-control"
                          min="0"
                          step="0.1"
                          required
                        />
                      </div>
                      <div className="form-group col-md-4">
                        <label>Lying Down Duration (hours)</label>
                        <input
                          type="number"
                          name="lying_down_duration"
                          value={healthForm.lying_down_duration}
                          onChange={handleHealthInputChange}
                          className="form-control"
                          min="0"
                          step="0.1"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-actions mt-4">
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary mr-2"
                        onClick={() => setShowHealthForm(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        type="button"
                        className="btn btn-info mr-2"
                        onClick={handleAnalyzeHealth}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? 'Analyzing...' : 'Analyze Health'}
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                      >
                        Save Health Reading
                      </button>
                    </div>
                    
                    {analysisResult && (
                      <div className="analysis-result mt-4 p-3 bg-light rounded">
                        <h5>Analysis Result:</h5>
                        <pre className="mb-0">{JSON.stringify(analysisResult, null, 2)}</pre>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="notes-tab">
              <h3>Detailed Notes</h3>
              {isEditing ? (
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="form-control notes-textarea"
                  rows="10"
                  placeholder="Add detailed notes about this cattle..."
                />
              ) : (
                <div className="notes-content">
                  {cow.notes ? (
                    <div className="formatted-notes">
                      {cow.notes.split('\n').map((paragraph, i) => (
                        <p key={i}>{paragraph || <br />}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="no-notes">No detailed notes available</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Health Reading Form Modal */}
      {showHealthForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add Health Reading</h3>
              <button 
                className="close-btn"
                onClick={() => setShowHealthForm(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleHealthSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    name="date"
                    value={healthForm.date}
                    onChange={handleHealthInputChange}
                    className="form-control"
                    required
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Body Temperature (°F)</label>
                    <input
                      type="number"
                      name="body_temperature"
                      value={healthForm.body_temperature}
                      onChange={handleHealthInputChange}
                      className="form-control"
                      step="0.1"
                      min="15"
                      max="50"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Heart Rate (BPM)</label>
                    <input
                      type="number"
                      name="heart_rate"
                      value={healthForm.heart_rate}
                      onChange={handleHealthInputChange}
                      className="form-control"
                      min="30"
                      max="150"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Sleeping Duration (hours)</label>
                    <input
                      type="number"
                      name="sleeping_duration"
                      value={healthForm.sleeping_duration}
                      onChange={handleHealthInputChange}
                      className="form-control"
                      min="0"
                      step="0.1"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Lying Down Duration (hours)</label>
                    <input
                      type="number"
                      name="lying_down_duration"
                      value={healthForm.lying_down_duration}
                      onChange={handleHealthInputChange}
                      className="form-control"
                      min="0"
                      step="0.1"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-actions mt-4">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary mr-2"
                    onClick={() => setShowHealthForm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    className="btn btn-info mr-2"
                    onClick={handleAnalyzeHealth}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Health'}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Health Record
                  </button>
                </div>
                {analysisResult && (
                  <div className="mt-3 p-3 bg-light rounded">
                    <h5>Analysis Result:</h5>
                    <pre className="mb-0">{JSON.stringify(analysisResult, null, 2)}</pre>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
                Are you sure you want to delete {cow.tag_id}? 
                This will permanently remove all records and cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete Cattle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="danger-zone">
        <h3>Danger Zone</h3>
        <div className="danger-content">
          <div>
            <h4>Delete this cattle</h4>
            <p>Once you delete this cattle, there is no going back. Please be certain.</p>
          </div>
          <button 
            className="btn btn-danger"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Cattle
          </button>
        </div>
      </div>
    </div>
  );
};

export default CattleDetail;
