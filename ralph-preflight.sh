#!/bin/bash
# Ralph Pre-flight Check
# Tests all components before running the main loop

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$PROJECT_DIR/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Ralph Pre-flight Check${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

# ═══════════════════════════════════════════════════════════
# CHECK 1: Environment file exists
# ═══════════════════════════════════════════════════════════
echo -e "${BLUE}[1/6] Checking .env file...${NC}"
if [[ -f "$ENV_FILE" ]]; then
    pass ".env file exists"
    
    # Load env vars
    while IFS='=' read -r key value || [[ -n "$key" ]]; do
        [[ -z "$key" || "$key" =~ ^# ]] && continue
        key=$(echo "$key" | tr -d '\r\n')
        value=$(echo "$value" | tr -d '\r\n')
        export "$key=$value"
    done < "$ENV_FILE"
else
    fail ".env file not found"
fi
echo ""

# ═══════════════════════════════════════════════════════════
# CHECK 2: API keys present
# ═══════════════════════════════════════════════════════════
echo -e "${BLUE}[2/6] Checking API keys...${NC}"
if [[ -n "${GEMINI_API_KEY:-}" ]]; then
    pass "GEMINI_API_KEY is set"
else
    fail "GEMINI_API_KEY not set in .env"
fi

if [[ -n "${OPENAI_API_KEY:-}" ]]; then
    pass "OPENAI_API_KEY is set"
else
    fail "OPENAI_API_KEY not set in .env"
fi
echo ""

# ═══════════════════════════════════════════════════════════
# CHECK 3: Gemini API works
# ═══════════════════════════════════════════════════════════
echo -e "${BLUE}[3/6] Testing Gemini API (gemini-2.5-pro)...${NC}"
if [[ -n "${GEMINI_API_KEY:-}" ]]; then
    GEMINI_RESPONSE=$(curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=$GEMINI_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"contents":[{"parts":[{"text":"Reply with exactly: PREFLIGHT_OK"}]}]}' 2>/dev/null || echo "CURL_FAILED")
    
    if echo "$GEMINI_RESPONSE" | grep -q "PREFLIGHT_OK"; then
        pass "Gemini API responded correctly"
    elif echo "$GEMINI_RESPONSE" | grep -q "error"; then
        ERROR_MSG=$(echo "$GEMINI_RESPONSE" | jq -r '.error.message // "Unknown error"' 2>/dev/null || echo "Parse failed")
        fail "Gemini API error: $ERROR_MSG"
    elif echo "$GEMINI_RESPONSE" | grep -q "candidates"; then
        pass "Gemini API responded (different wording)"
    else
        fail "Gemini API unexpected response"
        echo "  Response: ${GEMINI_RESPONSE:0:200}"
    fi
else
    fail "Skipped - no API key"
fi
echo ""

# ═══════════════════════════════════════════════════════════
# CHECK 4: OpenAI API works
# ═══════════════════════════════════════════════════════════
echo -e "${BLUE}[4/6] Testing OpenAI API (chatgpt-4o-latest)...${NC}"
if [[ -n "${OPENAI_API_KEY:-}" ]]; then
    OPENAI_RESPONSE=$(curl -s -X POST "https://api.openai.com/v1/chat/completions" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        -d '{"model":"chatgpt-4o-latest","messages":[{"role":"user","content":"Reply with exactly: PREFLIGHT_OK"}],"max_tokens":20}' 2>/dev/null || echo "CURL_FAILED")
    
    if echo "$OPENAI_RESPONSE" | grep -q "PREFLIGHT_OK"; then
        pass "OpenAI API responded correctly"
    elif echo "$OPENAI_RESPONSE" | grep -q "error"; then
        ERROR_MSG=$(echo "$OPENAI_RESPONSE" | jq -r '.error.message // "Unknown error"' 2>/dev/null || echo "Parse failed")
        fail "OpenAI API error: $ERROR_MSG"
    elif echo "$OPENAI_RESPONSE" | grep -q "choices"; then
        pass "OpenAI API responded (different wording)"
    else
        fail "OpenAI API unexpected response"
        echo "  Response: ${OPENAI_RESPONSE:0:200}"
    fi
else
    fail "Skipped - no API key"
fi
echo ""

# ═══════════════════════════════════════════════════════════
# CHECK 5: Claude can create files
# ═══════════════════════════════════════════════════════════
echo -e "${BLUE}[5/6] Testing Claude file creation...${NC}"
TEST_FILE="$PROJECT_DIR/.preflight-test-file.txt"
rm -f "$TEST_FILE" 2>/dev/null || true

# Run Claude to create a test file
CLAUDE_OUTPUT=$(cd "$PROJECT_DIR" && claude -p "Create a file named .preflight-test-file.txt containing exactly: PREFLIGHT_OK" --max-turns 5 --dangerously-skip-permissions 2>&1 || echo "CLAUDE_FAILED")

sleep 2  # Give filesystem time to sync

if [[ -f "$TEST_FILE" ]]; then
    if grep -q "PREFLIGHT_OK" "$TEST_FILE" 2>/dev/null; then
        pass "Claude created file with correct content"
    else
        pass "Claude created file (content differs)"
    fi
    rm -f "$TEST_FILE" 2>/dev/null || true
else
    fail "Claude did not create test file"
    warn "Claude output: ${CLAUDE_OUTPUT:0:300}"
fi
echo ""

# ═══════════════════════════════════════════════════════════
# CHECK 6: Script syntax valid
# ═══════════════════════════════════════════════════════════
echo -e "${BLUE}[6/6] Checking ralph-multi-agent.sh syntax...${NC}"
SCRIPT_FILE="$PROJECT_DIR/ralph-multi-agent.sh"
if [[ -f "$SCRIPT_FILE" ]]; then
    if bash -n "$SCRIPT_FILE" 2>/dev/null; then
        pass "Script syntax is valid"
    else
        fail "Script has syntax errors"
        bash -n "$SCRIPT_FILE" 2>&1 | head -5
    fi
else
    fail "ralph-multi-agent.sh not found"
fi
echo ""

# ═══════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}   ✓ ALL CHECKS PASSED ($PASS_COUNT/$PASS_COUNT)${NC}"
    echo -e "${GREEN}   GO FOR LAUNCH! Run: ./ralph-multi-agent.cmd${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "${RED}   ✗ SOME CHECKS FAILED ($FAIL_COUNT failures, $PASS_COUNT passed)${NC}"
    echo -e "${RED}   FIX ISSUES BEFORE RUNNING RALPH${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    exit 1
fi
