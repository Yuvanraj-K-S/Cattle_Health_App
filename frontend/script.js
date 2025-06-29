let profile = true, options = true;

// Display cattle list on page load
window.onload = displayList;

function displayList() {
    const ele = document.getElementById("displayListSpace");
    ele.innerHTML = `
        <div class="list-header">
            <h2 class="list-title"><i class="fas fa-list"></i> Your Cattle</h2>
            <div class="health-summary">
                <span class="summary-item"><i class="fas fa-thermometer-half"></i> Avg Temp: <span id="avgTemp">-</span></span>
                <span class="summary-item"><i class="fas fa-heartbeat"></i> Avg Heart Rate: <span id="avgHeart">-</span></span>
            </div>
        </div>
        <div class="list-subheader">
            <span class="cattle-id">Tag ID</span>
            <span class="cattle-data">Temp (°C)</span>
            <span class="cattle-data">Heart Rate</span>
            <span class="cattle-data">Sleep (hrs)</span>
            <span class="cattle-data">Lying (hrs)</span>
            <span class="cattle-place">Location</span>
            <span class="cattle-actions">Actions</span>
        </div>
        <ul class="cattle-list" id="dis"></ul>
        <div class="add-cattle-container">
            <button class="button add-cattle-button" onclick="addCattle()">
                <i class="fas fa-plus"></i> Add Cattle
            </button>
        </div>
    `;

    // Fetch cattle from backend
    fetch("http://localhost:3001/api/cattle")
        .then(res => res.json())
        .then(data => {
            const dis = document.getElementById("dis");
            let totalTemp = 0, totalHeart = 0, count = data.length;
            
            // Clear previous list
            dis.innerHTML = '';
            
            if (count === 0) {
                dis.innerHTML = '<li class="no-cattle">No cattle found. Add your first cattle!</li>';
                return;
            }
            
            data.forEach(item => {
                totalTemp += item.body_temperature;
                totalHeart += item.heart_rate;
                
                const li = document.createElement("li");
                li.className = "cattle-item";
                li.innerHTML = `
                    <div class="cattle-info">
                        <span class="cattle-id">${item.tag_id}</span>
                        <span class="cattle-data ${getHealthClass(item.body_temperature, 'temp')}">
                            ${item.body_temperature.toFixed(1)} <i class="fas ${getTempIcon(item.body_temperature)}"></i>
                        </span>
                        <span class="cattle-data ${getHealthClass(item.heart_rate, 'heart')}">
                            ${item.heart_rate} <i class="fas ${getHeartIcon(item.heart_rate)}"></i>
                        </span>
                        <span class="cattle-data">${item.sleeping_duration.toFixed(1)}</span>
                        <span class="cattle-data">${item.lying_down_duration.toFixed(1)}</span>
                        <span class="cattle-place"><i class="fas fa-map-marker-alt"></i> ${item.location}</span>
                        <div class="cattle-actions">
                            <button class="icon-button small view" onclick="viewDetails('${item._id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="icon-button small edit" onclick="editCattle('${item._id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="icon-button small delete" onclick="removeCattle('${item._id}', '${item.tag_id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                dis.appendChild(li);
            });
            
            // Update averages
            document.getElementById("avgTemp").textContent = (totalTemp/count).toFixed(1);
            document.getElementById("avgHeart").textContent = Math.round(totalHeart/count);
        })
        .catch(err => {
            console.error("Error fetching cattle list:", err);
            document.getElementById("dis").innerHTML = '<li class="error">Error loading cattle data. Please try again.</li>';
        });
}

function getHealthClass(value, type) {
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

function getTempIcon(temp) {
    if (temp < 37.5) return 'fa-temperature-low';
    if (temp > 39.5) return 'fa-temperature-high';
    return 'fa-temperature-empty';
}

function getHeartIcon(rate) {
    if (rate < 60) return 'fa-heart-broken';
    if (rate > 80) return 'fa-heartbeat';
    return 'fa-heart';
}

function addCattle() {
    const tagId = prompt("Enter Cattle Tag ID:");
    if (!tagId) return;

    const body_temperature = prompt("Enter Body Temperature (°C):");
    if (!body_temperature) return;

    const heart_rate = prompt("Enter Heart Rate (bpm):");
    if (!heart_rate) return;

    const sleeping_duration = prompt("Enter Sleeping Duration (hours):");
    if (!sleeping_duration) return;

    const lying_down_duration = prompt("Enter Lying Down Duration (hours):");
    if (!lying_down_duration) return;

    const place = prompt("Enter Location:");
    if (!place) return;

    // Send to backend
    fetch("http://localhost:3001/api/cattle", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            tag_id: tagId,
            body_temperature: parseFloat(body_temperature),
            heart_rate: parseInt(heart_rate),
            sleeping_duration: parseFloat(sleeping_duration),
            lying_down_duration: parseFloat(lying_down_duration),
            location: place
        })
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to add cattle');
        return res.json();
    })
    .then(() => {
        alert("Cattle added successfully!");
        displayList(); // Refresh list
    })
    .catch(err => {
        console.error("Error adding cattle:", err);
        alert("Failed to add cattle: " + err.message);
    });
}

function removeCattle(id, tagId) {
    if (!confirm(`Are you sure you want to remove cattle with Tag ID: ${tagId}?`)) {
        return;
    }

    fetch(`http://localhost:3001/api/cattle/${id}`, {
        method: "DELETE"
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to remove cattle');
        return res.json();
    })
    .then(() => {
        alert("Cattle removed successfully!");
        displayList(); // Refresh list
    })
    .catch(err => {
        console.error("Error removing cattle:", err);
        alert("Failed to remove cattle: " + err.message);
    });
}

function editCattle(id) {
    // In a real app, you would show a proper edit form
    alert(`Edit functionality for cattle with ID: ${id} would go here`);
    // You could implement a similar approach as addCattle but with a PUT request
}

function displayOption() {
    const ele = document.getElementById("option");
    const displaySpace = document.getElementById("displayListSpace");

    if (options) {
        ele.innerHTML = `
            <button class="button" onclick="displayList()">
                <i class="fas fa-list"></i> Cattle List
            </button>
            <button class="button" onclick="showAlerts()">
                <i class="fas fa-bell"></i> Alerts
            </button>
            <button class="button" onclick="showSettings()">
                <i class="fas fa-cog"></i> Settings
            </button>
        `;
        options = false;
    } else {
        ele.innerHTML = "";
        options = true;
    }
}

function showAlerts() {
    document.getElementById("displayListSpace").innerHTML = `
        <div class="list-header">
            <h2 class="list-title"><i class="fas fa-bell"></i> Health Alerts</h2>
        </div>
        <div class="alert-list">
            <p>Alert functionality would be implemented here</p>
        </div>
    `;
}

function showSettings() {
    document.getElementById("displayListSpace").innerHTML = `
        <div class="list-header">
            <h2 class="list-title"><i class="fas fa-cog"></i> Settings</h2>
        </div>
        <div class="settings-form">
            <p>Settings functionality would be implemented here</p>
        </div>
    `;
}

function profileDetails() {
    const ele = document.getElementById("profileDetail");

    if (profile) {
        ele.innerHTML = `
            <button class="button" onclick="editProfile()">
                <i class="fas fa-edit"></i> Edit Profile
            </button>
            <button class="button" onclick="showAlerts()">
                <i class="fas fa-bell"></i> Alerts
            </button>
            <button class="button" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        `;
        profile = false;
    } else {
        ele.innerHTML = "";
        profile = true;
    }
}

function editProfile() {
    alert("Edit profile functionality would go here");
}

function logout() {
    alert("Logout functionality would go here");
}

function viewDetails(id) {
    // In a real app, you would fetch detailed info from the backend
    alert(`Viewing detailed health metrics for cattle with ID: ${id}\nThis would show a detailed view with historical data.`);
}