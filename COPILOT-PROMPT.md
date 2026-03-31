# Agent Copilot — Build Prompt

Use this as your prompt in a new Claude Code chat to build the agent copilot for the automations canvas.

---

## What to build

An AI chat panel inside the automations canvas that lets users describe workflows in natural language and have the agent build them on the canvas. This is the core product differentiator — "hit record, describe your workflow, the agent builds the automation."

Read `STRATEGIC-DIRECTIONS.md` for the full product vision. Read `CLAUDE.md` for all codebase conventions.

## What exists already

- **Full block registry:** 250+ blocks in `lib/sim/blocks/blocks/` — each has a `BlockConfig` with inputs, outputs, sub-blocks, and tool definitions. The agent picks from these.
- **Workflow stores:** `apps/automations/stores/workflows/` — has `addBlock`, `addEdge`, `updateSubBlock`, `removeBlock` actions the agent can call programmatically.
- **Canvas:** `apps/automations/components/workflow-canvas.tsx` — ReactFlow canvas with toolbar, block editor panel, execution log panel.
- **Block editor panel:** `apps/automations/components/block-editor-panel.tsx` — right-side panel that renders sub-block inputs when a block is selected.
- **Notification store:** `apps/automations/stores/notifications.ts` — toast notifications.
- **Wand prompt bar stub:** `apps/automations/components/wand-prompt-bar.tsx` — non-functional stub, can be replaced.

## How Sim does it

Sim has a full copilot implementation. **Read these files from the Sim repo** (`C:\Users\aravb\Desktop\Code\basics\basicsOS\sim\apps\sim\`):

### Core components
- `app/workspace/[workspaceId]/workflows/[workflowId]/components/chat/chat.tsx` — floating chat panel UI
- `app/workspace/[workspaceId]/workflows/[workflowId]/components/panel/components/copilot/copilot.tsx` — side panel copilot variant
- `stores/copilot/store.ts` — copilot state management (messages, sessions, streaming)
- `stores/chat/store.ts` — chat message store

### How the agent modifies the canvas
The copilot doesn't call an external AI API directly from the client. It sends messages to a backend endpoint that:
1. Reads the current workflow state (blocks, edges, sub-block values)
2. Reads the block registry to know what blocks are available
3. Calls an LLM with a system prompt that includes the workflow context + available blocks
4. The LLM returns structured tool calls (add_block, connect_blocks, set_value, etc.)
5. The backend streams these back to the client
6. The client applies them to the workflow store

Look at Sim's copilot API route and the tool definitions it gives the LLM.

### Diff controls
- `app/workspace/[workspaceId]/workflows/[workflowId]/components/diff-controls/diff-controls.tsx` — accept/reject UI for AI-proposed changes
- The copilot proposes changes as a diff, user can accept or reject before they're applied

## Architecture recommendation

### Phase 1: Text-based workflow builder (start here)
1. **Chat panel component** — collapsible right-side panel (alongside block editor)
2. **Copilot API route** (`app/api/copilot/route.ts`) that:
   - Receives user message + current workflow state
   - Builds a system prompt with available blocks from the registry
   - Calls the gateway LLM (use `GATEWAY_URL` + model `basics-chat-smart-openai`)
   - Streams back structured actions (add block, connect, set sub-block value)
3. **Client-side action applier** — takes the LLM's structured output and calls workflow store actions
4. **Message history** — persist in a zustand store, show in the chat panel

### Phase 2: Enhancements
- Diff controls (preview changes before applying)
- Context-aware suggestions ("I see you have a Slack block — want to add error handling?")
- Block registry search (agent can search blocks by capability)
- Sub-block value filling via Q&A ("Which Slack channel?" → agent fills in the channel dropdown)

## Key files to read before starting
- `CLAUDE.md` — all conventions
- `apps/automations/stores/workflows/store.ts` — workflow store actions
- `apps/automations/stores/workflow-types.ts` — BlockState, SubBlockState types
- `lib/sim/blocks/types.ts` — BlockConfig type (what the agent picks from)
- `lib/sim/blocks/blocks/index.ts` — block registry exports
- `apps/automations/components/workflow-canvas.tsx` — where the panel will live
- `lib/core/config/env.ts` — gateway URL config

## Design tokens
Use our design system (see `CLAUDE.md` design tokens section). The chat panel should feel native to the warm cream aesthetic — not a generic chatbot widget.

## Do NOT
- Build a standalone chat page — this lives IN the canvas
- Call OpenAI/Anthropic directly — route through the gateway
- Rewrite the workflow store — use existing actions
- Add collaboration/socket features — single user for now
