#!/bin/bash
set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Paths
ENV_LOCAL_PATH="$PROJECT_ROOT/packages/app/.env.local"
SECRETS_DIR="$PROJECT_ROOT/secrets"
CONTAINER_NAME="web-ui-local"
IMAGE_TAG="web-ui:localbuild"

# Set only on build runs
DOCKER_EXTRA_BUILD_ARGS=""

# Parse command line arguments
ACTION="${1:-build-and-run}"
shift || true
DOCKER_EXTRA_ARGS="$@"

function show_usage() {
    echo -e "${BLUE}Usage:${NC}"
    echo -e "  $0 [ACTION]"
    echo -e ""
    echo -e "${BLUE}Actions:${NC}"
    echo -e "  ${GREEN}build${NC}           Build Docker image only (with secrets, no container run)"
    echo -e "  ${GREEN}run${NC}             Run container from existing image (with runtime secrets)"
    echo -e "  ${GREEN}build-and-run${NC}   Build image and run container (default)"
    echo -e ""
    echo -e "${BLUE}Examples:${NC}"
    echo -e "  $0 build              # Just build the image"
    echo -e "  $0 run                # Just run a container"
    echo -e "  $0 build-and-run      # Build and run (same as no args)"
    echo -e "  $0                     # Build and run (default)"
    exit 0
}

# Validate action
if [[ "$ACTION" != "build" && "$ACTION" != "run" && "$ACTION" != "build-and-run" && "$ACTION" != "--help" && "$ACTION" != "-h" ]]; then
    echo -e "${RED}Error: Invalid action '$ACTION'${NC}"
    echo ""
    show_usage
fi

if [[ "$ACTION" == "--help" || "$ACTION" == "-h" ]]; then
    show_usage
fi

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Docker Build Script - ${ACTION}${NC}"
echo -e "${GREEN}====================================${NC}"

# ============================================
# Helper Functions
# ============================================

function load_environment() {
    echo -e "\n${YELLOW}[Loading Environment]${NC}"
    
    if [ ! -f "$ENV_LOCAL_PATH" ]; then
        echo -e "${RED}ERROR: Environment file not found!${NC}"
        echo -e "${RED}Expected file at: $ENV_LOCAL_PATH${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓${NC} Found environment file: $ENV_LOCAL_PATH"
    echo -e "${YELLOW}Loading environment variables...${NC}"
    
    # Load .env.local into environment
    set -a
    source "$ENV_LOCAL_PATH"
    set +a
    
    echo -e "${GREEN}✓${NC} Environment variables loaded"
}

function create_build_secrets() {
    echo -e "\n${YELLOW}[Creating Build Secrets]${NC}"
    
    if [ -d "$SECRETS_DIR" ]; then
        echo -e "${YELLOW}⚠${NC} Secrets directory already exists, cleaning up..."
        rm -rf "$SECRETS_DIR"
    fi
    
    mkdir -p "$SECRETS_DIR"
    echo -e "${GREEN}✓${NC} Created secrets directory: $SECRETS_DIR"
    
    # List of secrets to extract
    SECRETS=(
        "AZURE_API_KEY"
        "DATABASE_URL"
        "AUTH_GOOGLE_SECRET"
        "AZURE_AISEARCH_KEY"
        "REDIS_PASSWORD"
        "FLAGSMITH_SDK_KEY"
        "OPENAI_KEY_TEXT"
        "NEXT_PUBLIC_MUI_LICENSE"
        "NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING"
        "REDIS_URL"
        "AUTH_GOOGLE_APIKEY"
        "AUTH_GOOGLE_ID"
        "AZURE_STORAGE_ACCOUNT_KEY"
        "AZURE_STORAGE_CONNECTION_STRING"
    )
    
    MISSING_SECRETS=()
    
    for secret_name in "${SECRETS[@]}"; do
        # Get the value from environment
        secret_value="${!secret_name:-}"
        
        if [ -z "$secret_value" ]; then
            echo -e "${YELLOW}⚠${NC} Warning: $secret_name is not set or empty"
            MISSING_SECRETS+=("$secret_name")
        else
            # Write to file
            echo -n "$secret_value" > "$SECRETS_DIR/$secret_name"
            echo -e "${GREEN}✓${NC} Created secret file: $secret_name"
    
            # Special case: if this is OPENAI_KEY_TEXT, also create OPENID_KEY_TEXT
            if [ "$secret_name" = "OPENAI_KEY_TEXT" ]; then
                echo -n "$secret_value" > "$SECRETS_DIR/OPENID_KEY_TEXT"
                echo -e "${GREEN}✓${NC} Created secret file: OPENID_KEY_TEXT (alias for OPENID_KEY)"
            fi
        fi
    done
    
    if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
        echo -e "\n${YELLOW}⚠ Warning: ${#MISSING_SECRETS[@]} secret(s) are missing or empty:${NC}"
        for missing in "${MISSING_SECRETS[@]}"; do
            echo -e "  - $missing"
        done
        echo -e "${YELLOW}Build will continue but may fail if these are required.${NC}"
    fi
}

