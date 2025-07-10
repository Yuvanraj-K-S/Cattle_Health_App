let profile = true; // true means closed, false means open
let options = true;
let healthAlerts = [];
let currentView = 'menu'; // 'menu', 'profile', or 'alerts'
const predictionCache = {};  // cattleId => ["healthy", "at risk", ...]


// Display cattle list on page load and start health monitoring
window.onload = () => {
    displayList();
    startHealthMonitoring();
    setupClickOutsideHandler();
    // Ensure profile dropdown is hidden initially
    const profileDetail = document.getElementById("profileDetail");
    profileDetail.style.display = "none";
};

// Setup click outside handler
function setupClickOutsideHandler() {
    document.addEventListener('click', (e) => {
        const profileButton = document.getElementById('profile');
        const profileDetail = document.getElementById('profileDetail');
        const optionButton = document.getElementById('optionLogo');
        const optionDetail = document.getElementById('option');

        if (!profileButton.contains(e.target) && !profileDetail.contains(e.target)) {
            hideProfileDropdown();
        }

        if (!optionButton.contains(e.target) && !optionDetail.contains(e.target)) {
            hideOptionDropdown();
        }
    });
}

function displayList() {
    const ele = document.getElementById("displayListSpace");
    if (!ele) {
        console.error("displayListSpace element not found");
        return;
    }

    ele.innerHTML = `
        <div class="list-header">
            <h2 class="list-title"><i class="fas fa-list"></i> Your Cattle</h2>
            <div class="health-summary">
                <span class="summary-item"><i class="fas fa-thermometer-half"></i> Avg Temp: <span id="avgTemp">-</span></span>
                <span class="summary-item"><i class="fas fa-heartbeat"></i> Avg Heart Rate: <span id="avgHeart">-</span></span>
                <span class="summary-item"><i class="fas fa-database"></i> Total Cattle: <span id="totalCattle">-</span></span>
            </div>
        </div>
        <div class="list-subheader">
            <span class="cattle-id">Tag ID</span>
            <span class="cattle-data">Avg Temp (°C)</span>
            <span class="cattle-data">Avg Heart Rate</span>
            <span class="cattle-data">Readings</span>
            <span class="cattle-place">Location</span>
            <span class="cattle-actions">Actions</span>
        </div>
        <ul class="cattle-list" id="dis"></ul>
        <div class="add-cattle-container">
            <button class="button add-cattle-button" onclick="addNewCattle()">
                <i class="fas fa-plus"></i> Add New Cattle
            </button>
        </div>
    `;

    const dis = document.getElementById("dis");
    if (!dis) {
        console.error("Cattle list element (dis) not found");
        return;
    }

    fetch("http://localhost:3001/api/cattle")
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            // Clear previous content safely
            while (dis.firstChild) {
                dis.removeChild(dis.firstChild);
            }
            
            console.log("API Response:", data);
            
            if (!Array.isArray(data)) {
                const errorMsg = data.error || 'Invalid data format received from server';
                const errorItem = document.createElement("li");
                errorItem.className = "error";
                errorItem.textContent = errorMsg;
                dis.appendChild(errorItem);
                return;
            }
            
            if (data.length === 0) {
                const noCattleItem = document.createElement("li");
                noCattleItem.className = "no-cattle";
                noCattleItem.textContent = "No cattle found. Add your first cattle!";
                dis.appendChild(noCattleItem);
                return;
            }
            
            // Update summary
            const totalCattleEl = document.getElementById("totalCattle");
            const avgTempEl = document.getElementById("avgTemp");
            const avgHeartEl = document.getElementById("avgHeart");
            
            if (totalCattleEl) totalCattleEl.textContent = data.length;
            
            // Calculate averages for summary
            const validCattle = data.filter(item => item.avg_temp !== null && item.avg_heart !== null);
            const avgTemp = validCattle.length > 0 
                ? validCattle.reduce((sum, item) => sum + item.avg_temp, 0) / validCattle.length 
                : 0;
            const avgHeart = validCattle.length > 0
                ? validCattle.reduce((sum, item) => sum + item.avg_heart, 0) / validCattle.length
                : 0;
            
            if (avgTempEl) avgTempEl.textContent = avgTemp.toFixed(1) + '°C';
            if (avgHeartEl) avgHeartEl.textContent = Math.round(avgHeart) + ' bpm';
            
            // Process each cattle item
            data.forEach(item => {
                const li = document.createElement("li");
                li.className = "cattle-item";
                li.innerHTML = `
                    <div class="cattle-info">
                        <span class="cattle-id">${item.tag_id}</span>
                        <span class="cattle-data ${getHealthClass(item.avg_temp, 'temp')}">
                            ${item.avg_temp !== null ? item.avg_temp.toFixed(1) : 'N/A'}°C
                        </span>
                        <span class="cattle-data ${getHealthClass(item.avg_heart, 'heart')}">
                            ${item.avg_heart !== null ? Math.round(item.avg_heart) : 'N/A'} bpm
                        </span>
                        <span class="cattle-readings">
                            ${item.readings_count} reading(s)
                        </span>
                        <span class="cattle-place">${item.location}</span>
                        <div class="cattle-actions">
                            <button class="icon-button small add" onclick="addCattleReading('${item._id}')">
                                <i class="fas fa-plus-circle"></i>
                            </button>
                            <button class="icon-button small health" onclick="analyzeHealth('${item._id}')">
                                <i class="fas fa-heartbeat"></i>
                            </button>
                            <button class="icon-button small view" onclick="viewDetails('${item._id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="icon-button small delete" onclick="removeCattle('${item._id}', '${item.tag_id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                dis.appendChild(li);
            });
        })
        .catch(err => {
            console.error("Error:", err);
            const errorItem = document.createElement("li");
            errorItem.className = "error";
            errorItem.textContent = 'Error loading data: ' + err.message;
            if (dis) {
                dis.appendChild(errorItem);
            } else {
                console.error("Could not display error - cattle list element not found");
            }
        });
}

// Health analysis functions
async function analyzeHealth(cattleId) {
  try {
    const loading = Swal.fire({
      title: 'Analyzing Health...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // Fetch readings
    const readingsRes = await fetch(`http://localhost:3001/api/cattle/${cattleId}/readings`);
    if (!readingsRes.ok) throw new Error('Failed to fetch readings');
    const readings = await readingsRes.json();
    if (!readings || !readings.length) {
      await loading.close();
      return Swal.fire('No Data', 'No health readings available', 'info');
    }

    let predictions = predictionCache[cattleId] || [];

    // First time: Analyze all
    if (predictions.length === 0) {
      const batchResults = await Promise.all(
        readings.map(reading =>
          fetch('http://localhost:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reading)
          }).then(res => res.json())
        )
      );
      predictions = batchResults.map(r => r.status);
      predictionCache[cattleId] = predictions; // store in cache
    } else if (readings.length > predictions.length) {
      // Only predict new readings
      const newReadings = readings.slice(predictions.length);
      const newResults = await Promise.all(
        newReadings.map(reading =>
          fetch('http://localhost:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reading)
          }).then(res => res.json())
        )
      );
      const newStatuses = newResults.map(r => r.status);
      predictionCache[cattleId].push(...newStatuses);
      predictions = predictionCache[cattleId];
    }

    // Count stats
    const total = predictions.length;
    const healthy = predictions.filter(p => p === "healthy").length;
    const atRisk = total - healthy;
    const riskPercent = ((atRisk / total) * 100).toFixed(1);
    const isAtRisk = atRisk > healthy;

    await loading.close();

    // Add alert if necessary
    if (isAtRisk) {
      const cattleRes = await fetch(`http://localhost:3001/api/cattle/${cattleId}`);
      if (cattleRes.ok) {
        const cattle = await cattleRes.json();
        const lastReading = readings[readings.length - 1];
        addHealthAlert(cattle.tag_id, lastReading);
      }
    }

    return Swal.fire({
      icon: isAtRisk ? 'error' : 'success',
      title: isAtRisk ? 'Health Risk Detected' : 'Generally Healthy',
      html: `
        <div class="health-analysis-summary">
          <p><strong>Analyzed ${total} readings</strong></p>
          <div class="health-metric"><span>✅ Healthy:</span> <span>${healthy}</span></div>
          <div class="health-metric"><span>⚠ At Risk:</span> <span>${atRisk}</span></div>
          <div class="health-status" style="color:${isAtRisk ? '#e53e3e' : '#38a169'}">
            Risk Rate: ${riskPercent}%
          </div>
        </div>
      `,
      confirmButtonColor: isAtRisk ? '#e53e3e' : '#38a169'
    });

  } catch (error) {
    Swal.close();
    console.error('Health analysis error:', error);
    Swal.fire('Error', 'Failed to analyze health data', 'error');
  }
}

