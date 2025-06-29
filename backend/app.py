from flask import Flask, request, jsonify
import joblib
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load model and scaler
model = joblib.load(r"C:\Users\Administrator\Desktop\Cattle_Health_App\backend\models\cattle_health_model.joblib")
scaler = joblib.load(r"C:\Users\Administrator\Desktop\Cattle_Health_App\backend\models\scaler.joblib")

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(force=True)
        
        # Extract features in the correct order expected by your model
        features = [
            data.get("body_temperature"),
            data.get("heart_rate"),
            data.get("sleeping_duration"),
            data.get("lying_down_duration")
        ]
        
        # Validate all features are present
        if None in features:
            return jsonify({"error": "Missing required features"}), 400

        # Prepare and scale input
        input_data = np.array(features).reshape(1, -1)
        input_scaled = scaler.transform(input_data)

        # Predict (assuming 0 = healthy, 1 = at risk)
        prediction = model.predict(input_scaled)
        probability = model.predict_proba(input_scaled)[0]

        return jsonify({
            "prediction": int(prediction[0]),
            "probability": float(probability[prediction[0]]),
            "status": "healthy" if prediction[0] == 1 else "at risk"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)