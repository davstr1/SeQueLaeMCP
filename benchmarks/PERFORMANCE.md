# Performance Benchmarks - sequelae-mcp

## Overview

This document outlines the expected performance characteristics of sequelae-mcp based on its architecture and typical PostgreSQL query patterns.

## Performance Characteristics

### Query Latency

| Query Type | Expected Latency | Notes |
|------------|-----------------|--------|
| Simple SELECT (e.g., `SELECT 1`) | 5-15ms | Minimal overhead, connection pooling helps |
| Schema queries | 10-30ms | Depends on number of tables/columns |
| Complex joins | 20-100ms | Highly dependent on data size and indexes |
| File execution | +5-10ms | Additional file I/O overhead |

### Throughput

| Concurrency | Expected QPS | Notes |
|-------------|--------------|--------|
| Sequential (1) | 50-100 | Limited by round-trip time |
| Low (5) | 200-400 | Good balance of throughput and latency |
| Medium (10) | 300-600 | Connection pool starts to matter |
| High (20) | 400-800 | Diminishing returns, pool saturation |

### MCP Mode Performance

- **Startup time**: 100-200ms (Node.js initialization)
- **Tool discovery**: 5-10ms (in-memory operation)
- **JSON parsing overhead**: 1-2ms per request
- **Rate limiting overhead**: <1ms (when enabled)

## Optimization Features

### 1. Connection Pooling
- Maintains persistent connections to avoid connection overhead
- Default pool size: 10 connections
- Configurable via `POSTGRES_MAX_CONNECTIONS`
- Reduces connection time from ~50ms to <1ms

### 2. Query Timeout
- Default: 120 seconds
- Configurable via `QUERY_TIMEOUT` or per-query
- Prevents long-running queries from blocking

### 3. Transaction Management
- Automatic transaction wrapping (can be disabled)
- Rollback on error prevents partial updates
- Overhead: ~2-5ms per transaction

### 4. Rate Limiting (MCP Mode)
- Token bucket algorithm
- Minimal overhead (<1ms)
- Prevents resource exhaustion
- Tool-specific limits supported

## Memory Usage

- **Base memory**: 30-50MB (Node.js runtime)
- **Per connection**: ~1-2MB
- **Query result buffering**: Varies by result size
- **Rate limiter**: <1MB even with many clients

## Recommendations

### For Best Performance:

1. **Use connection pooling** - Always enabled by default
2. **Set appropriate timeouts** - Prevent runaway queries
3. **Use prepared statements** - When executing similar queries repeatedly
4. **Enable rate limiting** - For production MCP deployments
5. **Monitor pool usage** - Use health check tool to track connections

### Performance Tuning:

```bash
# Increase connection pool size for high concurrency
export POSTGRES_MAX_CONNECTIONS=20

# Reduce timeout for interactive use
export QUERY_TIMEOUT=30000

# Enable statement timeout at database level
export POSTGRES_STATEMENT_TIMEOUT=60000

# Configure rate limiting for MCP mode
export MCP_RATE_LIMIT_MAX_REQUESTS=1000
export MCP_RATE_LIMIT_WINDOW_MS=60000
```

## Bottlenecks

1. **Network latency** - Primary factor for simple queries
2. **Database performance** - Complex queries limited by PostgreSQL
3. **Node.js startup** - Initial CLI invocation overhead
4. **Result size** - Large result sets increase transfer time

## Future Improvements

1. **Query caching** - Cache schema queries and static data
2. **Prepared statements** - Reuse query plans
3. **Binary protocol** - Use PostgreSQL binary format
4. **Compression** - Compress large result sets
5. **Streaming results** - Stream large result sets instead of buffering