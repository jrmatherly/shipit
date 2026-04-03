/**
 * Shipit AI TUI Theme
 *
 * Custom theme for @inquirer/prompts that matches the Shipit AI CLI design system.
 * Uses picocolors for consistent styling with the rest of the CLI.
 */

import pc from 'picocolors';

/**
 * Shipit AI-branded theme for @inquirer/prompts.
 *
 * Customizes the prefix icon to use the Shipit AI brand color (cyan)
 * and provides consistent styling across all TUI prompts.
 */
export const shipitAiTheme = {
  prefix: {
    idle: pc.cyan('?'),
    done: pc.green('\u2714'),
  },
  style: {
    highlight: pc.cyan,
    answer: pc.cyan,
  },
} as const;
