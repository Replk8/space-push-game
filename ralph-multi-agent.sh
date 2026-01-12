#!/bin/bash
# Ralph Multi-Agent Loop with Multi-Model Validation
# Builder: Claude | Reviewer: Gemini | Validator: GPT-4

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PRD_FILE="$PROJECT_DIR/prd.json"
PROGRESS_FILE="$PROJECT_DIR/progress.txt"
AGENTS_FILE="$PROJECT_DIR/agents.md"
ENV_FILE="$PROJECT_DIR/.env"

# Load environment variables properly for Windows/Git Bash
if [[ -f "$ENV_FILE" ]]; then
    while IFS='=' read -r key value || [[ -n "$key" ]]; do
        [[ -z "$key" || "$key" =~ ^# ]] && continue
        key=$(echo "$key" | tr -d '\r\n')
        value=$(echo "$value" | tr -d '\r\n')
        export "$key=$value"
    done < "$ENV_FILE"
fi

# Verify API keys
if [[ -z "${GEMINI_API_KEY:-}" ]]; then
    echo "Error: GEMINI_API_KEY not set in .env"
    exit 1
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    echo "Error: OPENAI_API_KEY not set in .env"
    exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   SPACE PUSH - Ralph Multi-Agent Builder${NC}"
echo -e "${BLUE}   Builder: Claude | Reviewer: Gemini | Validator: GPT-4${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "API Keys loaded successfully."
echo ""

# Check if prd.json exists
if [[ ! -f "$PRD_FILE" ]]; then
    echo -e "${RED}Error: prd.json not found!${NC}"
    exit 1
fi

# Initialize files if needed
if [[ ! -f "$PROGRESS_FILE" ]]; then
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
fi

if [[ ! -f "$AGENTS_FILE" ]]; then
    echo "# Agents Memory" > "$AGENTS_FILE"
    echo "" >> "$AGENTS_FILE"
fi

# Function to call Gemini API (using temp file and stdin to avoid arg length limits)
call_gemini() {
    local prompt="$1"
    local tmp_file=$(mktemp)
    
    # Build JSON payload using stdin pipe to avoid arg length limits
    echo "$prompt" | jq -Rs '{"contents": [{"parts": [{"text": .}]}]}' > "$tmp_file"
    
    local response
    response=$(curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=$GEMINI_API_KEY" \
        -H "Content-Type: application/json" \
        -d @"$tmp_file")
    
    rm -f "$tmp_file"
    
    echo "$response" | jq -r '.candidates[0].content.parts[0].text // "ERROR: No response"' || echo "ERROR: Failed to parse response"
}

# Function to call OpenAI API (using temp file and stdin to avoid arg length limits)
call_openai() {
    local prompt="$1"
    local tmp_file=$(mktemp)
    
    # Build JSON payload using stdin pipe to avoid arg length limits
    echo "$prompt" | jq -Rs '{"model": "chatgpt-4o-latest", "messages": [{"role": "user", "content": .}], "max_tokens": 2000}' > "$tmp_file"
    
    local response
    response=$(curl -s -X POST "https://api.openai.com/v1/chat/completions" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        -d @"$tmp_file")
    
    rm -f "$tmp_file"
    
    echo "$response" | jq -r '.choices[0].message.content // "ERROR: No response"' || echo "ERROR: Failed to parse response"
}

# Function to gather source files
gather_source_files() {
    local result=""
    
    if [[ -f "$PROJECT_DIR/package.json" ]]; then
        result+="=== package.json ===\n"
        result+=$(head -50 "$PROJECT_DIR/package.json")
        result+="\n\n"
    fi
    
    if [[ -d "$PROJECT_DIR/src/server" ]]; then
        for f in "$PROJECT_DIR/src/server"/*.js; do
            if [[ -f "$f" ]]; then
                result+="=== $(basename "$f") ===\n"
                result+=$(head -300 "$f")
                result+="\n\n"
            fi
        done
    fi
    
    if [[ -d "$PROJECT_DIR/src/client" ]]; then
        # Find all .jsx and .js files recursively in src/client
        while IFS= read -r -d '' f; do
            if [[ -f "$f" ]]; then
                local relpath="${f#$PROJECT_DIR/src/client/}"
                result+="=== $relpath ===\n"
                result+=$(head -300 "$f")
                result+="\n\n"
            fi
        done < <(find "$PROJECT_DIR/src/client" -type f \( -name "*.jsx" -o -name "*.js" \) -print0)
    fi
    
    if [[ -z "$result" ]]; then
        result="No source files found yet."
    fi
    
    echo -e "$result"
}

ITERATION=0
MAX_ITERATIONS=${1:-50}
LAST_FEEDBACK=""
LAST_STORY_ID=0
STORY_FAILURES=0
FAILURE_HISTORY=""
MAX_FAILURES_BEFORE_DIAGNOSTIC=4

while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
    ITERATION=$((ITERATION + 1))
    
    echo -e "${YELLOW}─────────────────────────────────────────────────────────────${NC}"
    echo -e "${YELLOW}   ITERATION $ITERATION of $MAX_ITERATIONS${NC}"
    echo -e "${YELLOW}─────────────────────────────────────────────────────────────${NC}"
    
    # Find next incomplete story
    NEXT_STORY=$(jq -r '.stories[] | select(.passes == false) | @json' "$PRD_FILE" | head -1)
    
    if [[ -z "$NEXT_STORY" || "$NEXT_STORY" == "null" ]]; then
        echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}   ALL STORIES COMPLETE! SPACE PUSH IS READY!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
        exit 0
    fi
    
    STORY_ID=$(echo "$NEXT_STORY" | jq -r '.id')
    STORY_TITLE=$(echo "$NEXT_STORY" | jq -r '.title')
    STORY_CRITERIA=$(echo "$NEXT_STORY" | jq -r '.criteria | join("; ")')
    
    # Reset failure tracking if we moved to a new story
    if [[ "$LAST_STORY_ID" != "$STORY_ID" ]]; then
        STORY_FAILURES=0
        FAILURE_HISTORY=""
    fi
    
    echo -e "${CYAN}Story #$STORY_ID: $STORY_TITLE${NC}"
    echo -e "Criteria: $STORY_CRITERIA"
    if [[ $STORY_FAILURES -gt 0 ]]; then
        echo -e "${YELLOW}(Attempt $((STORY_FAILURES + 1)) for this story)${NC}"
    fi
    echo ""
    
    # PHASE 1: BUILDER (Claude)
    echo -e "${BLUE}[BUILDER - Claude]${NC} Implementing story..."
    
    # Build feedback section if this is a retry of the same story
    FEEDBACK_SECTION=""
    if [[ -n "$LAST_FEEDBACK" && "$LAST_STORY_ID" == "$STORY_ID" ]]; then
        FEEDBACK_SECTION="
## ⚠️ PREVIOUS REVIEW FEEDBACK (MUST ADDRESS):
$LAST_FEEDBACK

You MUST fix the issues described above. Read the feedback carefully and make the necessary changes.
"
    fi
    
    BUILDER_PROMPT="You are a senior full-stack game developer building SPACE PUSH - a 3D multiplayer browser game.

## Story #$STORY_ID: $STORY_TITLE

## Acceptance Criteria (ALL must be satisfied):
$STORY_CRITERIA
$FEEDBACK_SECTION
## Instructions:
1. Read agents.md for architectural context and patterns
2. Read PRD.md for full requirements
3. Create/update files in src/ folder
4. Follow the tech stack: Node.js, Express, Socket.io, React, Three.js, Cannon-es
5. Ensure ALL acceptance criteria are met
6. Update agents.md with any learnings

## Project Structure:
- src/server/ - Node.js server code
- src/client/ - React frontend code
- public/ - Static assets

When done, summarize what you created/changed."
    
    cd "$PROJECT_DIR"
    claude -p "$BUILDER_PROMPT" --max-turns 50 --dangerously-skip-permissions || true
    
    echo -e "${GREEN}[BUILDER]${NC} Implementation complete."
    echo ""
    
    # PHASE 2: REVIEWER (Gemini)
    echo -e "${MAGENTA}[REVIEWER - Gemini]${NC} Reviewing implementation..."
    
    SOURCE_FILES=$(gather_source_files)
    
    REVIEWER_PROMPT="You are a senior code reviewer for a 3D multiplayer game project.

Story: $STORY_TITLE
Criteria: $STORY_CRITERIA

Source Files (truncated):
$SOURCE_FILES

Review for:
1. All acceptance criteria are met
2. Code is syntactically correct
3. Proper imports/exports
4. Game logic is sound

Respond with EXACTLY one of:
- APPROVED: [brief reason] - if implementation is correct
- NEEDS_WORK: [specific issues to fix] - if there are problems"

    REVIEWER_RESPONSE=$(call_gemini "$REVIEWER_PROMPT")
    
    echo -e "${MAGENTA}[REVIEWER]${NC} $REVIEWER_RESPONSE"
    echo ""
    
    if [[ ! "$REVIEWER_RESPONSE" =~ ^APPROVED ]]; then
        echo -e "${YELLOW}[REVIEWER]${NC} Requested changes."
        
        # Track failure
        STORY_FAILURES=$((STORY_FAILURES + 1))
        FAILURE_HISTORY+="\n--- Attempt $STORY_FAILURES (Gemini Review) ---\n$REVIEWER_RESPONSE\n"
        LAST_FEEDBACK="[Gemini Review] $REVIEWER_RESPONSE"
        LAST_STORY_ID=$STORY_ID
        
        echo "---" >> "$PROGRESS_FILE"
        echo "Iteration $ITERATION - Story #$STORY_ID - REVIEW FAILED (Attempt $STORY_FAILURES)" >> "$PROGRESS_FILE"
        echo "Reviewer feedback: $REVIEWER_RESPONSE" >> "$PROGRESS_FILE"
        echo "" >> "$PROGRESS_FILE"
        
        # Check if we need diagnostic intervention
        if [[ $STORY_FAILURES -ge $MAX_FAILURES_BEFORE_DIAGNOSTIC ]]; then
            echo ""
            echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
            echo -e "${RED}   DIAGNOSTIC MODE - $STORY_FAILURES failures on Story #$STORY_ID${NC}"
            echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
            echo ""
            echo -e "${BLUE}[DIAGNOSTIC - Claude]${NC} Analyzing root cause of repeated failures..."
            
            DIAGNOSTIC_PROMPT="You are a senior developer debugging a build system issue.

## Story #$STORY_ID: $STORY_TITLE

## Acceptance Criteria:
$STORY_CRITERIA

## PROBLEM: This story has FAILED $STORY_FAILURES times in a row.

## Failure History:
$FAILURE_HISTORY

## Current Source Files:
$SOURCE_FILES

## Your Task:
1. Analyze WHY this keeps failing - look for patterns in the feedback
2. Identify the ROOT CAUSE (not just symptoms)
3. FIX the underlying issue in the code
4. Make sure ALL acceptance criteria will pass after your fix

Be thorough. Read all the failure feedback carefully. Fix everything that's been flagged."
            
            cd "$PROJECT_DIR"
            claude -p "$DIAGNOSTIC_PROMPT" --max-turns 50 --dangerously-skip-permissions || true
            
            echo -e "${GREEN}[DIAGNOSTIC]${NC} Root cause analysis complete. Resetting failure counter."
            echo "" >> "$PROGRESS_FILE"
            echo "---" >> "$PROGRESS_FILE"
            echo "## DIAGNOSTIC INTERVENTION for Story #$STORY_ID after $STORY_FAILURES failures" >> "$PROGRESS_FILE"
            echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$PROGRESS_FILE"
            echo "" >> "$PROGRESS_FILE"
            
            # Reset failure tracking but keep the story ID
            STORY_FAILURES=0
            FAILURE_HISTORY=""
            LAST_FEEDBACK=""
            echo ""
        else
            echo -e "${YELLOW}[REVIEWER]${NC} Returning to Builder..."
        fi
        
        continue
    fi
    
    # PHASE 3: VALIDATOR (GPT-4)
    echo -e "${CYAN}[VALIDATOR - GPT-4]${NC} Validating acceptance criteria..."
    
    VALIDATOR_PROMPT="You are a QA validator for a 3D multiplayer game.

Story: $STORY_TITLE

Acceptance Criteria (ALL must be TRUE):
$STORY_CRITERIA

Source Files:
$SOURCE_FILES

Check each criterion carefully. Respond with EXACTLY one of:
- VALIDATED: All criteria met - if EVERY criterion is satisfied
- FAILED: [which criteria failed and why] - if ANY criterion is not met"

    VALIDATOR_RESPONSE=$(call_openai "$VALIDATOR_PROMPT")
    
    echo -e "${CYAN}[VALIDATOR]${NC} $VALIDATOR_RESPONSE"
    echo ""
    
    if [[ ! "$VALIDATOR_RESPONSE" =~ ^VALIDATED ]]; then
        echo -e "${YELLOW}[VALIDATOR]${NC} Criteria not met."
        
        # Track failure
        STORY_FAILURES=$((STORY_FAILURES + 1))
        FAILURE_HISTORY+="\n--- Attempt $STORY_FAILURES (GPT-4 Validation) ---\n$VALIDATOR_RESPONSE\n"
        LAST_FEEDBACK="[GPT-4 Validation] $VALIDATOR_RESPONSE"
        LAST_STORY_ID=$STORY_ID
        
        echo "---" >> "$PROGRESS_FILE"
        echo "Iteration $ITERATION - Story #$STORY_ID - VALIDATION FAILED (Attempt $STORY_FAILURES)" >> "$PROGRESS_FILE"
        echo "Validator feedback: $VALIDATOR_RESPONSE" >> "$PROGRESS_FILE"
        echo "" >> "$PROGRESS_FILE"
        
        # Check if we need diagnostic intervention
        if [[ $STORY_FAILURES -ge $MAX_FAILURES_BEFORE_DIAGNOSTIC ]]; then
            echo ""
            echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
            echo -e "${RED}   DIAGNOSTIC MODE - $STORY_FAILURES failures on Story #$STORY_ID${NC}"
            echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
            echo ""
            echo -e "${BLUE}[DIAGNOSTIC - Claude]${NC} Analyzing root cause of repeated failures..."
            
            DIAGNOSTIC_PROMPT="You are a senior developer debugging a build system issue.

## Story #$STORY_ID: $STORY_TITLE

## Acceptance Criteria:
$STORY_CRITERIA

## PROBLEM: This story has FAILED $STORY_FAILURES times in a row.

## Failure History:
$FAILURE_HISTORY

## Current Source Files:
$SOURCE_FILES

## Your Task:
1. Analyze WHY this keeps failing - look for patterns in the feedback
2. Identify the ROOT CAUSE (not just symptoms)
3. FIX the underlying issue in the code
4. Make sure ALL acceptance criteria will pass after your fix

Be thorough. Read all the failure feedback carefully. Fix everything that's been flagged."
            
            cd "$PROJECT_DIR"
            claude -p "$DIAGNOSTIC_PROMPT" --max-turns 50 --dangerously-skip-permissions || true
            
            echo -e "${GREEN}[DIAGNOSTIC]${NC} Root cause analysis complete. Resetting failure counter."
            echo "" >> "$PROGRESS_FILE"
            echo "---" >> "$PROGRESS_FILE"
            echo "## DIAGNOSTIC INTERVENTION for Story #$STORY_ID after $STORY_FAILURES failures" >> "$PROGRESS_FILE"
            echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$PROGRESS_FILE"
            echo "" >> "$PROGRESS_FILE"
            
            # Reset failure tracking but keep the story ID
            STORY_FAILURES=0
            FAILURE_HISTORY=""
            LAST_FEEDBACK=""
            echo ""
        else
            echo -e "${YELLOW}[VALIDATOR]${NC} Returning to Builder..."
        fi
        
        continue
    fi
    
    # PHASE 4: MARK COMPLETE
    echo -e "${GREEN}[SUCCESS]${NC} Story #$STORY_ID passed all validations!"
    
    jq "(.stories[] | select(.id == $STORY_ID)) .passes = true" "$PRD_FILE" > "$PRD_FILE.tmp"
    mv "$PRD_FILE.tmp" "$PRD_FILE"
    
    echo "---" >> "$PROGRESS_FILE"
    echo "## Iteration $ITERATION - Story #$STORY_ID COMPLETE" >> "$PROGRESS_FILE"
    echo "Completed: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$PROGRESS_FILE"
    echo "Title: $STORY_TITLE" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
    
    # Clear feedback on success
    LAST_FEEDBACK=""
    LAST_STORY_ID=0
    STORY_FAILURES=0
    FAILURE_HISTORY=""
    
    echo ""
    sleep 2
done

echo -e "${RED}Max iterations reached. Check prd.json for remaining stories.${NC}"
exit 1
