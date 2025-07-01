from flask import Flask, request, jsonify
import joblib
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load model and scaler
model = joblib.load(r'models\cattle_health_model.joblib')
scaler = joblib.load(r'models\scaler.joblib')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        
        # Extract and validate features
        features = [
            float(data.get("body_temperature")),
            float(data.get("heart_rate")),
            float(data.get("sleeping_duration")),
            float(data.get("lying_down_duration"))
        ]
        
        # Scale and predict
        input_data = np.array(features).reshape(1, -1)
        input_scaled = scaler.transform(input_data)
        prediction = model.predict(input_scaled)
        probability = model.predict_proba(input_scaled)[0]
        
        return jsonify({
            "prediction": int(prediction[0]),
            "probability": float(probability[prediction[0]]),
            "status": "healthy" if prediction[0] == 1 else "at risk"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)