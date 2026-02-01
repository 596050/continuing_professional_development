# CLAUDE.md

This file provides guidance to Claude Code when working with this project.

## Project Overview

This is the **continuing_professional_development** project.

## Ralph - Autonomous Development Loop (Project-Local Install)

Ralph is installed locally in `.ralph-tools/` (not globally). It enables autonomous AI development loops using Claude Code with intelligent exit detection, rate limiting, and session continuity.

### Running Ralph (Local, No Global Install)

All Ralph scripts are invoked directly from `.ralph-tools/`. There are no global `ralph` commands available.

#### Enable Ralph in This Project

```bash
# Interactive wizard (sets up .ralph/ dir and .ralphrc config)
./.ralph-tools/ralph_enable.sh

# Or with a specific task source
./.ralph-tools/ralph_enable.sh --from prd ./path/to/requirements.md

# Non-interactive (for automation)
./.ralph-tools/ralph_enable_ci.sh
```

#### Run the Autonomous Loop

```bash
# Start the Ralph loop with integrated monitoring (recommended)
./.ralph-tools/ralph_loop.sh --monitor

# Start without monitoring
./.ralph-tools/ralph_loop.sh

# With custom parameters
./.ralph-tools/ralph_loop.sh --monitor --calls 50 --timeout 30

# Check status
./.ralph-tools/ralph_loop.sh --status
```

#### Monitor

```bash
# Live monitoring dashboard (separate terminal)
./.ralph-tools/ralph_monitor.sh
```

#### Import a PRD / Requirements Doc

```bash
./.ralph-tools/ralph_import.sh requirements.md my-project
```

### Ralph Project Files

After enabling Ralph, the project will contain:

| Path | Purpose |
|------|---------|
| `.ralph/PROMPT.md` | Main development instructions for Ralph |
| `.ralph/fix_plan.md` | Prioritized task list Ralph follows |
| `.ralph/AGENT.md` | Build and run instructions |
| `.ralph/specs/` | Detailed specifications and requirements |
| `.ralph/logs/` | Execution logs |
| `.ralphrc` | Project-level configuration (rate limits, tools, timeouts) |

### Key Configuration (.ralphrc)

```bash
PROJECT_NAME="continuing_professional_development"
MAX_CALLS_PER_HOUR=100
CLAUDE_TIMEOUT_MINUTES=15
CLAUDE_OUTPUT_FORMAT="json"
ALLOWED_TOOLS="Write,Read,Edit,Bash(git *),Bash(npm *),Bash(pytest)"
SESSION_CONTINUITY=true
SESSION_EXPIRY_HOURS=24
```

### Ralph CLI Options

```
./.ralph-tools/ralph_loop.sh [OPTIONS]
  -h, --help              Show help
  -c, --calls NUM         Max calls per hour (default: 100)
  -p, --prompt FILE       Custom prompt file
  -s, --status            Show current status and exit
  -m, --monitor           Start with tmux monitoring
  -v, --verbose           Detailed progress output
  -t, --timeout MIN       Execution timeout in minutes (1-120, default: 15)
  --output-format FORMAT  json (default) or text
  --allowed-tools TOOLS   Restrict allowed Claude tools
  --no-continue           Disable session continuity
  --reset-circuit         Reset the circuit breaker
  --reset-session         Reset session state
```

### How Ralph Works

1. Reads `.ralph/PROMPT.md` for project instructions
2. Executes Claude Code with current context and task priorities
3. Tracks progress and updates task lists
4. Evaluates completion via dual-condition exit gate (completion indicators + EXIT_SIGNAL)
5. Repeats until all tasks complete or limits reached

### System Requirements

- Bash 4.0+
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)
- tmux (for `--monitor` mode)
- jq (JSON processing)
- GNU coreutils (macOS: `brew install coreutils`)

## Testing Requirements (MANDATORY)

**Run all E2E tests after every feature implementation or code change:**

```bash
cd webapp && npx vitest run
```

- The test suite (`src/__tests__/business-features.test.ts`) contains 211 tests covering all business logic
- Tests run against the dev database (`dev.db`) and require a dev server on port 3000
- To start the dev server: `cd webapp && npm run dev`
- All 211 tests MUST pass before any feature is considered complete
- The `npm run build` command runs tests automatically before compilation - a build will fail if tests fail
- State-setting helpers in `src/__tests__/helpers/state.ts` create test users (use `@e2e.local` email pattern)
- If you add a new feature, add corresponding tests to the test suite before marking it done

**Test categories covered:**
1. Credential database (14 credentials, rules, regions, verticals)
2. User signup API (creation, validation, duplicates, password rules)
3. Authentication gates (all protected endpoints return 401)
4. Onboarding (data creation, credential linking)
5. CPD activity logging (types, categories, validation)
6. Dashboard aggregation (total/ethics/structured hours)
7. Gap analysis (progress %, remaining hours, deadlines)
8. Evidence management (CRUD, metadata, linking)
9. Reminders (CRUD, validation, filtering)
10. PDF generation (compliance brief, audit report, CSV)
11. Multi-credential support
12. Data integrity (foreign keys, JSON validity)
13. Page availability
14. Edge cases (zero hours, null deadlines, empty states)
15. Credential-specific business rules
16. Certificate generation (creation, codes, verification, revocation)
17. Certificate PDF (generation, QR code, firm branding)
18. Quiz engine (creation, grading, pass/fail, retries)
19. Completion rules (rule evaluation, multi-rule AND, auto-cert)
20. Certificate vault (list, search, export CSV)
21. Activity CRUD (creation, listing, filtering, publish workflow, soft-delete)
22. Credit mapping (multi-jurisdiction resolution, exclusions, INTL matching)
23. Provider reporting (aggregation, role gates, date filtering)
24. Activity auth gates (all new endpoints require authentication)
25. User journey scenarios (full signup-to-audit multi-step flows)
26. Role-based access control (admin, firm_admin, user role boundaries)
27. Quiz lifecycle (retry limits, exhaustion, auto-certificate on pass)
28. Deadline and urgency (approaching, past, and on-time deadline states)
29. Multi-credential credit resolution (cross-region credit views)
30. Completion workflow (rules + evaluation + auto-certificate generation)
31. Data isolation (users cannot access each other's data)
32. API input validation (boundary testing for all POST endpoints)

## Content Rules

### No Em-Dashes

Do not use em-dashes (---, or the Unicode character U+2014 "\u2014") anywhere in this project: not in code, copy, comments, markdown, commit messages, or any generated content. Use hyphens (-), en-dashes where strictly needed for number ranges, or rewrite the sentence to avoid dashes entirely. This applies to all files, all formats, all contexts.