# Ensure Next.js standalone build exists
function ensure_standalone() {
    local standalone_dir="$PROJECT_ROOT/packages/app/.next/standalone"
    if [ ! -d "$standalone_dir" ]; then
        echo -e "\n${RED}ERROR: Next.js standalone build not found.${NC}" >&2
        echo -e "${RED}Expected directory: $standalone_dir${NC}" >&2
        echo -e "${RED}Please build the app (e.g. run: yarn workspace @compliance-theater/app build) before running this script.${NC}\n" >&2
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Found Next.js standalone directory: $standalone_dir"
}

function build_image() {
    echo -e "\n${YELLOW}[Building Docker Image]${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Verify standalone build exists before attempting to build the image
    ensure_standalone
    
    # Extract git commit hash
    VCS_REF="${VCS_REF:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}"
    VERSION="${VERSION:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'main')}"
    BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Build command
    echo -e "${GREEN}Build Configuration:${NC}"
    echo -e "  VCS_REF: $VCS_REF"
    echo -e "  VERSION: $VERSION"
    echo -e "  BUILD_DATE: $BUILD_DATE"
    echo -e "\n${YELLOW}Running docker buildx build...${NC}\n"
    
    docker buildx build \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg VCS_REF="$VCS_REF" \
        --build-arg VERSION="$VERSION" \
        --build-arg NEXT_PUBLIC_HOSTNAME="${NEXT_PUBLIC_HOSTNAME:-http://localhost:3000}" \
        --build-arg NEXT_PUBLIC_LOG_LEVEL_CLIENT="${NEXT_PUBLIC_LOG_LEVEL_CLIENT:-info}" \
        --build-arg NEXT_PUBLIC_DEFAULT_AI_MODEL="${NEXT_PUBLIC_DEFAULT_AI_MODEL:-lofi}" \
        --build-arg NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT="${NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT:-15}" \
        --build-arg NEXT_PUBLIC_FLAGSMITH_API_URL="${NEXT_PUBLIC_FLAGSMITH_API_URL:-}" \
        --build-arg NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID="${NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID:-}" \
        --build-arg OTEL_SERVICE_NAME="${OTEL_SERVICE_NAME:-WebApi}" \
        --build-arg OTEL_RESOURCE_ATTRIBUTES="${OTEL_RESOURCE_ATTRIBUTES:-}" \
        --build-arg RATE_RETRY_INTERVAL_MINUTES="${RATE_RETRY_INTERVAL_MINUTES:-5}" \
        --build-arg AZURE_OPENAI_ENDPOINT="${AZURE_OPENAI_ENDPOINT:-}" \
        --build-arg AZURE_AISEARCH_ENDPOINT="${AZURE_AISEARCH_ENDPOINT:-}" \
        --build-arg AZURE_AISEARCH_DOCUMENTS_INDEX_NAME="${AZURE_AISEARCH_DOCUMENTS_INDEX_NAME:-}" \
        --build-arg AZURE_AISEARCH_POLICY_INDEX_NAME="${AZURE_AISEARCH_POLICY_INDEX_NAME:-}" \
        --build-arg AZURE_STORAGE_ACCOUNT_NAME="${AZURE_STORAGE_ACCOUNT_NAME:-}" \
        --build-arg AZURE_STORAGE_CONNECTION_STRING="${AZURE_STORAGE_CONNECTION_STRING:-}" \
        --build-arg MEM0_API_HOST="${MEM0_API_HOST:-}" \
        --build-arg MEM0_UI_HOST="${MEM0_UI_HOST:-}" \
        --build-arg MEM0_USERNAME="${MEM0_USERNAME:-}" \
        --secret id=AZURE_API_KEY,src="$SECRETS_DIR/AZURE_API_KEY" \
        --secret id=DATABASE_URL,src="$SECRETS_DIR/DATABASE_URL" \
        --secret id=AUTH_GOOGLE_SECRET,src="$SECRETS_DIR/AUTH_GOOGLE_SECRET" \
        --secret id=AZURE_AISEARCH_KEY,src="$SECRETS_DIR/AZURE_AISEARCH_KEY" \
        --secret id=REDIS_PASSWORD,src="$SECRETS_DIR/REDIS_PASSWORD" \
        --secret id=FLAGSMITH_SDK_KEY,src="$SECRETS_DIR/FLAGSMITH_SDK_KEY" \
        --secret id=OPENID_KEY_TEXT,src="$SECRETS_DIR/OPENID_KEY_TEXT" \
        --secret id=NEXT_PUBLIC_MUI_LICENSE,src="$SECRETS_DIR/NEXT_PUBLIC_MUI_LICENSE" \
        --secret id=NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,src="$SECRETS_DIR/NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING" \
        --secret id=REDIS_URL,src="$SECRETS_DIR/REDIS_URL" \
        --secret id=AUTH_GOOGLE_APIKEY,src="$SECRETS_DIR/AUTH_GOOGLE_APIKEY" \
        --secret id=AUTH_GOOGLE_ID,src="$SECRETS_DIR/AUTH_GOOGLE_ID" \
        --secret id=AZURE_STORAGE_ACCOUNT_KEY,src="$SECRETS_DIR/AZURE_STORAGE_ACCOUNT_KEY" \
        --secret id=AZURE_STORAGE_CONNECTION_STRING,src="$SECRETS_DIR/AZURE_STORAGE_CONNECTION_STRING" \
        --label org.opencontainers.image.created="$BUILD_DATE" \
        --label org.opencontainers.image.revision="$VCS_REF" \
        --label org.opencontainers.image.version="$VERSION" \
        --label org.opencontainers.image.source="https://github.com/seanmobrien/we-dont-need-no-education" \
        --label org.opencontainers.image.title="we-dont-need-no-education" \
        --label org.opencontainers.image.url="https://github.com/seanmobrien/we-dont-need-no-education" \
        $DOCKER_EXTRA_BUILD_ARGS \
        --file ./Dockerfile \
        -t "$IMAGE_TAG" \
        .
    
    BUILD_EXIT_CODE=$?
    
    if [ $BUILD_EXIT_CODE -ne 0 ]; then
        echo -e "\n${RED}✗ Docker build failed with exit code $BUILD_EXIT_CODE${NC}"
        echo -e "${RED}Cleaning up secrets directory...${NC}"
        rm -rf "$SECRETS_DIR"
        exit $BUILD_EXIT_CODE
    fi
    
    echo -e "\n${GREEN}✓ Docker image built successfully: $IMAGE_TAG${NC}"
}

