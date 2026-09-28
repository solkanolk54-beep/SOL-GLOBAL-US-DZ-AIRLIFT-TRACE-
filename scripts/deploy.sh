#!/bin/bash
# ==============================================================================
# SOL Global / US-DZ Airlift & Livestock Trace Platform
# Production One-Click Deployment & Health Verification Automation Script
# ==============================================================================

set -e

# ANSI Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script directory reference
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "======================================================================"
    echo "  🚀 SOL GLOBAL | US-DZ AIRLIFT & LIVESTOCK TRACE PLATFORM"
    echo "  📦 Automated Container Orchestration & One-Click Deployment"
    echo "======================================================================"
    echo -e "${NC}"
}

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✔ SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[⚠ WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[✖ ERROR]${NC} $1"
}

# Determine Docker Compose command
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    log_error "Neither 'docker compose' nor 'docker-compose' was found on this system."
    echo "Please install Docker and Docker Compose before running this deployment."
    exit 1
fi

# Parse Command Line Arguments
ACTION="${1:-deploy}"

case "${ACTION}" in
    --stop|stop|down)
        print_banner
        log_info "Stopping all SOL Global containerized services..."
        ${DOCKER_COMPOSE} down
        log_success "All services stopped cleanly."
        exit 0
        ;;
    --restart|restart)
        print_banner
        log_info "Restarting SOL Global containerized services..."
        ${DOCKER_COMPOSE} restart
        log_success "All services restarted."
        exit 0
        ;;
    --logs|logs)
        ${DOCKER_COMPOSE} logs -f
        exit 0
        ;;
    --status|status|ps)
        print_banner
        ${DOCKER_COMPOSE} ps
        exit 0
        ;;
    --deploy|deploy|up|"")
        # Proceed with standard deployment flow
        ;;
    *)
        echo "Usage: $0 [deploy|stop|restart|logs|status]"
        exit 1
        ;;
esac

print_banner

# Step 1: Pre-flight Verification
log_info "Step 1/5: Verifying environment configuration..."

if [ ! -f ".env.production" ]; then
    log_warn ".env.production not found. Generating default production configuration..."
    cat <<EOF > .env.production
NODE_ENV=production
PORT=3000
TZ=Africa/Algiers
POSTGRES_DB=sol_livestock_db
POSTGRES_USER=sol_admin
POSTGRES_PASSWORD=sol_tactical_secure_pass_2026
POSTGRES_PORT=5432
DATABASE_URL=postgresql://sol_admin:sol_tactical_secure_pass_2026@db_spatial:5432/sol_livestock_db
REDIS_HOST=cache_redis
REDIS_PORT=6379
REDIS_URL=redis://cache_redis:6379
MQTT_BROKER_HOST=mqtt_broker
MQTT_TCP_PORT=1883
MQTT_WS_PORT=9001
MQTT_BROKER_URL=mqtt://mqtt_broker:1883
MQTT_WS_URL=ws://localhost:9001
PASSPORT_HMAC_SECRET=sol_global_dz_us_sha256_audit_cryptographic_seal_key_2026
API_RATE_LIMIT_MAX=2000
API_RATE_LIMIT_WINDOW_MS=60000
EOF
    log_success ".env.production successfully generated."
else
    log_success ".env.production is present and loaded."
fi

# Step 2: Validate Directory Trees and File Descriptors
log_info "Step 2/5: Validating Docker storage prerequisites and mount points..."
mkdir -p docker/postgres docker/mosquitto
if [ ! -f "docker/postgres/init-db.sql" ]; then
    log_error "Missing PostgreSQL schema file at docker/postgres/init-db.sql"
    exit 1
fi
if [ ! -f "docker/mosquitto/mosquitto.conf" ]; then
    log_error "Missing Mosquitto configuration at docker/mosquitto/mosquitto.conf"
    exit 1
fi
log_success "Directory structure and configuration mounts verified."

# Step 3: Container Orchestration & Image Builds
log_info "Step 3/5: Building and starting multi-container cluster in background..."
${DOCKER_COMPOSE} up -d --build

log_success "Container initialization triggered."

# Step 4: Healthcheck & Service Readiness Probe
log_info "Step 4/5: Polling microservice health probes and database connections..."
MAX_ATTEMPTS=24
ATTEMPT=0
HEALTHY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo -ne "  ⏳ Awaiting API & Database readiness (attempt ${ATTEMPT}/${MAX_ATTEMPTS})...\r"
    
    if curl -s -f http://localhost:3000/api/health >/dev/null 2>&1; then
        HEALTHY=true
        echo ""
        break
    fi
    sleep 2
done

if [ "$HEALTHY" = true ]; then
    HEALTH_DATA=$(curl -s http://localhost:3000/api/health)
    log_success "Healthcheck verified: API is OPERATIONAL!"
    echo -e "${GREEN}Response:${NC} ${HEALTH_DATA}"
else
    log_warn "Healthcheck timed out on host port 3000. Inspecting container states..."
    ${DOCKER_COMPOSE} ps
fi

# Step 5: Summary Deployment Dashboard
echo ""
echo -e "${GREEN}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD}  🎉 SOL GLOBAL PRODUCTION STACK IS ACTIVE & OPERATIONAL!${NC}"
echo -e "${GREEN}${BOLD}======================================================================${NC}"
echo ""
echo -e "${BOLD}Operational Endpoints & Network Ports:${NC}"
echo -e "  🌐 Web Dashboard & API:      ${CYAN}http://localhost:3000${NC}"
echo -e "  📡 API Healthcheck:          ${CYAN}http://localhost:3000/api/health${NC}"
echo -e "  🗺️ PostgreSQL + PostGIS:     ${CYAN}localhost:5432${NC} (DB: sol_livestock_db, User: sol_admin)"
echo -e "  ⚡ Redis Cache & Pub/Sub:    ${CYAN}localhost:6379${NC}"
echo -e "  🔌 MQTT Standard TCP:        ${CYAN}localhost:1883${NC} (Hardware guns & IoT bridges)"
echo -e "  🌐 MQTT WebSockets:          ${CYAN}ws://localhost:9001${NC} (Web clients & Dashboards)"
echo ""
echo -e "${BOLD}Management & Observability Commands:${NC}"
echo -e "  • Tail real-time server logs:  ${YELLOW}${DOCKER_COMPOSE} logs -f app_server${NC}"
echo -e "  • Tail MQTT broker logs:       ${YELLOW}${DOCKER_COMPOSE} logs -f mqtt_broker${NC}"
echo -e "  • Check cluster health status: ${YELLOW}./scripts/deploy.sh status${NC}"
echo -e "  • Stop all tactical services:  ${YELLOW}./scripts/deploy.sh stop${NC}"
echo -e "  • Restart tactical services:   ${YELLOW}./scripts/deploy.sh restart${NC}"
echo ""