// Cattle management functions
function addNewCattle() {
    Swal.fire({
        title: 'Add New Cattle',
        html: `
            <input id="tag_id" class="swal2-input" placeholder="Tag ID" required>
            <input id="location" class="swal2-input" placeholder="Location" required>
            <input id="temp" class="swal2-input" placeholder="Body Temp (°C)" type="number" step="0.1" required>
            <input id="heart" class="swal2-input" placeholder="Heart Rate (bpm)" type="number" required>
            <input id="sleep" class="swal2-input" placeholder="Sleep Duration (hrs)" type="number" step="0.1" required>
            <input id="lying" class="swal2-input" placeholder="Lying Duration (hrs)" type="number" step="0.1" required>
        `,
        focusConfirm: false,
        preConfirm: () => {
            const values = {
                tag_id: document.getElementById('tag_id').value,
                location: document.getElementById('location').value,
                body_temperature: parseFloat(document.getElementById('temp').value),
                heart_rate: parseInt(document.getElementById('heart').value),
                sleeping_duration: parseFloat(document.getElementById('sleep').value),
                lying_down_duration: parseFloat(document.getElementById('lying').value)
            };
            
            // Validate inputs
            if (!values.tag_id || !values.location || isNaN(values.body_temperature) || 
                isNaN(values.heart_rate) || isNaN(values.sleeping_duration) || isNaN(values.lying_down_duration)) {
                Swal.showValidationMessage('Please fill all fields with valid values');
                return false;
            }
            return values;
        }
    }).then(result => {
        if (result.isConfirmed && result.value) {
            const loading = Swal.fire({
                title: 'Adding Cattle...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            fetch("http://localhost:3001/api/cattle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.value)
            })
            .then(async res => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to add cattle');
                return data;
            })
            .then(() => {
                loading.close();
                Swal.fire('Success', 'Cattle added successfully', 'success');
                displayList();
            })
            .catch(err => {
                loading.close();
                console.error("Error:", err);
                Swal.fire('Error', err.message || 'Failed to add cattle', 'error');
            });
        }
    });
}

