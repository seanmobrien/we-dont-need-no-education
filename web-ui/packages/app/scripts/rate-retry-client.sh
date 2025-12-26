#!/bin/bash

# Rate Retry API Client
# Simple bash script to call the rate-retry API endpoint

set -e

# Configuration
API_HOST="${API_HOST:-http://localhost:3000}"
API_ENDPOINT="${API_HOST}/api/ai/chat/rate-retry"
TIMEOUT="${TIMEOUT:-300}" # 5 minutes timeout
LOG_FILE="${LOG_FILE:-/var/log/rate-retry-client.log}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
handle_error() {
    log "ERROR: $1"
    exit 1
}

# Main function
main() {
    log "Starting rate retry processing..."
    
    # Check if API endpoint is reachable
    if ! curl -f -s --connect-timeout 10 "${API_HOST}/api/health" >/dev/null 2>&1; then
        log "WARNING: Health check failed, but continuing with rate retry call"
    fi
    
    # Call the rate retry API
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" \
        --max-time "$TIMEOUT" \
        --retry 3 \
        --retry-delay 5 \
        --retry-max-time 60 \
        -H "Content-Type: application/json" \
        -H "User-Agent: rate-retry-client/1.0" \
        "$API_ENDPOINT" 2>>"$LOG_FILE")
    
    # Extract HTTP status code
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    case $http_code in
        200)
            log "SUCCESS: Rate retry processing completed"
            # Parse and log response details
            local processed=$(echo "$response_body" | grep -o '"processed":[0-9]*' | cut -d':' -f2 || echo "unknown")
            local duration=$(echo "$response_body" | grep -o '"duration":[0-9]*' | cut -d':' -f2 || echo "unknown")
            log "Processed: $processed requests, Duration: ${duration}ms"
            ;;
        500)
            log "ERROR: Server error during processing"
            log "Response: $response_body"
            exit 1
            ;;
        408|timeout)
            log "WARNING: Request timed out, processing may still be ongoing"
            ;;
        *)
            log "WARNING: Unexpected HTTP status: $http_code"
            log "Response: $response_body"
            ;;
    esac
    
    log "Rate retry processing completed with status: $http_code"
}

# Health check function
health_check() {
    log "Performing health check..."
    
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" \
        --connect-timeout 10 \
        --max-time 30 \
        "${API_HOST}/api/health" 2>>"$LOG_FILE")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log "Health check passed"
        return 0
    else
        log "Health check failed with status: $http_code"
        return 1
    fi
}

# Show help
show_help() {
    cat <<EOF
Rate Retry API Client

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help          Show this help message
    --health-check      Perform health check only
    --host HOST         API host (default: http://localhost:3000)
    --timeout SECONDS   Request timeout (default: 300)
    --log-file FILE     Log file path (default: /var/log/rate-retry-client.log)

ENVIRONMENT VARIABLES:
    API_HOST           API host URL
    TIMEOUT            Request timeout in seconds
    LOG_FILE           Log file path

EXAMPLES:
    $0                                    # Run with default settings
    $0 --host https://api.example.com     # Use custom host
    $0 --health-check                     # Health check only
    API_HOST=https://api.example.com $0   # Use environment variable

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --health-check)
            health_check
            exit $?
            ;;
        --host)
            API_HOST="$2"
            API_ENDPOINT="${API_HOST}/api/chat/rate-retry"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1" >&2
            show_help
            exit 1
            ;;
    esac
done

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Run main function
main