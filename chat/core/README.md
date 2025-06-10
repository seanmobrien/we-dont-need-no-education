# Core Module

The core module provides foundational utilities and shared functionality used across all modules in the Title IX Victim Advocacy Platform. It contains essential infrastructure components including database management, configuration handling, logging utilities, and common exception management for supporting victim advocacy cases.

## Purpose

This module serves as the foundation layer for the entire advocacy platform, providing:
- **Database Connection Management**: Centralized database access and connection pooling for evidence storage
- **Configuration Management**: Environment variable handling and application settings for advocacy operations
- **Logging Infrastructure**: Structured logging with custom formatters and utilities for case audit trails
- **Common Utilities**: Shared utility classes for string manipulation, validation, and evidence processing
- **Exception Handling**: Standardized error handling and exception management for advocacy workflows
- **Redis Integration**: Connection factory and utilities for Redis operations supporting case processing queues

## Package Structure

```
com.obapps.core/
├── ai/                 # AI-related utilities and abstractions for violation detection
├── exceptions/         # Common exception classes and error handling for advocacy operations
├── logback/           # Custom Logback configurations and utilities for case logging
├── redis/             # Redis connection management and utilities for evidence processing
├── types/             # Common data types and value objects for advocacy cases
└── util/              # General utility classes for victim support operations
```

## Key Components

### Database Management (`util/`)
- **`Db.java`**: Singleton database connection manager with HikariCP integration for evidence storage
- **Connection Pooling**: Optimized for high-concurrency evidence processing in advocacy cases
- **Transaction Management**: Support for transactional operations across advocacy modules
- **Health Monitoring**: Connection health checks and monitoring for case database reliability

### Configuration (`util/`)
- **Environment Variable Management**: Centralized configuration access for advocacy platform settings
- **Type-Safe Configuration**: Strongly typed configuration values for victim support operations
- **Environment Detection**: Development vs. production environment handling for case processing
- **Validation**: Configuration validation and error reporting for advocacy workflows

### Logging Infrastructure (`logback/`)
- **Structured Logging**: JSON-formatted log output for advocacy case observability
- **Custom Appenders**: Specialized logging for AI operations and violation detection metrics
- **Log Level Management**: Dynamic log level configuration for case processing
- **Audit Logging**: Specialized audit trail logging capabilities for legal documentation

### Redis Integration (`redis/`)
- **`RedisConnectionFactory`**: Centralized Redis connection management for evidence processing queues
- **Connection Pooling**: Efficient connection reuse for case building queue operations
- **Cluster Support**: Redis cluster configuration and failover handling for large advocacy cases
- **Monitoring**: Connection health and performance monitoring for evidence processing

### Exception Management (`exceptions/`)
- **`ErrorUtil`**: Utility for consistent error handling and logging in advocacy operations
- **Custom Exceptions**: Domain-specific exception classes for victim support workflows
- **Error Categorization**: Structured error classification for better case processing debugging
- **Stack Trace Management**: Optimized stack trace handling for production advocacy environments

### AI Utilities (`ai/`)
- **Model Configuration**: AI model selection and parameter management for violation detection
- **Token Management**: Token counting and cost optimization utilities for evidence analysis
- **Response Processing**: Common response parsing and validation for advocacy AI operations
- **Rate Limiting**: API rate limiting and retry logic for large-scale evidence processing

## Key Features

### Database Operations
```java
// Get database instance
Db db = Db.getInstance();

// Execute queries with automatic connection management
List<MyEntity> results = db.query("SELECT * FROM my_table WHERE id = ?", 
    rs -> new MyEntity(rs), id);

// Transaction support
db.executeInTransaction(connection -> {
    // Multiple operations in single transaction
    return result;
});
```

### Configuration Access
```java
// Environment-aware configuration
String dbUrl = EnvVars.getInstance().getDb().getUrl();
boolean isProduction = EnvVars.getInstance().isProduction();

// Type-safe configuration values
int maxConnections = ConfigUtil.getIntValue("db.maxConnections", 10);
```

### Logging Utilities
```java
// Structured logging with context
Logger logger = LoggerFactory.getLogger(MyClass.class);
logger.info("Processing document", 
    kv("documentId", docId),
    kv("stage", "analysis"),
    kv("userId", userId));

// Performance logging
try (var timer = PerformanceLogger.startTimer("document.analysis")) {
    // Timed operation
}
```

### Redis Operations
```java
// Get Redis client
RedissonClient redis = RedisConnectionFactory.getClient();

// Queue operations
RQueue<ProcessingTask> queue = redis.getQueue("processing.tasks");
queue.offer(new ProcessingTask(documentId));

// Distributed locks
RLock lock = redis.getLock("document." + documentId);
if (lock.tryLock(10, TimeUnit.SECONDS)) {
    try {
        // Protected operation
    } finally {
        lock.unlock();
    }
}
```

## Error Handling

