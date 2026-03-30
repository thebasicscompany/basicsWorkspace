#!/usr/bin/env bash
# E2E test: create workflow → add blocks → connect → run → verify logs
set -e

BASE="http://localhost:3000"
PASS=0
FAIL=0

ok()   { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

# ─── Auth ────────────────────────────────────────────────────────────────────
echo "=== Authenticating ==="
AUTH=$(curl -s -D /tmp/e2e-headers.txt --max-time 10 -X POST "$BASE/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}')

COOKIE=$(grep -i "set-cookie.*session_token" /tmp/e2e-headers.txt | sed 's/.*session_token=/better-auth.session_token=/' | sed 's/;.*//')
if [ -z "$COOKIE" ]; then
  echo "FATAL: Could not authenticate"
  exit 1
fi
ok "Authenticated"

C="-b $COOKIE"

# ─── Test 1: Create workflow ────────────────────────────────────────────────
echo ""
echo "=== Test 1: Create workflow ==="
WF=$(curl -s $C --max-time 10 -X POST "$BASE/api/workflows" \
  -H "Content-Type: application/json" \
  -d '{"name":"E2E Function Test"}')
WF_ID=$(echo "$WF" | python -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
if [ -n "$WF_ID" ]; then ok "Created workflow $WF_ID"; else fail "Create workflow"; echo "$WF"; fi

# ─── Test 2: Add blocks (Start + Function) + edge ──────────────────────────
echo ""
echo "=== Test 2: Save blocks + edges ==="
SAVE=$(curl -s $C --max-time 10 -X PATCH "$BASE/api/workflows/$WF_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "blocks": [
      {
        "id": "start-1",
        "type": "start_trigger",
        "name": "Start",
        "positionX": "100",
        "positionY": "100",
        "enabled": true,
        "subBlocks": {
          "startValue": {"id": "startValue", "type": "short-input", "value": "Hello from E2E test"}
        }
      },
      {
        "id": "func-1",
        "type": "function",
        "name": "Uppercase",
        "positionX": "400",
        "positionY": "100",
        "enabled": true,
        "subBlocks": {
          "code": {"id": "code", "type": "code", "value": "return { result: \"PROCESSED: \" + JSON.stringify(input) }"},
          "language": {"id": "language", "type": "dropdown", "value": "javascript"},
          "timeout": {"id": "timeout", "type": "short-input", "value": "10000"}
        }
      }
    ],
    "edges": [
      {
        "id": "edge-1",
        "sourceBlockId": "start-1",
        "targetBlockId": "func-1",
        "sourceHandle": "source",
        "targetHandle": "target"
      }
    ]
  }')
echo "$SAVE" | python -c "import sys,json; d=json.load(sys.stdin); print('  Updated:', d.get('name','?'))" 2>/dev/null && ok "Saved blocks + edges" || fail "Save blocks"

# ─── Test 3: Verify blocks persisted ────────────────────────────────────────
echo ""
echo "=== Test 3: Verify persistence ==="
DETAIL=$(curl -s $C --max-time 10 "$BASE/api/workflows/$WF_ID")
BLOCK_COUNT=$(echo "$DETAIL" | python -c "import sys,json; print(len(json.load(sys.stdin).get('blocks',[])))" 2>/dev/null)
EDGE_COUNT=$(echo "$DETAIL" | python -c "import sys,json; print(len(json.load(sys.stdin).get('edges',[])))" 2>/dev/null)
if [ "$BLOCK_COUNT" = "2" ]; then ok "2 blocks persisted"; else fail "Expected 2 blocks, got $BLOCK_COUNT"; fi
if [ "$EDGE_COUNT" = "1" ]; then ok "1 edge persisted"; else fail "Expected 1 edge, got $EDGE_COUNT"; fi

# ─── Test 4: Run workflow ──────────────────────────────────────────────────
echo ""
echo "=== Test 4: Execute workflow ==="
RUN=$(curl -s $C --max-time 30 -X POST "$BASE/api/workflows/$WF_ID/run" \
  -H "Content-Type: application/json" -H "Accept: text/event-stream" \
  -d '{}')
echo "  Raw SSE (first 500 chars):"
echo "  ${RUN:0:500}"

# Check for completion event
if echo "$RUN" | grep -q '"type":"complete"'; then
  ok "Execution completed"
elif echo "$RUN" | grep -q '"type":"error"'; then
  fail "Execution errored"
  echo "$RUN" | grep '"type":"error"'
else
  fail "No completion event found"
fi

# Check for block:complete events
BLOCK_EVENTS=$(echo "$RUN" | grep -c '"type":"block:complete"' || true)
echo "  Block complete events: $BLOCK_EVENTS"
if [ "$BLOCK_EVENTS" -ge 1 ]; then ok "Block(s) executed"; else fail "No block:complete events"; fi

# ─── Test 5: Check execution logs in DB ────────────────────────────────────
echo ""
echo "=== Test 5: Execution logs ==="
LOGS=$(curl -s $C --max-time 10 "$BASE/api/workflows/$WF_ID/logs")
LOG_COUNT=$(echo "$LOGS" | python -c "import sys,json; print(len(json.load(sys.stdin).get('logs',[])))" 2>/dev/null)
if [ "$LOG_COUNT" -ge 1 ]; then
  ok "Execution logged ($LOG_COUNT entries)"
  echo "$LOGS" | python -c "
import sys,json
logs = json.load(sys.stdin)['logs']
for l in logs[:3]:
  print(f\"  [{l['status']}] trigger={l.get('trigger','?')} dur={l.get('totalDurationMs','?')}ms\")
" 2>/dev/null
else
  fail "No execution logs found"
fi

# ─── Test 6: Deploy workflow ────────────────────────────────────────────────
echo ""
echo "=== Test 6: Deploy ==="
DEPLOY=$(curl -s $C --max-time 15 -X POST "$BASE/api/workflows/$WF_ID/deploy")
IS_DEPLOYED=$(echo "$DEPLOY" | python -c "import sys,json; print(json.load(sys.stdin).get('isDeployed',False))" 2>/dev/null)
if [ "$IS_DEPLOYED" = "True" ]; then ok "Deployed successfully"; else fail "Deploy failed: $DEPLOY"; fi

# ─── Test 7: Check change detection ────────────────────────────────────────
echo ""
echo "=== Test 7: Change detection ==="
STATUS=$(curl -s $C --max-time 10 "$BASE/api/workflows/$WF_ID/deploy")
NEEDS=$(echo "$STATUS" | python -c "import sys,json; print(json.load(sys.stdin).get('needsRedeployment',None))" 2>/dev/null)
if [ "$NEEDS" = "False" ]; then ok "No changes detected (correct)"; else fail "needsRedeployment=$NEEDS"; fi

# Modify and check again
curl -s $C --max-time 10 -X PATCH "$BASE/api/workflows/$WF_ID" \
  -H "Content-Type: application/json" \
  -d '{"blocks":[{"id":"start-1","type":"start_trigger","name":"Start Modified","positionX":"100","positionY":"100","enabled":true,"subBlocks":{}},{"id":"func-1","type":"function","name":"Uppercase","positionX":"400","positionY":"100","enabled":true,"subBlocks":{"code":{"id":"code","type":"code","value":"return { result: \"CHANGED\" }"}}}],"edges":[{"id":"edge-1","sourceBlockId":"start-1","targetBlockId":"func-1"}]}' > /dev/null

STATUS2=$(curl -s $C --max-time 10 "$BASE/api/workflows/$WF_ID/deploy")
NEEDS2=$(echo "$STATUS2" | python -c "import sys,json; print(json.load(sys.stdin).get('needsRedeployment',None))" 2>/dev/null)
if [ "$NEEDS2" = "True" ]; then ok "Change detected after edit"; else fail "needsRedeployment=$NEEDS2 (expected True)"; fi

# ─── Test 8: Org-wide execution logs ───────────────────────────────────────
echo ""
echo "=== Test 8: Org-wide logs dashboard API ==="
ALL_LOGS=$(curl -s $C --max-time 10 "$BASE/api/executions")
TOTAL=$(echo "$ALL_LOGS" | python -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null)
if [ "$TOTAL" -ge 1 ]; then ok "Org-wide logs: $TOTAL total"; else fail "No org-wide logs"; fi

# ─── Test 9: Undeploy ──────────────────────────────────────────────────────
echo ""
echo "=== Test 9: Undeploy ==="
UNDEPLOY=$(curl -s $C --max-time 10 -X DELETE "$BASE/api/workflows/$WF_ID/deploy")
IS_UNDEPLOYED=$(echo "$UNDEPLOY" | python -c "import sys,json; print(json.load(sys.stdin).get('isDeployed',True))" 2>/dev/null)
if [ "$IS_UNDEPLOYED" = "False" ]; then ok "Undeployed"; else fail "Undeploy failed"; fi

# ─── Test 10: Cleanup ──────────────────────────────────────────────────────
echo ""
echo "=== Test 10: Delete workflow ==="
DEL=$(curl -s $C --max-time 10 -X DELETE "$BASE/api/workflows/$WF_ID" -w "%{http_code}")
if echo "$DEL" | grep -q "200\|204"; then ok "Deleted test workflow"; else fail "Delete: $DEL"; fi

# ─── Summary ────────────────────────────────────────────────────────────────
echo ""
echo "================================"
echo "  PASSED: $PASS"
echo "  FAILED: $FAIL"
echo "================================"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
