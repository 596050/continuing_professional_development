# CODEX.md

Instructions for Codex when working with this project.

## Project Overview

This is the **continuing_professional_development** project.

## Ralph - Autonomous Development Loop (Project-Local Install)

Ralph is installed locally in `.ralph-tools/` (not globally). It provides autonomous AI development loops with intelligent exit detection, rate limiting, circuit breakers, and session continuity. Ralph is designed for Claude Code but its project structure and task management patterns apply to any agent workflow.

### Running Ralph (Local, No Global Install)

All Ralph scripts live in `.ralph-tools/` and are run directly by path. No global commands are installed.

#### Enable Ralph in This Project

```bash
# Interactive wizard - creates .ralph/ directory and .ralphrc config
./.ralph-tools/ralph_enable.sh

# Non-interactive (for automation/CI)
./.ralph-tools/ralph_enable_ci.sh

# With a specific task source
./.ralph-tools/ralph_enable.sh --from prd ./path/to/requirements.md
./.ralph-tools/ralph_enable.sh --from github --label "sprint-1"
```

#### Run the Autonomous Loop

```bash
# With integrated tmux monitoring (recommended)
./.ralph-tools/ralph_loop.sh --monitor

# Without monitoring
./.ralph-tools/ralph_loop.sh

# Custom parameters
./.ralph-tools/ralph_loop.sh --monitor --calls 50 --timeout 30 --verbose

# Check current loop status
./.ralph-tools/ralph_loop.sh --status
```

#### Monitor Dashboard

```bash
./.ralph-tools/ralph_monitor.sh
```

#### Import Requirements

```bash
./.ralph-tools/ralph_import.sh requirements.md my-project
```

### Ralph Project Structure

After enabling, these files are created in the project:

```
.ralph/                  # Ralph config and state
  PROMPT.md              # Main development instructions
  fix_plan.md            # Prioritized task list
  AGENT.md               # Build/run instructions
  specs/                 # Detailed specifications
  logs/                  # Execution logs
.ralphrc                 # Project configuration
```

### Configuration (.ralphrc)

```bash
PROJECT_NAME="continuing_professional_development"
MAX_CALLS_PER_HOUR=100
CLAUDE_TIMEOUT_MINUTES=15
CLAUDE_OUTPUT_FORMAT="json"
ALLOWED_TOOLS="Write,Read,Edit,Bash(git *),Bash(npm *),Bash(pytest)"
SESSION_CONTINUITY=true
SESSION_EXPIRY_HOURS=24
```

### CLI Reference

```
./.ralph-tools/ralph_loop.sh [OPTIONS]
  -c, --calls NUM         Max API calls per hour (default: 100)
  -p, --prompt FILE       Custom prompt file
  -s, --status            Show status and exit
  -m, --monitor           Start with tmux session
  -v, --verbose           Detailed progress output
  -t, --timeout MIN       Execution timeout (1-120 min, default: 15)
  --output-format FORMAT  json or text
  --allowed-tools TOOLS   Tool permission list
  --no-continue           Disable session continuity
  --reset-circuit         Reset circuit breaker
  --reset-session         Reset session state
```

### System Requirements

- Bash 4.0+
- Claude Code CLI
- tmux (for --monitor)
- jq
- GNU coreutils (macOS: `brew install coreutils`)

## Testing Requirements (MANDATORY)

**Run all E2E tests after every feature implementation or code change:**

```bash
cd webapp && npx vitest run
```

- The test suite (`src/__tests__/business-features.test.ts`) contains 167 tests covering all business logic
- Tests run against the dev database (`dev.db`) and require a dev server on port 3000
- To start the dev server: `cd webapp && npm run dev`
- All 167 tests MUST pass before any feature is considered complete
- The `npm run build` command runs tests automatically before compilation - a build will fail if tests fail
- State-setting helpers in `src/__tests__/helpers/state.ts` create test users (use `@e2e.local` email pattern)
- If you add a new feature, add corresponding tests to the test suite before marking it done

## Content Rules

### No Em-Dashes

Do not use em-dashes (---, or the Unicode character U+2014 "\u2014") anywhere in this project: not in code, copy, comments, markdown, commit messages, or any generated content. Use hyphens (-), en-dashes where strictly needed for number ranges, or rewrite the sentence to avoid dashes entirely. This applies to all files, all formats, all contexts.
