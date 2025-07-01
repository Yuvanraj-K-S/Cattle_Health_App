let profile = true, options = true;

// Display cattle list on page load
window.onload = displayList;

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

        // Get all readings
        const readingsRes = await fetch(`http://localhost:3001/api/cattle/${cattleId}/readings`);
        if (!readingsRes.ok) {
            throw new Error('Failed to fetch readings');
        }
        const readings = await readingsRes.json();
        
        if (!readings || !readings.length) {
            await loading.close();
            return Swal.fire('No Data', 'No health readings available for this cattle', 'info');
        }

        // Analyze each reading
        const analysis = await Promise.all(
            readings.map(reading => 
                fetch('http://localhost:5000/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reading)
                })
                .then(res => res.ok ? res.json() : Promise.reject('Prediction failed'))
            )
        );

        await loading.close();
        
        // Count results
        const healthyCount = analysis.filter(a => a && a.status === 'healthy').length;
        const atRiskCount = analysis.length - healthyCount;
        
        // Determine overall status
        let status, icon, title, color;
        if (healthyCount > atRiskCount) {
            status = 'healthy';
            icon = 'success';
            title = 'Generally Healthy';
            color = '#38a169';
        } else if (atRiskCount > healthyCount) {
            status = 'at risk';
            icon = 'error';
            title = 'Health Risk Detected';
            color = '#e53e3e';
        } else {
            status = 'uncertain';
            icon = 'warning';
            title = 'Inconclusive Results';
            color = '#dd6b20';
        }

        // Show results
        return Swal.fire({
            icon,
            title,
            html: `
                <div class="health-analysis-summary">
                    <p><strong>Analysis of ${readings.length} readings:</strong></p>
                    <div class="health-metric">
                        <span>✅ Healthy Readings:</span>
                        <span>${healthyCount}</span>
                    </div>
                    <div class="health-metric">
                        <span>⚠️ At-Risk Readings:</span>
                        <span>${atRiskCount}</span>
                    </div>
                    <div class="health-status" style="color: ${color}">
                        Overall Status: ${status.toUpperCase()}
                    </div>
                    ${status !== 'healthy' ? 
                        '<p><i class="fas fa-exclamation-triangle"></i> Please consider veterinary consultation</p>' : ''}
                </div>
            `,
            confirmButtonColor: color
        });
    } catch (error) {
        console.error('Analysis error:', error);
        Swal.fire('Error', 'Failed to analyze health data: ' + error, 'error');
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