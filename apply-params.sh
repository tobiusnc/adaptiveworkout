#!/bin/bash
# =============================================================
# APPLY PARAMETERS TO TOOLKIT FILES
# =============================================================
# Usage: bash apply-params.sh
# Run AFTER editing toolkit-params.conf
# Run BEFORE the Claude Code installer
# Compatible with macOS (BSD sed) and Linux
# No perl required
# =============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PARAMS_FILE="$SCRIPT_DIR/toolkit-params.conf"
TARGET_DIR="$SCRIPT_DIR/toolkit"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗ FATAL:${NC} $1"; exit 1; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }

echo ""
echo "============================================="
echo " TOOLKIT PARAMETER REPLACEMENT"
echo " macOS compatible — no perl required"
echo "============================================="

# --- Step 1: Verify files exist ---
echo ""
echo "Step 1: Checking files..."
[ -f "$PARAMS_FILE" ] || fail "toolkit-params.conf not found at $PARAMS_FILE"
[ -d "$TARGET_DIR" ]  || fail "toolkit/ directory not found — generate spec files first"
pass "Found toolkit-params.conf"
file_count=$(find "$TARGET_DIR" -type f | wc -l | tr -d ' ')
pass "Found toolkit/ with $file_count files"

# --- Step 2: Load params (handles spaces in values, no quotes needed) ---
echo ""
echo "Step 2: Loading parameters..."

