const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

function resolveTraceEndpoint() {
  const explicitTraces = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  if (explicitTraces) {
    return explicitTraces;
  }

  const base = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:8080/otlp').replace(/\/$/, '');
  return `${base}/v1/traces`;
}

// Configure OTLP exporter
const traceExporter = new OTLPTraceExporter({
  url: resolveTraceEndpoint(),
});

const serviceName = process.env.OTEL_SERVICE_NAME || 'node-express-example';

// Create resource with service name
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
});

// Initialize SDK
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: traceExporter,
  // Keep example startup deterministic for smoke tests.
  instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
});

// Handle termination signals
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.error('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

module.exports = sdk;
