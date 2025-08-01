const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Test server is running!');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
