# 🐄 Cattle Health Monitoring System

This is a web-based system that helps cattle owners and veterinarians monitor cattle health in real-time using simulated sensor data. It includes a machine learning model to predict the cattle’s health condition based on physiological data, and provides a dashboard interface to view registered cattle and their health summaries.

---

## 📂 Project Structure

```
Cattle_Health_App/
│
├── c1ea3f84...py              # Flask API with ML prediction
├── 98157f55...js              # Node.js backend with MongoDB for cattle data
├── 13a9e125...html            # Frontend UI
├── simulator.js               # IoT-style health data simulator
├── models/
│   ├── cattle_health_model.joblib  # Trained ML model
│   └── scaler.joblib               # Scaler used for preprocessing
└── style.css                # (optional) CSS file for frontend styling
```

---

## 🚀 Features

- 📊 **ML-based Health Prediction** (Flask API)
- 🧠 **MongoDB-Backed Cattle Management** (Node.js API)
- 🤖 **Simulated IoT Health Readings** (Node.js Simulator)
- 🖥️ **User-Friendly Dashboard** (HTML + JS + CSS)

---

## ⚙️ Installation Instructions

### 1. Flask ML Prediction Server

**Requirements:** Python, `joblib`, `flask`, `flask_cors`, `numpy`

```bash
cd Cattle_Health_App
pip install flask flask_cors numpy joblib
python c1ea3f84-da15-4d34-a3e3-1745537c719b.py
```

Runs on: `http://localhost:5000/predict`

Example JSON input:
```json
{
  "body_temperature": 39.0,
  "heart_rate": 75,
  "sleeping_duration": 7,
  "lying_down_duration": 6
}
```

---

### 2. Node.js + MongoDB Backend

**Requirements:** Node.js, MongoDB

```bash
npm install express mongoose cors body-parser
node 98157f55-b114-4619-a47e-5664f7becc78.js
```

Runs on: `http://localhost:3001/api/cattle`

---

### 3. Simulator (Simulated IoT Sensor Data)

This component simulates health readings and pushes them to your backend.

**Steps to Run:**
```bash
npm install axios
node simulator.js
```

Every 5 seconds, it will:
- Fetch cattle list from backend
- Generate new health data (80% chance healthy)
- Post readings to `/api/cattle/:id/readings`

Watch console logs for live cattle updates.

---

### 4. Frontend

Open `13a9e125-ad66-4aa8-9931-33f8c334d4ff.html` in a browser.

---

## 📡 API Endpoints

### Flask ML API (Port 5000)

| Endpoint     | Method | Description                          |
|--------------|--------|--------------------------------------|
| `/predict`   | POST   | Predicts health based on input data  |

### Node.js Cattle API (Port 3001)

| Endpoint                         | Method | Description                          |
|----------------------------------|--------|--------------------------------------|
| `/api/cattle`                    | GET    | Get all cattle summary               |
| `/api/cattle`                    | POST   | Register new cattle with reading     |
| `/api/cattle/:id/readings`      | GET    | Get all readings for a cattle        |
| `/api/cattle/:id/readings`      | POST   | Add new health reading to a cattle   |
| `/api/cattle/:id`               | DELETE | Remove cattle by ID                  |

---

## ✨ Future Improvements

- Add user authentication
- Real-time monitoring with WebSockets
- Deploy to cloud (Render, Heroku, MongoDB Atlas)
- Add charts & graphs for history visualization

---

## 📜 License

This project is open-source under the MIT License.