function cleanup_build_secrets() {
    if [ -d "$SECRETS_DIR" ]; then
        echo -e "\n${YELLOW}[Cleanup]${NC} Removing build secrets directory..."
        rm -rf "$SECRETS_DIR"
        echo -e "${GREEN}✓${NC} Build secrets cleaned up"
    fi
}

function prepare_runtime_secrets() {
    echo -e "\n${YELLOW}[Preparing Runtime Secrets]${NC}" >&2
    
    # Create a uniquely named temp directory for runtime secrets
    RUNTIME_SECRETS_DIR=$(mktemp -d "${TMPDIR:-/tmp}/docker-secrets.XXXXXXXXXX")
    echo -e "${GREEN}✓${NC} Created runtime secrets directory: $RUNTIME_SECRETS_DIR" >&2
    
    # If secrets already exist in SECRETS_DIR, copy them
    if [ -d "$SECRETS_DIR" ] && [ "$(ls -A $SECRETS_DIR 2>/dev/null)" ]; then
        echo -e "${YELLOW}Copying secrets to runtime directory...${NC}" >&2
        cp -r "$SECRETS_DIR"/* "$RUNTIME_SECRETS_DIR/"
        echo -e "${GREEN}✓${NC} Secrets copied to runtime directory" >&2
    else
        # Create secrets from environment
        echo -e "${YELLOW}Creating secrets from environment...${NC}" >&2
        
        SECRETS=(
            "AZURE_API_KEY"
            "DATABASE_URL"
            "AUTH_GOOGLE_SECRET"
            "AZURE_AISEARCH_KEY"
            "REDIS_PASSWORD"
            "FLAGSMITH_SDK_KEY"
            "OPENAI_KEY_TEXT"
            "NEXT_PUBLIC_MUI_LICENSE"
            "NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING"
            "REDIS_URL"
            "AUTH_GOOGLE_APIKEY"
            "AUTH_GOOGLE_ID"
            "AZURE_STORAGE_ACCOUNT_KEY"
            "AZURE_STORAGE_CONNECTION_STRING"
        )
        
        for secret_name in "${SECRETS[@]}"; do
            secret_value="${!secret_name:-}"
            if [ -n "$secret_value" ]; then
                echo -n "$secret_value" > "$RUNTIME_SECRETS_DIR/$secret_name"
                
                # Special case for OPENAI_KEY_TEXT
                if [ "$secret_name" = "OPENAI_KEY_TEXT" ]; then
                    echo -n "$secret_value" > "$RUNTIME_SECRETS_DIR/OPENID_KEY_TEXT"
                fi
            fi
        done
        
        echo -e "${GREEN}✓${NC} Runtime secrets created from environment" >&2
    fi
    
    # Return the runtime secrets directory path
    echo "$RUNTIME_SECRETS_DIR"
}

function create_processed_env_file() {
    echo -e "\n${YELLOW}[Processing Environment File]${NC}" >&2
    
    # Create a temporary processed env file
    PROCESSED_ENV_FILE=$(mktemp "${TMPDIR:-/tmp}/docker-env.XXXXXXXXXX")
    
    # Process the env file to remove quotes
    # This handles: KEY="value" -> KEY=value and KEY='value' -> KEY=value
    if [ -f "$ENV_LOCAL_PATH" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip empty lines and comments
            if [[ -z "$line" ]] || [[ "$line" =~ ^[[:space:]]*# ]]; then
                continue
            fi
            
            # Check if line contains an assignment
            if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
                key="${BASH_REMATCH[1]}"
                value="${BASH_REMATCH[2]}"
                
                # Remove leading/trailing whitespace from value
                value="$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
                
                # Remove surrounding quotes (both single and double)
                if [[ "$value" =~ ^\"(.*)\"$ ]] || [[ "$value" =~ ^\'(.*)\'$ ]]; then
                    value="${BASH_REMATCH[1]}"
                fi
                
                echo "${key}=${value}" >> "$PROCESSED_ENV_FILE"
            fi
        done < "$ENV_LOCAL_PATH"
        
        echo -e "${GREEN}✓${NC} Created processed env file: $PROCESSED_ENV_FILE" >&2
    else
        echo -e "${RED}ERROR: Environment file not found: $ENV_LOCAL_PATH${NC}" >&2
        rm -f "$PROCESSED_ENV_FILE"
        exit 1
    fi
    
    # Return the processed env file path
    echo "$PROCESSED_ENV_FILE"
}

function stop_existing_container() {
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "${YELLOW}Stopping and removing existing container: $CONTAINER_NAME${NC}"
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
        echo -e "${GREEN}✓${NC} Existing container removed"
    fi
}
 
function run_container() {
    local runtime_secrets_dir="$1"
    local processed_env_file="$2"
    shift 2
    local extra_args="$@"
    
    echo -e "\n${YELLOW}[Starting Container]${NC}" >&2
    
    # Check if image exists
    if ! docker image inspect "$IMAGE_TAG" >/dev/null 2>&1; then
        echo -e "${RED}ERROR: Image '$IMAGE_TAG' not found!${NC}" >&2
        echo -e "${RED}Please build the image first using: $0 build${NC}" >&2
        rm -rf "$runtime_secrets_dir"
        rm -f "$processed_env_file"
        exit 1
    fi
    
    stop_existing_container
    
    if [ -n "$extra_args" ]; then
        echo -e "${YELLOW}Starting new container with extra args: ${extra_args}${NC}\n" >&2
    else
        echo -e "${YELLOW}Starting new container...${NC}\n" >&2
    fi
    
    docker run -d \
        --name "$CONTAINER_NAME" \
        -p 3000:3000 \
        --env-file "$processed_env_file" \
        --mount type=bind,source="$runtime_secrets_dir/AZURE_API_KEY",target=/run/secrets/AZURE_API_KEY,readonly \
        --mount type=bind,source="$runtime_secrets_dir/DATABASE_URL",target=/run/secrets/DATABASE_URL,readonly \
        --mount type=bind,source="$runtime_secrets_dir/AUTH_GOOGLE_SECRET",target=/run/secrets/AUTH_GOOGLE_SECRET,readonly \
        --mount type=bind,source="$runtime_secrets_dir/AZURE_AISEARCH_KEY",target=/run/secrets/AZURE_AISEARCH_KEY,readonly \
        --mount type=bind,source="$runtime_secrets_dir/REDIS_PASSWORD",target=/run/secrets/REDIS_PASSWORD,readonly \
        --mount type=bind,source="$runtime_secrets_dir/FLAGSMITH_SDK_KEY",target=/run/secrets/FLAGSMITH_SDK_KEY,readonly \
        --mount type=bind,source="$runtime_secrets_dir/OPENID_KEY_TEXT",target=/run/secrets/OPENID_KEY_TEXT,readonly \
        --mount type=bind,source="$runtime_secrets_dir/NEXT_PUBLIC_MUI_LICENSE",target=/run/secrets/NEXT_PUBLIC_MUI_LICENSE,readonly \
        --mount type=bind,source="$runtime_secrets_dir/NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING",target=/run/secrets/NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,readonly \
        --mount type=bind,source="$runtime_secrets_dir/REDIS_URL",target=/run/secrets/REDIS_URL,readonly \
        --mount type=bind,source="$runtime_secrets_dir/AUTH_GOOGLE_APIKEY",target=/run/secrets/AUTH_GOOGLE_APIKEY,readonly \
        --mount type=bind,source="$runtime_secrets_dir/AUTH_GOOGLE_ID",target=/run/secrets/AUTH_GOOGLE_ID,readonly \
        --mount type=bind,source="$runtime_secrets_dir/AZURE_STORAGE_ACCOUNT_KEY",target=/run/secrets/AZURE_STORAGE_ACCOUNT_KEY,readonly \
        --mount type=bind,source="$runtime_secrets_dir/AZURE_STORAGE_CONNECTION_STRING",target=/run/secrets/AZURE_STORAGE_CONNECTION_STRING,readonly \
        $extra_args \
        "$IMAGE_TAG"
    
    RUN_EXIT_CODE=$?
    
    if [ $RUN_EXIT_CODE -ne 0 ]; then
        echo -e "\n${RED}✗ Failed to start container${NC}" >&2
        echo -e "${RED}Cleaning up runtime secrets directory...${NC}" >&2
        rm -rf "$runtime_secrets_dir"
        rm -f "$processed_env_file"
        exit $RUN_EXIT_CODE
    fi
    
    echo -e "\n${GREEN}✓ Container started successfully: $CONTAINER_NAME${NC}" >&2
    
    # Start background cleanup process that waits for container to stop
    (
        docker wait "$CONTAINER_NAME" >/dev/null 2>&1
        echo -e "\n${YELLOW}Container stopped, cleaning up secrets...${NC}" >&2
        rm -rf "$runtime_secrets_dir"
        rm -f "$processed_env_file"
        echo -e "${GREEN}✓ Runtime secrets cleaned up${NC}" >&2
    ) &
    
    CLEANUP_PID=$!
    echo -e "${GREEN}✓${NC} Background cleanup process started (PID: $CLEANUP_PID)" >&2
    
    # Return the runtime secrets directory for display
    echo "$runtime_secrets_dir"
}

function show_summary() {
    local runtime_secrets_dir="${1:-}"
    
    echo -e "\n${GREEN}====================================${NC}"
    echo -e "${GREEN}Operation Complete!${NC}"
    echo -e "${GREEN}====================================${NC}"
    
    if [[ "$ACTION" == "build" ]]; then
        echo -e "${GREEN}Image Tag:${NC} $IMAGE_TAG"
        echo -e "${GREEN}Status:${NC} Built successfully"
        echo -e "\n${YELLOW}Next steps:${NC}"
        echo -e "  Run container: $0 run"
    elif [[ "$ACTION" == "run" || "$ACTION" == "build-and-run" ]]; then
        echo -e "${GREEN}Container Name:${NC} $CONTAINER_NAME"
        echo -e "${GREEN}Image Tag:${NC} $IMAGE_TAG"
        echo -e "${GREEN}Port:${NC} 3000"
        echo -e "${GREEN}Status:${NC} Running"
        if [ -n "$runtime_secrets_dir" ]; then
            echo -e "${GREEN}Secrets Directory:${NC} $runtime_secrets_dir"
            echo -e "${YELLOW}Note:${NC} Secrets will be auto-cleaned when container stops"
        fi
        echo -e "\n${YELLOW}Useful commands:${NC}"
        echo -e "  View logs:    docker logs -f $CONTAINER_NAME"
        echo -e "  Stop:         docker stop $CONTAINER_NAME"
        echo -e "  Remove:       docker rm $CONTAINER_NAME"
        echo -e "  Access:       http://localhost:3000"
        if [ -n "$runtime_secrets_dir" ]; then
            echo -e "\n${YELLOW}Manual cleanup (if needed):${NC}"
            echo -e "  docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME && rm -rf $runtime_secrets_dir"
        fi
    fi
    
    echo -e "\n${GREEN}✓ All done!${NC}\n"
}

# ============================================
# Main Execution
# ============================================

case "$ACTION" in
    build)
        load_environment
        create_build_secrets
        DOCKER_EXTRA_BUILD_ARGS=$DOCKER_EXTRA_ARGS
        build_image
        cleanup_build_secrets
        show_summary
        ;;
    
    run)
        load_environment
        RUNTIME_SECRETS_DIR=$(prepare_runtime_secrets)
        PROCESSED_ENV_FILE=$(create_processed_env_file)
        RUNTIME_SECRETS_DIR=$(run_container "$RUNTIME_SECRETS_DIR" "$PROCESSED_ENV_FILE" $DOCKER_EXTRA_ARGS)
        show_summary "$RUNTIME_SECRETS_DIR"
        ;;
    
    build-and-run)
        load_environment
        create_build_secrets
        build_image
        
        # Prepare runtime secrets (will copy from build secrets)
        RUNTIME_SECRETS_DIR=$(prepare_runtime_secrets)
        
        # Clean up build secrets before running
        cleanup_build_secrets
        
        # Create processed env file without quotes
        PROCESSED_ENV_FILE=$(create_processed_env_file)
        
        # Run container with runtime secrets
        RUNTIME_SECRETS_DIR=$(run_container "$RUNTIME_SECRETS_DIR" "$PROCESSED_ENV_FILE" $DOCKER_EXTRA_ARGS)
        show_summary "$RUNTIME_SECRETS_DIR"
        ;;
    
    *)
        echo -e "${RED}Error: Unknown action '$ACTION'${NC}"
        show_usage
        ;;
esac
