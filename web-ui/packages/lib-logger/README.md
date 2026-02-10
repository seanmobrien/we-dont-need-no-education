# @compliance-theater/logger

Logging utilities for the Title IX Victim Advocacy Platform.

## Overview

This package provides a comprehensive logging system built on top of Pino, with OpenTelemetry integration for distributed tracing and Application Insights support.

## Features

- **Structured Logging**: Built on Pino for high-performance, structured JSON logging
- **OpenTelemetry Integration**: Automatic trace and span context propagation
- **Scoped Loggers**: Create loggers with specific scopes for better log organization
- **Custom Events**: Support for emitting custom Application Insights events
- **Error Handling**: Specialized utilities for database error logging

## Usage

### Basic Logging

```typescript
import { log } from "@compliance-theater/logger";

// Use the logger
log((logger) => {
  logger.info("Application started");
  logger.error("An error occurred", { error: err });
});
```

### Scoped Logger

```typescript
import { simpleScopedLogger } from "@compliance-theater/logger";

const logger = simpleScopedLogger("MyComponent");
logger.info("Component initialized");
logger.debug("Debug information", { data: someData });
```

### Custom Events

```typescript
import { logEvent } from "@compliance-theater/logger";

logEvent("UserAction", {
  action: "button_click",
  component: "LoginForm",
});
```

## API

### Main Exports

- `log`: Main logger interface with trace context support
- `logEvent`: Emit custom Application Insights events
- `simpleScopedLogger`: Create a scoped logger instance
- `errorLogFactory`: Create structured error log entries
- `getDbError`: Extract and format database errors

## Development

### Running Tests

```bash
yarn test
```

## Dependencies

- `pino`: High-performance logging library
- `@opentelemetry/api`: OpenTelemetry API for tracing