function addCattleReading(cattleId) {
    Swal.fire({
        title: 'Add Health Reading',
        html: `
            <input id="temp" class="swal2-input" placeholder="Body Temp (°C)" type="number" step="0.1" required>
            <input id="heart" class="swal2-input" placeholder="Heart Rate (bpm)" type="number" required>
            <input id="sleep" class="swal2-input" placeholder="Sleep Duration (hrs)" type="number" step="0.1" required>
            <input id="lying" class="swal2-input" placeholder="Lying Duration (hrs)" type="number" step="0.1" required>
        `,
        focusConfirm: false,
        preConfirm: () => {
            const values = {
                body_temperature: parseFloat(document.getElementById('temp').value),
                heart_rate: parseInt(document.getElementById('heart').value),
                sleeping_duration: parseFloat(document.getElementById('sleep').value),
                lying_down_duration: parseFloat(document.getElementById('lying').value)
            };
            
            if (isNaN(values.body_temperature) || isNaN(values.heart_rate) || 
               isNaN(values.sleeping_duration) || isNaN(values.lying_down_duration)) {
                Swal.showValidationMessage('Please fill all fields with valid values');
                return false;
            }
            return values;
        }
    }).then(result => {
        if (result.isConfirmed && result.value) {
            const loading = Swal.fire({
                title: 'Adding Reading...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            fetch(`http://localhost:3001/api/cattle/${cattleId}/readings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.value)
            })
            .then(async res => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to add reading');
                return data;
            })
            .then(() => {
                loading.close();
                Swal.fire('Success', 'Reading added successfully', 'success');
                displayList();
            })
            .catch(err => {
                loading.close();
                console.error("Error:", err);
                Swal.fire('Error', err.message || 'Failed to add reading', 'error');
            });
        }
    });
}

function removeCattle(id, tagId) {
    Swal.fire({
        title: 'Confirm Removal',
        html: `Are you sure you want to remove cattle <strong>${tagId}</strong>?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it',
        cancelButtonText: 'Cancel',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            const loading = Swal.fire({
                title: 'Removing Cattle...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            fetch(`http://localhost:3001/api/cattle/${id}`, {
                method: "DELETE"
            })
            .then(async res => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to remove cattle');
                return data;
            })
            .then(() => {
                loading.close();
                Swal.fire('Removed!', 'Cattle has been removed.', 'success');
                displayList();
            })
            .catch(err => {
                loading.close();
                console.error("Error:", err);
                Swal.fire('Error', err.message || 'Failed to remove cattle', 'error');
            });
        }
    });
}

