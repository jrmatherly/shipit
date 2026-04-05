/**
 * @module ShipitAI.Common.Enums.AgentPermissions
 *
 * Per-agent permission mode enums for the Shipit AI platform.
 * Each enum maps to the upstream CLI flags of its respective agent,
 * controlling how much autonomy the agent has during execution.
 */
import "./agent-config.tsp";

@doc("Claude Code native permission modes")
enum ClaudeCodePermissionMode {
  @doc("Prompt for everything except reads. Interactive only.")
  Default: "default",

  @doc("Auto-approve file edits; prompt for shell/network. Interactive only.")
  AcceptEdits: "acceptEdits",

  @doc("Read-only; proposes a plan without acting. Interactive only.")
  Plan: "plan",

  @doc("Full bypass — skip all permission checks. Current default for batch.")
  BypassPermissions: "bypassPermissions",
}

@doc("Cursor agent permission modes")
enum CursorPermissionMode {
  @doc("Read-only propose mode: outputs a diff without writing.")
  Propose: "propose",

  @doc("Full auto: --yolo --force. Writes and executes. Current default.")
  Yolo: "yolo",
}

@doc("Gemini CLI approval modes")
enum GeminiPermissionMode {
  @doc("Prompt for every tool call. Interactive only.")
  Default: "default",

  @doc("Auto-approve edit tools; prompt for others. Interactive only.")
  AutoEdit: "auto_edit",

  @doc("Auto-approve all tool calls. Current default for batch.")
  Yolo: "yolo",
}

@doc("Codex CLI sandbox modes")
enum CodexPermissionMode {
  @doc("--sandbox read-only. Cannot modify anything.")
  ReadOnly: "read-only",

  @doc("--sandbox workspace-write. Writes inside worktree, no network.")
  WorkspaceWrite: "workspace-write",

  @doc("--sandbox danger-full-access. Unrestricted. Current default.")
  DangerFullAccess: "danger-full-access",
}

@doc("GitHub Copilot CLI permission modes")
enum CopilotPermissionMode {
  @doc("No flags — built-in tool category defaults. Interactive only.")
  Prompt: "prompt",

  @doc("--allow-all-paths. Filesystem auto-approved; shell still prompts. Interactive only.")
  AllowPaths: "allow-paths",

  @doc("--yolo. Skip all permission prompts. Current default for batch.")
  Yolo: "yolo",
}

@doc("Rovo Dev CLI permission modes")
enum RovoDevPermissionMode {
  @doc("No flag — respects ~/.rovodev/config.yml. Interactive only.")
  Config: "config",

  @doc("--shadow: temporary workspace clone. Experimental.")
  Shadow: "shadow",

  @doc("--yolo: bypass all prompts. Current default for batch.")
  Yolo: "yolo",
}