### Exception Hierarchy
- **`BaseException`**: Root exception for all custom exceptions
- **`DatabaseException`**: Database-related errors
- **`ConfigurationException`**: Configuration and environment errors
- **`ValidationException`**: Data validation errors
- **`ExternalServiceException`**: External API and service errors

### Error Utilities
```java
// Standardized error logging
ErrorUtil.logAndThrow(logger, "Database connection failed", 
    new DatabaseException("Connection timeout"));

// Error context capture
ErrorUtil.captureContext(exception, 
    Map.of("operation", "documentAnalysis", "documentId", docId));
```

## Monitoring and Observability

### Performance Metrics
- Database connection pool usage and performance
- Redis connection health and latency
- Configuration load times and cache hits
- Exception rates and types

### Health Checks
```java
// Database health check
boolean dbHealthy = Db.getInstance().isHealthy();

// Redis health check  
boolean redisHealthy = RedisConnectionFactory.isHealthy();

// Overall system health
SystemHealth health = HealthChecker.getOverallHealth();
```

## Configuration

### Environment Variables
Required environment variables for core functionality:

```bash
# Database Configuration
DB_URL=jdbc:postgresql://localhost:5432/titleix_db
DB_USERNAME=username
DB_PASSWORD=password
DB_MAX_POOL_SIZE=20
DB_MIN_IDLE=5

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=password
REDIS_MAX_CONNECTIONS=50

# Logging Configuration
LOG_LEVEL=INFO
LOG_FORMAT=JSON
AUDIT_LOG_ENABLED=true

# Environment
ENVIRONMENT=development|production
```

### Database Configuration
- **Connection Pool**: HikariCP with optimized settings for concurrent workloads
- **Connection Timeout**: 30 seconds default
- **Idle Timeout**: 10 minutes default
- **Maximum Pool Size**: Configurable based on workload

### Redis Configuration
- **Connection Pooling**: Redisson with automatic failover
- **Timeout Settings**: Configurable read/write timeouts
- **Retry Logic**: Exponential backoff for transient failures
- **Monitoring**: Connection health and performance metrics

## Testing

### Unit Tests
Located in `src/test/java`, covering:
- Database connection management and pooling
- Configuration loading and validation
- Logging utilities and formatters
- Redis connection factory operations
- Exception handling and error utilities

### Integration Tests
- Database connectivity with real PostgreSQL instances
- Redis operations with real Redis instances
- End-to-end configuration loading
- Cross-module dependency validation

### Test Utilities
```java
// Test database setup
@TestDatabase
class MyDatabaseTest {
    @Test
    void testDatabaseOperation() {
        Db testDb = TestDbProvider.getTestDatabase();
        // Test operations
    }
}

// Mock Redis for testing
@MockRedis
class MyRedisTest {
    @Test
    void testQueueOperations() {
        // Test with mock Redis
    }
}
```

## Dependencies

### Core Dependencies
- **HikariCP**: High-performance JDBC connection pooling
- **PostgreSQL Driver**: Database connectivity
- **Redisson**: Redis client with advanced features
- **Logback**: Logging framework with JSON support
- **SLF4J**: Logging abstraction layer

### Development Dependencies
- **JUnit 5**: Testing framework
- **Mockito**: Mocking framework for unit tests
- **TestContainers**: Integration testing with real databases
- **AssertJ**: Fluent assertion library

## Performance Considerations

### Database Optimization
- Connection pool sizing based on concurrent workload
- Query timeout configuration for long-running operations
- Connection validation to prevent stale connections
- Monitoring and alerting for pool exhaustion

### Redis Optimization
- Connection pooling to minimize connection overhead
- Pipelining for batch operations
- Appropriate data structure selection
- Memory usage monitoring and optimization

### Logging Performance
- Asynchronous logging to prevent blocking
- Log level filtering to reduce overhead
- Structured logging for efficient parsing
- Log rotation and archival strategies

## Troubleshooting

### Common Issues
- **Database Connection Failures**: Check connection string, credentials, and network connectivity
- **Redis Connection Issues**: Verify Redis server status and network access
- **Configuration Loading**: Ensure environment variables are properly set
- **Performance Issues**: Monitor connection pool usage and query performance

### Debug Configuration
Enable debug logging for detailed troubleshooting:
```xml
<logger name="com.obapps.core" level="DEBUG"/>
<logger name="com.zaxxer.hikari" level="DEBUG"/>
<logger name="org.redisson" level="DEBUG"/>
```

## Version History

### Current Version: 1.0.1-SNAPSHOT
- Enhanced database connection management
- Improved Redis integration with cluster support
- Structured logging with performance metrics
- Comprehensive error handling and monitoring

## Contributing

When adding new core functionality:
1. Ensure thread safety for all utilities
2. Add comprehensive unit and integration tests
3. Update documentation and configuration examples
4. Consider performance impact on all modules
5. Follow established patterns for error handling and logging