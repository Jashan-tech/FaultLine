# Conventions

Standardized patterns for Faultline observability.

## Environment Variables

### OTel Exporter

```text
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

### Service Identification

```text
OTEL_SERVICE_NAME=my-service-name
OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0,service.environment=production
```

### Authentication (if required)

```text
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer token
```

## Resource Attributes

### Required Labels

```text
service.name: my-service-name
service.version: 1.0.0
service.environment: production
```

### Recommended Labels

```text
service.instance.id: unique-instance-id
deployment.environment: prod/staging/dev
team.owner: team-name
application.component: frontend/backend/database
```

## OTLP Protocol

### HTTP/Protobuf (Primary)

```text
Endpoint: http://collector:4318
Protocol: http/protobuf
Headers: Content-Type: application/x-protobuf
```

### Supported Endpoints

```text
Traces: /v1/traces
Metrics: /v1/metrics
Logs: /v1/logs
```

## Naming Conventions

### Service Names

- Lowercase with hyphens: my-service-name
- No special characters except hyphens
- Descriptive but concise

### Metric Names

- Use dots for hierarchy: http.request.duration
- Follow semantic conventions: http.requests.total
- Include units where appropriate: duration.seconds

### Log Fields

- Use consistent field names across services
- Standard fields: level, message, timestamp, service.name
- Structured logging with JSON format
