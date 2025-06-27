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

const list = [[1,"Pasture A"],[2,"Barn B"],[3,"Field C"]];
let profile = true, options = true;

function displayList(){
    const ele = document.getElementById("displayListSpace");
    ele.innerHTML = `
        <div class="list-header">
            <h2 class="list-title">Your Cattle</h2>
            <button class="button" onclick="addCattle()">
                <i class="fas fa-plus"></i> Add Cattle
            </button>
        </div>
        <div class="list-header">
            <span class="cattle-id">Tag ID</span>
            <span class="cattle-place">Location</span>
        </div>
        <ul class="cattle-list" id="dis"></ul>
    `;
    
    list.forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = `
            <div class="cattle-info">
                <span class="cattle-id">${item[0]}</span>
                <span class="cattle-place">${item[1]}</span>
            </div>
            <div class="cattle-actions">
                <button class="icon-button small" onclick="viewDetails(${item[0]})">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        `;
        document.getElementById("dis").appendChild(li);
    });
}

function displayOption(){
    const ele = document.getElementById("option");
    const displaySpace = document.getElementById("displayListSpace");
    
    if(options){
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

function addCattle() {
    const tagId = prompt("Enter Tag ID:");
    if (!tagId) return;
    
    const place = prompt("Enter Location:");
    if (!place) return;
    
    // Add to list and refresh
    list.push([tagId, place]);
    displayList();
    
    // In a real app, you would send this to your backend
    console.log("Added cattle - ID:", tagId, "Location:", place);
}

function profileDetails(){
    const ele = document.getElementById("profileDetail");
    
    if(profile){
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