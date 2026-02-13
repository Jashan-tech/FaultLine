# Node Express Example

This example demonstrates how to instrument a Node.js Express application with OpenTelemetry for use with Faultline.

## Setup

Install dependencies:
npm install

## Environment Variables

Set these environment variables before running the application:
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

## Running the Application

Start the application:
npm start

Or for development with auto-reload:
npm run dev

## Available Routes

- `GET /health` - Returns 200 OK
- `GET /slow` - Returns 200 after a random delay (300-800ms)
- `GET /error` - Returns 500 Internal Server Error
- `GET /` - Returns 200 with welcome message

## Telemetry Collection

The application will automatically collect and export:
- Traces for all HTTP requests
- Metrics about request duration and status codes
- Errors and exceptions

All telemetry data is exported to the OTLP endpoint configured above.
