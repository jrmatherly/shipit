/**
 * PR Branding
 *
 * Centralizes the branding footer used in pull request bodies
 * created by ShipIT AI. Ensures consistent attribution across all
 * PR creation paths (agent-driven, fork-and-PR, etc.).
 */

/** The branding line to append to PR bodies. */
export const PR_BRANDING =
  'Built with ShipIT AI \uD83D\uDC11 [ShipIT AI Bot](https://github.com/jrmatherly/shipit)';

/**
 * Pattern matching common AI-tool attribution footers that should be
 * replaced (e.g. "Generated with Claude Code", "Co-Authored-By: Claude").
 */
const UNWANTED_BRANDING_PATTERN =
  /\n*(?:🤖\s*)?Generated with \[Claude Code\]\(https:\/\/claude\.com\/claude-code\)\s*/gi;

/**
 * Ensure a PR body carries the correct ShipIT AI branding.
 *
 * 1. Strips any unwanted AI-tool attribution footers
 * 2. Appends the ShipIT AI branding line if not already present
 */
export function applyPrBranding(body: string): string {
  // Strip unwanted branding
  let cleaned = body.replace(UNWANTED_BRANDING_PATTERN, '');

  // Trim trailing whitespace/newlines before appending branding
  cleaned = cleaned.trimEnd();

  // Only append if not already present
  if (!cleaned.includes(PR_BRANDING)) {
    cleaned = `${cleaned}\n\n${PR_BRANDING}`;
  }

  return cleaned;
}
