# Production Deployment Guide

This guide covers deploying sequelae-mcp in production environments.

## Prerequisites

- Node.js 14+ installed
- PostgreSQL database accessible
- PM2, systemd, or Docker for process management

## Environment Variables

Create a `.env` file or set these environment variables:

```bash
# Required
DATABASE_URL=postgresql://user:password@host:port/database

# Optional - Logging
LOG_LEVEL=info                    # debug, info, warn, error (default: info)
LOG_FORMAT=json                   # json or text (default: text)

# Optional - Connection Pool
POSTGRES_MAX_CONNECTIONS=20       # Maximum pool connections (default: 10)
POSTGRES_IDLE_TIMEOUT=30000       # Idle connection timeout in ms (default: 10000)
POSTGRES_CONNECTION_TIMEOUT=60000 # Connection timeout in ms (default: 30000)

# Optional - Query Settings
POSTGRES_STATEMENT_TIMEOUT=300000 # Query timeout in ms (default: 120000)
QUERY_TIMEOUT=300000              # CLI query timeout override

# Optional - SSL Configuration
POSTGRES_SSL_MODE=require         # disable, require, verify-ca, verify-full
POSTGRES_SSL_REJECT_UNAUTHORIZED=true # For self-signed certificates
```

## Deployment Methods

### 1. Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'sequelae-mcp',
    script: './dist/bin/sequelae.js',
    args: '--mcp',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@host/db',
      LOG_FORMAT: 'json',
      LOG_LEVEL: 'info'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    time: true
  }]
}
EOF

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 2. Using systemd

Create `/etc/systemd/system/sequelae-mcp.service`:

```ini
[Unit]
Description=Sequelae MCP Server
Documentation=https://github.com/yourusername/sequelae-mcp
After=network.target

[Service]
Type=simple
User=nodejs
Group=nodejs
WorkingDirectory=/opt/sequelae-mcp
ExecStart=/usr/bin/node /opt/sequelae-mcp/dist/bin/sequelae.js --mcp
Restart=always
RestartSec=10

# Environment
Environment="NODE_ENV=production"
Environment="DATABASE_URL=postgresql://user:pass@host/db"
Environment="LOG_FORMAT=json"
Environment="LOG_LEVEL=info"
Environment="POSTGRES_MAX_CONNECTIONS=20"

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/sequelae-mcp/logs

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sequelae-mcp
sudo systemctl start sequelae-mcp
sudo systemctl status sequelae-mcp
```

### 3. Using Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

# Install PostgreSQL client for pg_dump
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy built application
COPY dist/ ./dist/
COPY bin/ ./bin/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/bin/sequelae.js", "--mcp"]
```

Build and run:

```bash
# Build image
docker build -t sequelae-mcp .

# Run container
docker run -d \
  --name sequelae-mcp \
  --restart always \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  -e LOG_FORMAT=json \
  -e LOG_LEVEL=info \
  -e POSTGRES_MAX_CONNECTIONS=20 \
  sequelae-mcp
```

## Security Best Practices

### 1. Database Connection Security

```bash
# Use SSL for database connections
POSTGRES_SSL_MODE=require

# For production with valid certificates
POSTGRES_SSL_MODE=verify-full
POSTGRES_SSL_REJECT_UNAUTHORIZED=true
```

### 2. Network Security

- Run behind a reverse proxy (nginx, HAProxy)
- Use firewall rules to restrict database access
- Enable rate limiting for MCP endpoints

### 3. User Permissions

```sql
-- Create limited user for sequelae
CREATE USER sequelae_user WITH PASSWORD 'strong_password';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE mydb TO sequelae_user;
GRANT USAGE ON SCHEMA public TO sequelae_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sequelae_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO sequelae_user;