// Helper functions
function getHealthClass(value, type) {
    if (value === null || value === undefined) return '';
    if (type === 'temp') {
        if (value < 37.5) return 'low';
        if (value > 39.5) return 'high';
        return 'normal';
    } else if (type === 'heart') {
        if (value < 60) return 'low';
        if (value > 80) return 'high';
        return 'normal';
    }
    return '';
}

function viewDetails(id) {
    // Implement detailed view with historical data
    Swal.fire({
        title: 'Cattle Details',
        html: `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i> Loading details...
            </div>
        `,
        allowOutsideClick: false,
        showConfirmButton: false
    });
    
    // In a real app, you would fetch detailed data here
    setTimeout(() => {
        Swal.fire({
            title: 'Cattle Details',
            html: 'Detailed view with historical data would be shown here',
            icon: 'info'
        });
    }, 1000);
}

// Toggle profile dropdown
function toggleProfile(event) {
    event.stopPropagation(); // Prevent event from bubbling up
    const profileDetail = document.getElementById("profileDetail");
    profile = !profile;
    
    if (profile) { // If true (closed), hide the dropdown
        hideProfileDropdown();
    } else { // If false (open), show the dropdown
        showProfileMenu();
        profileDetail.style.display = "block";
    }
}

// Hide profile dropdown
function hideProfileDropdown() {
    const profileDetail = document.getElementById("profileDetail");
    profile = true; // Set to closed state
    profileDetail.style.display = "none";
    currentView = 'menu';
    resetProfileView();
}

// Hide option dropdown
function hideOptionDropdown() {
    const optionDetail = document.getElementById("option");
    options = true;
    optionDetail.style.display = "none";
}

// Show profile menu
function showProfileMenu() {
    currentView = 'menu';
    resetProfileView();
    document.querySelector('.profile-menu').style.display = 'block';
}

// Reset profile view
function resetProfileView() {
    document.querySelector('.profile-menu').style.display = 'block';
    document.getElementById('profileContent').style.display = 'none';
    document.getElementById('alertsContent').style.display = 'none';
}

// Show profile details
function showProfileDetails() {
    currentView = 'profile';
    document.querySelector('.profile-menu').style.display = 'none';
    const profileContent = document.getElementById('profileContent');
    profileContent.style.display = 'block';
    profileContent.innerHTML = `
        <div class="profile-details">
            <h3>Profile Details</h3>
            <p><strong>Role:</strong> Cattle Manager</p>
            <p><strong>Access Level:</strong> Administrator</p>
            <p><strong>Last Login:</strong> ${new Date().toLocaleString()}</p>
        </div>
    `;
}

// Show alerts
function showAlerts() {
    currentView = 'alerts';
    document.querySelector('.profile-menu').style.display = 'none';
    document.getElementById('alertsContent').style.display = 'block';
    displayAlerts();
}

// Hide alerts
function hideAlerts() {
    showProfileMenu();
}

// Display alerts in the alerts section
function displayAlerts() {
    const alertsList = document.getElementById("alertsList");
    if (healthAlerts.length === 0) {
        alertsList.innerHTML = '<div class="no-alerts">No alerts at this time</div>';
        return;
    }

    alertsList.innerHTML = healthAlerts
        .map((alert, index) => `
            <div class="alert-item ${alert.read ? 'read' : ''}" onclick="viewAlertDetails(${index})">
                <div class="alert-header">
                    <span class="alert-title">Cattle ${alert.tagId}</span>
                    <span class="alert-time">${new Date(alert.time).toLocaleTimeString()}</span>
                </div>
                <div class="alert-message">${alert.message}</div>
                <span class="alert-status risk">At Risk</span>
            </div>
        `)
        .join('');
}

