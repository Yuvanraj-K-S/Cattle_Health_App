const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/cattleMonitor', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('✅ Connected to MongoDB');
});

const cattleSchema = new mongoose.Schema({
    tag_id: { type: String, required: true, unique: true },
    body_temperature: { type: Number, required: true },
    heart_rate: { type: Number, required: true },
    sleeping_duration: { type: Number, required: true },
    lying_down_duration: { type: Number, required: true },
    location: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

const Cattle = mongoose.model('Cattle', cattleSchema);

app.get('/api/cattle', async (req, res) => {
    try {
        const data = await Cattle.find({});
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/cattle', async (req, res) => {
    try {
        const { tag_id, body_temperature, heart_rate, sleeping_duration, lying_down_duration, location } = req.body;
        const newCattle = new Cattle({
            tag_id,
            body_temperature,
            heart_rate,
            sleeping_duration,
            lying_down_duration,
            location
        });
        const result = await newCattle.save();
        res.status(201).json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/cattle/:id', async (req, res) => {
    try {
        const result = await Cattle.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Cattle not found' });
        }
        res.json({ message: 'Cattle deleted successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));