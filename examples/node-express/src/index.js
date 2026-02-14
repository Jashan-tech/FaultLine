require('dotenv').config();
const express = require('express');
const sdk = require('./otel');

function startTelemetry() {
  try {
    const startResult = sdk.start();
    if (startResult && typeof startResult.catch === 'function') {
      startResult.catch((error) => {
        console.error('Error initializing tracing', error);
      });
    }
  } catch (error) {
    console.error('Error initializing tracing', error);
  }
}

startTelemetry();

const app = express();
const PORT = process.env.PORT || 3001;
const METRIC_BUCKETS = [0.1, 0.3, 0.5, 1, 2, 5];
const requestTotals = new Map();
const requestDurations = new Map();

function labelsKey(route, statusCode) {
  return `${route}:::${statusCode}`;
}

function escapeLabelValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function getRouteKey(req) {
  if (req.route && req.route.path) {
    return req.route.path;
  }
  return req.path || 'unknown';
}

function recordRequest(route, statusCode, durationSeconds) {
  const totalsKey = labelsKey(route, statusCode);
  requestTotals.set(totalsKey, (requestTotals.get(totalsKey) || 0) + 1);

  const current = requestDurations.get(route) || {
    count: 0,
    sum: 0,
    buckets: new Array(METRIC_BUCKETS.length).fill(0),
  };
  current.count += 1;
  current.sum += durationSeconds;
  for (let i = 0; i < METRIC_BUCKETS.length; i += 1) {
    if (durationSeconds <= METRIC_BUCKETS[i]) {
      current.buckets[i] += 1;
    }
  }
  requestDurations.set(route, current);
}

app.use((req, res, next) => {
  if (req.path === '/metrics') {
    next();
    return;
  }

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const route = getRouteKey(req);
    const statusCode = String(res.statusCode);
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    recordRequest(route, statusCode, durationSeconds);
  });
  next();
});

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

app.get('/metrics', (req, res) => {
  const lines = [];

  lines.push('# HELP http_requests_total Total number of HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, value] of requestTotals.entries()) {
    const [route, statusCode] = key.split(':::');
    lines.push(
      `http_requests_total{route="${escapeLabelValue(route)}",status_code="${escapeLabelValue(statusCode)}"} ${value}`
    );
  }

  lines.push('# HELP http_request_duration_seconds Request duration in seconds');
  lines.push('# TYPE http_request_duration_seconds histogram');
  for (const [route, stats] of requestDurations.entries()) {
    for (let i = 0; i < METRIC_BUCKETS.length; i += 1) {
      lines.push(
        `http_request_duration_seconds_bucket{route="${escapeLabelValue(route)}",le="${METRIC_BUCKETS[i]}"} ${stats.buckets[i]}`
      );
    }
    lines.push(
      `http_request_duration_seconds_bucket{route="${escapeLabelValue(route)}",le="+Inf"} ${stats.count}`
    );
    lines.push(`http_request_duration_seconds_sum{route="${escapeLabelValue(route)}"} ${stats.sum}`);
    lines.push(`http_request_duration_seconds_count{route="${escapeLabelValue(route)}"} ${stats.count}`);
  }

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(`${lines.join('\n')}\n`);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