// View alert details
async function viewAlertDetails(index) {
    const alert = healthAlerts[index];
    if (!alert) return;

    // Mark alert as read
    alert.read = true;
    updateAlertIndicators();
    displayAlerts();

    // Show detailed analysis
    try {
        const loading = Swal.fire({
            title: 'Loading Analysis...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        // Fetch latest readings for the cattle
        const cattleRes = await fetch(`http://localhost:3001/api/cattle`);
        const allCattle = await cattleRes.json();
        const cattle = allCattle.find(c => c.tag_id === alert.tagId);
        
        if (!cattle) {
            await loading.close();
            return Swal.fire('Error', 'Cattle not found', 'error');
        }

        const readingsRes = await fetch(`http://localhost:3001/api/cattle/${cattle._id}/readings`);
        const readings = await readingsRes.json();
        
        if (!readings || !readings.length) {
            await loading.close();
            return Swal.fire('No Data', 'No health readings available', 'info');
        }

        // Get latest reading analysis
        const latestReading = readings[readings.length - 1];
        const analysisRes = await fetch('http://localhost:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(latestReading)
        });
        
        const analysis = await analysisRes.json();
        await loading.close();

        // Show detailed alert with analysis
        Swal.fire({
            title: `Health Alert - Cattle ${alert.tagId}`,
            html: `
                <div class="health-analysis-summary">
                    <div class="health-metric">
                        <i class="fas fa-thermometer-half"></i>
                        <span>Temperature: ${latestReading.body_temperature}°C</span>
                    </div>
                    <div class="health-metric">
                        <i class="fas fa-heartbeat"></i>
                        <span>Heart Rate: ${latestReading.heart_rate} bpm</span>
                    </div>
                    <div class="health-metric">
                        <i class="fas fa-moon"></i>
                        <span>Sleep Duration: ${latestReading.sleeping_duration}h</span>
                    </div>
                    <div class="health-metric">
                        <i class="fas fa-bed"></i>
                        <span>Lying Duration: ${latestReading.lying_down_duration}h</span>
                    </div>
                    <div class="health-status risk">
                        Risk Probability: ${(analysis.probability * 100).toFixed(1)}%
                    </div>
                </div>
            `,
            icon: 'warning',
            confirmButtonColor: '#dd6b20'
        });
    } catch (error) {
        console.error('Error loading alert details:', error);
        Swal.fire('Error', 'Failed to load alert details', 'error');
    }
}

// Update alert indicators
function updateAlertIndicators() {
    const unreadAlerts = healthAlerts.filter(alert => !alert.read).length;
    const hasAlerts = unreadAlerts > 0;
    
    // Update alert count
    const alertCount = document.getElementById('alertCount');
    if (alertCount) {
        alertCount.textContent = unreadAlerts || '';
        alertCount.classList.toggle('has-alerts', hasAlerts);
    }
    
    // Update alert indicators
    document.getElementById("profile").classList.toggle("has-alerts", hasAlerts);
    document.getElementById("optionLogo").classList.toggle("has-alerts", hasAlerts);
}

// Add a new health alert
function addHealthAlert(tagId, health) {
    const newAlert = {
        tagId,
        time: new Date(),
        message: `Health risk detected - Temperature: ${health.body_temperature}°C, Heart Rate: ${health.heart_rate} bpm`,
        read: false
    };

    // Add alert only if it's not a duplicate (same cattle within last 5 minutes)
    const isDuplicate = healthAlerts.some(alert => 
        alert.tagId === tagId && 
        (new Date() - new Date(alert.time)) < 300000 // 5 minutes
    );

    if (!isDuplicate) {
        healthAlerts.unshift(newAlert);
        // Keep only last 10 alerts
        if (healthAlerts.length > 10) {
            healthAlerts.pop();
        }
        updateAlertIndicators();
        // If alerts are being viewed, update the display
        if (currentView === 'alerts') {
            displayAlerts();
        }
    }
}

// Start automatic health monitoring
function startHealthMonitoring() {
    checkAllCattleHealth();
    setInterval(checkAllCattleHealth, 30000); // Check every 30 seconds
}

// Check health for all cattle
async function checkAllCattleHealth() {
    try {
        const response = await fetch("http://localhost:3001/api/cattle");
        if (!response.ok) throw new Error('Failed to fetch cattle');
        
        const cattle = await response.json();
        for (const item of cattle) {
            const health = await analyzeCattleHealth(item._id);
            if (health && health.status === 'at risk') {
                addHealthAlert(item.tag_id, health);
            }
        }
    } catch (error) {
        console.error('Health monitoring error:', error);
    }
}

// Analyze health for a single cattle
async function analyzeCattleHealth(cattleId) {
    try {
        const readingsRes = await fetch(`http://localhost:3001/api/cattle/${cattleId}/readings`);
        if (!readingsRes.ok) throw new Error('Failed to fetch readings');
        
        const readings = await readingsRes.json();
        if (!readings || !readings.length) return null;

        // Get latest reading
        const latestReading = readings[readings.length - 1];
        
        const predictionRes = await fetch('http://localhost:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(latestReading)
        });
        
        if (!predictionRes.ok) throw new Error('Prediction failed');
        return await predictionRes.json();
    } catch (error) {
        console.error('Health analysis error:', error);
        return null;
    }
}