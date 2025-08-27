import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCattle } from '../../contexts/CattleContext';
import { useAuth } from '../../contexts/AuthContext';

const CattleForm = () => {
  const { addCattle } = useCattle();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    tag_id: '',
    farm_id: user?.farm_id || user?.farmId || '', // Handle both farm_id and farmId
    location: '',
    health_readings: [{
      tag_id: '', // Will be set to the same as cattle tag_id
      body_temperature: '',
      heart_rate: '',
      sleeping_duration: '',
      lying_down_duration: '',
      recorded_at: new Date().toISOString()
    }]
  });

  // Update farm_id when user context is available
  useEffect(() => {
    const userFarmId = user?.farm_id || user?.farmId;
    if (userFarmId) {
      setFormData(prev => ({
        ...prev,
        farm_id: userFarmId
      }));
    } else {
      console.error('No farm ID found in user object:', user);
    }
  }, [user]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHealthReadingChange = (index, e) => {
    const { name, value } = e.target;
    const newHealthReadings = [...formData.health_readings];
    newHealthReadings[index] = {
      ...newHealthReadings[index],
      [name]: name === 'body_temperature' || name === 'heart_rate' || name === 'respiratory_rate' || name === 'weight' 
        ? parseFloat(value) || '' 
        : value
    };
    
    setFormData(prev => ({
      ...prev,
      health_readings: newHealthReadings
    }));
  };

  // Update health reading tag_id when cattle tag_id changes
  useEffect(() => {
    if (formData.tag_id) {
      setFormData(prev => ({
        ...prev,
        health_readings: prev.health_readings.map(reading => ({
          ...reading,
          tag_id: formData.tag_id
        }))
      }));
    }
  }, [formData.tag_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.tag_id.trim()) {
        throw new Error('Tag ID is required');
      }
      
      const farmId = formData.farm_id || formData.farmId;
      if (!farmId) {
        console.error('No farm ID found in form data:', formData);
        throw new Error('User must be associated with a farm. Please log out and log in again.');
      }
      
      if (!formData.location.trim()) {
        throw new Error('Location is required');
      }

      // Validate health readings
      const hasInvalidReadings = formData.health_readings.some(reading => {
        return (
          isNaN(parseFloat(reading.body_temperature)) ||
          isNaN(parseFloat(reading.heart_rate)) ||
          isNaN(parseFloat(reading.sleeping_duration)) ||
          isNaN(parseFloat(reading.lying_down_duration))
        );
      });

      if (hasInvalidReadings) {
        throw new Error('Please enter valid numeric values for all health readings');
      }

      // Prepare the data to be sent
      const cattleData = {
        ...formData,
        health_readings: formData.health_readings.map(reading => ({
          ...reading,
          tag_id: formData.tag_id, // Ensure tag_id matches
          body_temperature: parseFloat(reading.body_temperature),
          heart_rate: parseFloat(reading.heart_rate),
          sleeping_duration: parseFloat(reading.sleeping_duration),
          lying_down_duration: parseFloat(reading.lying_down_duration),
          recorded_at: new Date().toISOString()
        }))
      };

      const result = await addCattle(cattleData);
      if (result.success) {
        navigate('/cattle');
      } else {
        throw new Error(result.error || 'Failed to add cattle');
      }
    } catch (err) {
      console.error('Error adding cattle:', err);
      setError(err.message || 'Failed to add cattle. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addHealthReading = () => {
    setFormData(prev => ({
      ...prev,
      health_readings: [
        ...prev.health_readings,
        {
          tag_id: formData.tag_id,
          body_temperature: '',
          heart_rate: '',
          sleeping_duration: '',
          lying_down_duration: '',
          recorded_at: new Date().toISOString()
        }
      ]
    }));
  };

  const removeHealthReading = (index) => {
    if (formData.health_readings.length === 1) return; // Keep at least one reading
    
    setFormData(prev => ({
      ...prev,
      health_readings: prev.health_readings.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="cattle-form-container">
      <div className="cattle-form-header">
        <h1>Add New Cattle</h1>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/cattle')}
        >
          Back to List
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="cattle-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Tag ID *</label>
              <input
                type="text"
                name="tag_id"
                value={formData.tag_id}
                onChange={handleChange}
                required
                placeholder="Enter unique tag ID"
              />
            </div>

            <div className="form-group">
              <label>Farm</label>
              <input
                type="text"
                value={formData.farm_id || 'Loading farm...'}
                disabled
                className="disabled-input"
              />
              {!formData.farm_id && (
                <div className="text-warning">
                  Warning: No farm associated with your account
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Location *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              placeholder="Enter location (e.g., Barn A, Pasture 1)"
            />
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3>Health Readings</h3>
            <button 
              type="button" 
              className="btn btn-sm btn-outline-primary"
              onClick={addHealthReading}
            >
              Add Reading
            </button>
          </div>

          {formData.health_readings.map((reading, index) => (
            <div key={index} className="health-reading-card">
              <div className="card-header">
                <h4>Reading {index + 1}</h4>
                {formData.health_readings.length > 1 && (
                  <button 
                    type="button" 
                    className="btn btn-sm btn-link text-danger"
                    onClick={() => removeHealthReading(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Body Temperature (°F) *</label>
                  <input
                    type="number"
                    step="0.1"
                    name="body_temperature"
                    value={reading.body_temperature}
                    onChange={(e) => handleHealthReadingChange(index, e)}
                    placeholder="e.g., 101.5"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Heart Rate (bpm) *</label>
                  <input
                    type="number"
                    name="heart_rate"
                    value={reading.heart_rate}
                    onChange={(e) => handleHealthReadingChange(index, e)}
                    placeholder="e.g., 70"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Sleeping Duration (minutes) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    name="sleeping_duration"
                    value={reading.sleeping_duration}
                    onChange={(e) => handleHealthReadingChange(index, e)}
                    placeholder="e.g., 360"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Lying Down Duration (minutes) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    name="lying_down_duration"
                    value={reading.lying_down_duration}
                    onChange={(e) => handleHealthReadingChange(index, e)}
                    placeholder="e.g., 480"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Recorded At</label>
                <input
                  type="datetime-local"
                  name="recorded_at"
                  value={reading.recorded_at ? new Date(reading.recorded_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleHealthReadingChange(index, e)}
                  className="form-control"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/cattle')}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Cattle'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CattleForm;
