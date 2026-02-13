require('dotenv').config();
const express = require('express');
const sdk = require('./otel');

// Initialize tracing before creating express app
sdk.start();

const app = express();
const PORT = process.env.PORT || 8080;

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Slow route with random delay
app.get('/slow', (req, res) => {
  const delay = Math.floor(Math.random() * 500) + 300; // 300-800ms
  setTimeout(() => {
    res.status(200).send(`Slow response after ${delay}ms`);
  }, delay);
});

// Error route
app.get('/error', (req, res) => {
  res.status(500).send('Internal Server Error');
});

// Default route
app.get('/', (req, res) => {
  res.status(200).send('Node Express Example App');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