while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ -z "$key" ]] && continue
  [[ "$key" =~ ^[[:space:]]*# ]] && continue
  [[ "$key" =~ ^[[:space:]]*$ ]] && continue
  # Trim leading/trailing whitespace from key and value
  key="${key#"${key%%[![:space:]]*}"}"
  key="${key%"${key##*[![:space:]]}"}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  # Strip surrounding quotes if present (both " and ')
  value="${value#\"}" ; value="${value%\"}"
  value="${value#\'}" ; value="${value%\'}"
  # Export so it's available to the script
  export "$key=$value"
done < "$PARAMS_FILE"

pass "Parameters loaded"

# --- Step 3: Validate required params ---
echo ""
echo "Step 3: Validating required parameters..."
SKIP_COUNT=0

validate() {
  local key="$1" val="$2"
  if [ -z "$val" ] || [ "$val" = "[EDIT THIS]" ]; then
    warn "$key not set — will be skipped"
    ((SKIP_COUNT++))
  else
    pass "$key = $val"
  fi
}

validate "PROJECT_NAME"      "$PROJECT_NAME"
validate "PROJECT_SLUG"      "$PROJECT_SLUG"
validate "AUTHOR"            "$AUTHOR"
validate "EXPO_SLUG"         "$EXPO_SLUG"
validate "BUNDLE_ID_IOS"     "$BUNDLE_ID_IOS"
validate "BUNDLE_ID_ANDROID" "$BUNDLE_ID_ANDROID"
validate "EXPO_USERNAME"     "$EXPO_USERNAME"
validate "STATE_MGMT"        "$STATE_MGMT"
validate "LOCAL_STORAGE"     "$LOCAL_STORAGE"
validate "NOTIFICATION_MODE" "$NOTIFICATION_MODE"

if [ $SKIP_COUNT -gt 0 ]; then
  echo ""
  warn "$SKIP_COUNT parameters not set — those placeholders will remain in files"
  printf "  Continue anyway? (y/n): "
  read -r CONTINUE
  [ "$CONTINUE" = "y" ] || { echo "Aborted. Edit toolkit-params.conf and re-run."; exit 0; }
fi

# --- Step 4: Apply replacements ---
echo ""
echo "Step 4: Applying replacements to all files..."

TODAY=$(date +%Y-%m-%d)
TOTAL=0

# Detect sed flavor (BSD = macOS, GNU = Linux)
if sed --version 2>/dev/null | grep -q GNU; then
  SED_INPLACE="sed -i"
else
  SED_INPLACE="sed -i ''"
fi

replace_all() {
  local placeholder="$1"
  local value="$2"

  # Strip quotes from value (handles both quoted and unquoted conf entries)
  value="${value#\"}" ; value="${value%\"}"
  value="${value#\'}" ; value="${value%\'}"

  [ -z "$value" ] && return
  [ "$value" = "[EDIT THIS]" ] && return

  # Count files containing this placeholder
  count=$(grep -rl -F "$placeholder" "$TARGET_DIR" 2>/dev/null | wc -l | tr -d ' ')
  [ "$count" -eq 0 ] && return

  # Escape placeholder for sed (escape special regex chars)
  # Using | as delimiter to avoid issues with / in paths and values
  escaped_placeholder=$(printf '%s\n' "$placeholder" | sed 's/[[\.*^$(){}?+|]/\\&/g')
  escaped_value=$(printf '%s\n' "$value" | sed 's/[&/\\]/\\&/g')

  find "$TARGET_DIR" -type f \( \
    -name "*.md" -o \
    -name "*.json" -o \
    -name "*.sh" -o \
    -name "*.conf" -o \
    -name "*.gitignore" \
  \) | while IFS= read -r file; do
    if grep -qF "$placeholder" "$file" 2>/dev/null; then
      if [ "$SED_INPLACE" = "sed -i ''" ]; then
        sed -i '' "s|${escaped_placeholder}|${escaped_value}|g" "$file"
      else
        sed -i "s|${escaped_placeholder}|${escaped_value}|g" "$file"
      fi
    fi
  done

  pass "[$placeholder] → $value ($count files)"
  TOTAL=$((TOTAL + count))
}

replace_all "[PROJECT_NAME]"        "$PROJECT_NAME"
replace_all "[PROJECT_SLUG]"        "$PROJECT_SLUG"
replace_all "[AUTHOR]"              "$AUTHOR"
replace_all "[EXPO_SLUG]"           "$EXPO_SLUG"
replace_all "[BUNDLE_ID_IOS]"       "$BUNDLE_ID_IOS"
replace_all "[BUNDLE_ID_ANDROID]"   "$BUNDLE_ID_ANDROID"
replace_all "[EXPO_USERNAME]"       "$EXPO_USERNAME"
replace_all "[IOS_MIN_VERSION]"     "$IOS_MIN_VERSION"
replace_all "[ANDROID_MIN_SDK]"     "$ANDROID_MIN_SDK"
replace_all "[STATE_MGMT]"          "$STATE_MGMT"
replace_all "[LOCAL_STORAGE]"       "$LOCAL_STORAGE"
replace_all "[NOTIFICATION_MODE]"   "$NOTIFICATION_MODE"
replace_all "[PUSHOVER_APP_TOKEN]"  "$PUSHOVER_APP_TOKEN"
replace_all "[PUSHOVER_USER_KEY]"   "$PUSHOVER_USER_KEY"
replace_all "[GIT_BRANCH]"          "$GIT_BRANCH"
replace_all "[GIT_REMOTE]"          "$GIT_REMOTE"
replace_all "[MODEL_REASONING]"     "$MODEL_REASONING"
replace_all "[MODEL_SUMMARIZATION]" "$MODEL_SUMMARIZATION"
replace_all "[MODEL_REVIEW]"        "$MODEL_REVIEW"
replace_all "[DATE]"                "$TODAY"

# --- Step 5: Verify no [EDIT THIS] remain ---
echo ""
echo "Step 5: Checking for unfilled placeholders..."

remaining=$(find "$TARGET_DIR" -type f \( \
  -name "*.md" -o -name "*.json" -o -name "*.sh" \
  \) -exec grep -l '\[EDIT THIS\]' {} \; 2>/dev/null || true)

if [ -n "$remaining" ]; then
  warn "Files still containing [EDIT THIS]:"
  echo "$remaining" | while IFS= read -r f; do
    echo "    $(basename "$f")"
    grep -n '\[EDIT THIS\]' "$f" | sed 's/^/      /'
  done
else
  pass "No unfilled [EDIT THIS] placeholders"
fi

# --- Step 6: Summary ---
echo ""
echo "============================================="
echo " COMPLETE"
echo "============================================="
echo "  Files in toolkit:   $file_count"
echo "  Replacements made:  $TOTAL"
echo "  Params skipped:     $SKIP_COUNT"
echo ""
echo "Next steps:"
echo "  1. Spot-check a few files to confirm values look correct"
echo "  2. Run Bootstrap Part 1 installer in Claude Code"
echo "  3. Run Bootstrap Part 2 installer in Claude Code"
echo "  4. Run /first-session in your new project"
echo ""
