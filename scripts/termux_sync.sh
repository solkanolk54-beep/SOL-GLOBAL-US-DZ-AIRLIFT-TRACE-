#!/bin/bash
# ==============================================================================
# SOL GLOBAL • US-DZ LIVESTOCK FIELD SCANNER (TERMUX / ANDROID CLI UTILITY)
# Bulk RFID Tag Ingestion, Offline Queue & Central Sync Engine (ISO 11784/11785)
# ==============================================================================

SERVER_URL="${SOL_SERVER_URL:-http://localhost:3000}"
BATCH_DIR="${HOME}/sol_livestock_batches"
OFFLINE_QUEUE_FILE="${BATCH_DIR}/offline_scans_queue.json"
mkdir -p "$BATCH_DIR"

# Colors for Termux terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_banner() {
    clear
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}🌾 SOL GLOBAL • FIELD RFID SCANNER & TERMUX SYNC ENGINE        ${NC}"
    echo -e "${GREEN}   Quarantine Station & Airlift Terminal Bulk Ingestion         ${NC}"
    echo -e "${GREEN}================================================================${NC}"
    echo -e "Server Target: ${CYAN}${SERVER_URL}${NC}"
    echo -e "Offline Queue: ${YELLOW}${OFFLINE_QUEUE_FILE}${NC}"
    echo ""
}

# Function to send a single RFID scan
scan_single_tag() {
    local tag="$1"
    local checkpoint="${2:-Adrar Quarantine Primary Terminal}"
    local operator="${3:-OP-TERMUX-01}"

    if [ -z "$tag" ]; then
        echo -e "${RED}[ERROR] RFID tag cannot be empty.${NC}"
        return 1
    fi

    echo -e "${BLUE}📡 Transmitting RFID Tag:${NC} ${GREEN}${tag}${NC} -> ${SERVER_URL}/api/livestock/scan"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${SERVER_URL}/api/livestock/scan" \
        -H "Content-Type: application/json" \
        -d "{
            \"rfidTag\": \"$tag\",
            \"checkpointLocation\": \"$checkpoint\",
            \"operatorId\": \"$operator\",
            \"source\": \"TERMUX_CLI_SCANNER\"
        }" --connect-timeout 4)

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✔ [SUCCESS 200] Tag Ingested:${NC} $body"
        # Termux vibration / bell alert if available
        if command -v termux-vibrate &> /dev/null; then
            termux-vibrate -d 50
        else
            echo -e "\a"
        fi
    else
        echo -e "${YELLOW}⚠ [OFFLINE BUFFERING] Server unreachable (Code: $http_code). Storing locally...${NC}"
        echo "{\"rfidTag\":\"$tag\",\"checkpointLocation\":\"$checkpoint\",\"timestamp\":\"$(date -Iseconds)\"}" >> "$OFFLINE_QUEUE_FILE"
        echo -e "${CYAN}Saved to offline queue. Total queued: $(wc -l < "$OFFLINE_QUEUE_FILE")${NC}"
    fi
}

# Function to flush offline queue to server
flush_offline_queue() {
    if [ ! -f "$OFFLINE_QUEUE_FILE" ] || [ ! -s "$OFFLINE_QUEUE_FILE" ]; then
        echo -e "${GREEN}✔ Offline queue is empty. No records pending sync.${NC}"
        return 0
    fi

    local pending_count=$(wc -l < "$OFFLINE_QUEUE_FILE")
    echo -e "${CYAN}🔄 Flushing ${pending_count} pending scans to ${SERVER_URL}/api/livestock/bulk-scan...${NC}"

    # Build JSON array
    json_scans=$(awk 'BEGIN{print "["} {if(NR>1)print ","; print $0} END{print "]"}' "$OFFLINE_QUEUE_FILE")
    payload="{\"source\":\"TERMUX_BATCH_FLUSH\",\"scans\":$json_scans}"

    response=$(curl -s -w "\n%{http_code}" -X POST "${SERVER_URL}/api/livestock/bulk-scan" \
        -H "Content-Type: application/json" \
        -d "$payload" --connect-timeout 8)

    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✔ [SYNC COMPLETE] All $pending_count scans synchronized successfully!${NC}"
        rm -f "$OFFLINE_QUEUE_FILE"
    else
        echo -e "${RED}✖ [SYNC FAILED] Server rejected batch (Code: $http_code). Queue retained.${NC}"
    fi
}

# Function to run continuous interactive RFID gun reader
interactive_gun_mode() {
    print_banner
    echo -e "${CYAN}🔫 INTERACTIVE RFID GUN MODE ACTIVATED${NC}"
    echo -e "Scan barcode / RFID tags or type them below. Press Ctrl+C or type 'exit' to quit."
    echo -e "Commands: 'sync' (flush queue), 'status' (view counts)"
    echo "----------------------------------------------------------------"

    while true; do
        read -p "Scan RFID Tag > " scanned_tag
        if [ "$scanned_tag" = "exit" ] || [ "$scanned_tag" = "q" ]; then
            echo "Exiting..."
            break
        elif [ "$scanned_tag" = "sync" ]; then
            flush_offline_queue
        elif [ "$scanned_tag" = "status" ]; then
            queued=0
            [ -f "$OFFLINE_QUEUE_FILE" ] && queued=$(wc -l < "$OFFLINE_QUEUE_FILE")
            echo -e "Offline Queue: ${YELLOW}${queued} pending records${NC}"
        elif [ -n "$scanned_tag" ]; then
            scan_single_tag "$scanned_tag"
        fi
        echo ""
    done
}

# Command dispatching
case "$1" in
    --scan|-s)
        scan_single_tag "$2" "$3" "$4"
        ;;
    --sync)
        flush_offline_queue
        ;;
    --gun|-g|"")
        interactive_gun_mode
        ;;
    *)
        echo "Usage:"
        echo "  $0                 # Launch interactive RFID gun terminal"
        echo "  $0 --scan <TAG>    # Ingest a single RFID tag immediately"
        echo "  $0 --sync          # Flush offline stored queue to server"
        ;;
esac
