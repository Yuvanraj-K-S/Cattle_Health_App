// const list = [[1,"A1"],[2,"A2"],[3,"A3"]];
// let profile = true,options=true;
// function displayList(){
//     const ele = document.getElementById("displayListSpace")
//     ele.innerHTML='<button if = "add" onclick="addCattle()">Add Cattle</button><br><p>Tag Id \t Place</p><ul id="dis"></ul>';
//     list.forEach(item =>{
//         const i = document.createElement("li");
//         i.textContent = `${item[0]}  ${item[1]}`;
//         dis.appendChild(i);
//     })
// }
// function displayOption(){
//     if(options){
//         const ele = document.getElementById("option");
//         ele.innerHTML='<button id="displayListButton" onclick="displayList()">Cattle List</button> <button>Alerts</button> ';
//         options=false;
//     }
//     else{
//         const ele = document.getElementById("option");
//         ele.innerHTML=""
//         const el = document.getElementById("displayListSpace")
//         el.innerHTML=""
//         options=true;
//     }
// }
// function addCattle() {
//   const tagId = prompt("Enter Tag ID:");
//   const place = prompt("Enter Place:");
//   console.log("ID:",tagId);
//   console.log("Place:",place);
// }
// function profileDetails(){
//     if(profile){
//         const ele = document.getElementById("profileDetail").innerHTML="<button>Edit Profile</button><button>Alerts</button><button>Login</button>";
//         profile = false;
//     }
//     else{
//         const ele = document.getElementById("profileDetail").innerHTML="";
//         profile = true;
//     }
// }

let profile = true, options = true;

function displayList() {
    const ele = document.getElementById("displayListSpace");
    ele.innerHTML = `
        <div class="list-header">
            <h2 class="list-title">Your Cattle</h2>
        </div>
        <div class="list-header">
            <span class="cattle-id">Tag ID</span>
            <span class="cattle-place">Location</span>
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
            data.forEach(item => {
                const li = document.createElement("li");
                li.innerHTML = `
                    <div class="cattle-info">
                        <span class="cattle-id">${item.tag_id}</span>
                        <span class="cattle-place">${item.location}</span>
                    </div>
                    <div class="cattle-actions">
                        <button class="icon-button small" onclick="viewDetails('${item._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                `;
                dis.appendChild(li);
            });
        })
        .catch(err => console.error("Error fetching cattle list:", err));
}

function addCattle() {
    const tagId = prompt("Enter Tag ID:");
    if (!tagId) return;

    const place = prompt("Enter Location:");
    if (!place) return;

    // Send to backend
    fetch("http://localhost:3001/api/cattle", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ tag_id: tagId, location: place })
    })
    .then(res => res.json())
    .then(data => {
        alert("Cattle added!");
        displayList(); // Refresh list
    })
    .catch(err => {
        console.error("Error adding cattle:", err);
        alert("Failed to add cattle.");
    });
}

function displayOption() {
    const ele = document.getElementById("option");
    const displaySpace = document.getElementById("displayListSpace");

    if (options) {
        ele.innerHTML = `
            <button class="button" onclick="displayList()">
                <i class="fas fa-list"></i> Cattle List
            </button>
            <button class="button">
                <i class="fas fa-bell"></i> Alerts
            </button>
            <button class="button">
                <i class="fas fa-cog"></i> Settings
            </button>
        `;
        options = false;
    } else {
        ele.innerHTML = "";
        displaySpace.innerHTML = "";
        options = true;
    }
}

function profileDetails() {
    const ele = document.getElementById("profileDetail");

    if (profile) {
        ele.innerHTML = `
            <button class="button" onclick="editProfile()">
                <i class="fas fa-edit"></i> Edit Profile
            </button>
            <button class="button">
                <i class="fas fa-bell"></i> Alerts
            </button>
            <button class="button">
                <i class="fas fa-sign-in-alt"></i> Login
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

function viewDetails(id) {
    alert(`Viewing details for cattle with ID: ${id}`);
}