-- For backup functionality
GRANT pg_read_all_data TO sequelae_user; -- PostgreSQL 14+
```

### 4. Environment Variables

- Never commit `.env` files
- Use secrets management (AWS Secrets Manager, HashiCorp Vault)
- Rotate database passwords regularly

## Monitoring

### 1. Health Check Endpoint

For load balancers and monitoring:

```bash
# Add health check (future feature)
curl http://localhost:3000/health
```

### 2. Logging

Configure structured logging:

```bash
LOG_FORMAT=json
LOG_LEVEL=info

# Log aggregation with PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
```

### 3. Metrics

Monitor these key metrics:

- Database connection pool usage
- Query response times
- Error rates
- Memory usage
- CPU usage

## Performance Tuning

### 1. Connection Pool

```bash
# Adjust based on load
POSTGRES_MAX_CONNECTIONS=50      # For high traffic
POSTGRES_IDLE_TIMEOUT=60000      # Keep connections longer
POSTGRES_CONNECTION_TIMEOUT=10000 # Fail fast on connection issues
```

### 2. Query Timeouts

```bash
# Prevent long-running queries
POSTGRES_STATEMENT_TIMEOUT=60000  # 1 minute max
```

### 3. Node.js Settings

```bash
# Increase memory limit if needed
NODE_OPTIONS="--max-old-space-size=2048"

# Enable production optimizations
NODE_ENV=production
```

## Troubleshooting

### Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check SSL settings
openssl s_client -connect host:5432 -starttls postgres

# Verify environment variables
node -e "console.log(process.env.DATABASE_URL)"
```

### Performance Issues

```bash
# Check connection pool stats
# (Add monitoring endpoint in future version)

# Monitor query performance
tail -f logs/out.log | grep "duration"

# Database slow query log
ALTER DATABASE mydb SET log_min_duration_statement = 1000;
```

### Common Errors

1. **ECONNREFUSED**: Database not accessible
   - Check firewall rules
   - Verify database is running
   - Check connection string

2. **ETIMEDOUT**: Connection timeout
   - Increase `POSTGRES_CONNECTION_TIMEOUT`
   - Check network latency
   - Verify security groups/firewall

3. **SSL errors**: Certificate issues
   - Set `POSTGRES_SSL_REJECT_UNAUTHORIZED=false` for self-signed
   - Provide proper CA certificates for production

## Backup Strategy

### Automated Backups

Create backup script `/opt/sequelae-mcp/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASE_URL="postgresql://user:pass@host/db"

# Create backup
npx sequelae backup --output "$BACKUP_DIR/backup_$TIMESTAMP.sql" --compress

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql*" -mtime +7 -delete

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz" s3://my-bucket/backups/
```

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * /opt/sequelae-mcp/backup.sh >> /var/log/sequelae-backup.log 2>&1
```

## Scaling Considerations

### Horizontal Scaling

- Run multiple instances behind a load balancer
- Use read replicas for read-heavy workloads
- Implement caching layer (Redis) for frequent queries

### Vertical Scaling

- Monitor memory usage and increase as needed
- Adjust connection pool size based on CPU cores
- Use connection pooler (PgBouncer) for many connections

## Disaster Recovery

1. **Regular Backups**: Automated daily backups with offsite storage
2. **Point-in-Time Recovery**: Enable PostgreSQL WAL archiving
3. **Replication**: Set up streaming replication for failover
4. **Testing**: Regularly test backup restoration

## Maintenance

### Regular Tasks

- Monitor disk space for logs
- Review and rotate database credentials
- Update dependencies for security patches
- Analyze query performance and optimize

### Updates

```bash
# Backup before updates
npx sequelae backup --output pre_update_backup.sql

# Update application
git pull
npm ci --only=production
npm run build

# Restart service
pm2 restart sequelae-mcp
# or
sudo systemctl restart sequelae-mcp
```

## Support

For production issues:
- Check logs first: `pm2 logs` or `journalctl -u sequelae-mcp`
- Review this guide's troubleshooting section
- Open an issue: https://github.com/yourusername/sequelae-mcp/issues