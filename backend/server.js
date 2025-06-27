const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/cattleMonitor', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('✅ Connected to MongoDB');
});

// Mongoose Schema
const cattleSchema = new mongoose.Schema({
    tag_id: { type: String, required: true, unique: true },
    location: { type: String, required: true },
    health_status: String,
    last_checkup: Date,
    created_at: { type: Date, default: Date.now }
});

const Cattle = mongoose.model('Cattle', cattleSchema);

// API Endpoints
app.get('/api/cattle', async (req, res) => {
    const data = await Cattle.find({});
    res.json(data);
});

app.post('/api/cattle', async (req, res) => {
    try {
        const { tag_id, location } = req.body;
        const newCattle = new Cattle({ tag_id, location });
        const result = await newCattle.save();
        res.status(201).json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
