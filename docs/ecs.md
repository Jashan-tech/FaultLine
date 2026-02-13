ECS Deployment

This document outlines how to deploy applications with Faultline in Amazon ECS.

Prerequisites

 - AWS account with ECS configured
 - ECR repository for your application image
 - OpenTelemetry collector configuration stored in EFS or S3

Configuration

Configure your application containers to export telemetry to the local OpenTelemetry collector:

 1 OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
 2 OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

Task Definition

Use the example task definition (taskdef-example.json) as a template. This defines:
 - Your application container
 - An OpenTelemetry collector sidecar container
 - Proper networking to allow communication between containers

Collector Configuration

Store your OpenTelemetry collector configuration in EFS or S3. The collector should be configured to:
 - Receive OTLP data on port 4318 (HTTP)
 - Export data to your monitoring backend (Prometheus, Loki, Tempo, etc.)

Deployment

Deploy your application using ECS with the configured task definition. The OpenTelemetry collector will run as a sidecar container alongside your application, collecting and forwarding telemetry data.
