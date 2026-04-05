import type { ComponentType, SVGProps } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Agent type values mirroring the TypeSpec AgentType enum (UI-visible subset). */
export type AgentTypeValue =
  | 'claude-code'
  | 'codex-cli'
  | 'copilot-cli'
  | 'cursor'
  | 'gemini-cli'
  | 'rovo-dev';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

/** Create a stable image-based icon component for a brand. */
function createBrandIcon(src: string, alt: string): ComponentType<IconProps> {
  function BrandIcon({ className }: IconProps) {
    return (
      <Image
        src={src}
        alt={alt}
        width={24}
        height={24}
        className={cn('rounded-sm object-contain', className)}
      />
    );
  }
  BrandIcon.displayName = `BrandIcon(${alt})`;
  return BrandIcon;
}

/** Fallback icon when agent type is unknown or undefined. */
export function DefaultAgentIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

const agentTypeIconMap: Record<AgentTypeValue, ComponentType<IconProps>> = {
  'claude-code': createBrandIcon('/icons/agents/claude-ai-icon.svg', 'Claude Code'),
  'codex-cli': createBrandIcon('/icons/agents/openai.svg', 'Codex CLI'),
  'copilot-cli': DefaultAgentIcon,
  cursor: createBrandIcon('/icons/agents/cursor.jpeg', 'Cursor'),
  'gemini-cli': createBrandIcon('/icons/agents/gemini-cli.jpeg', 'Gemini CLI'),
  'rovo-dev': DefaultAgentIcon,
};

/** Human-readable labels for agent types. */
export const agentTypeLabels: Record<AgentTypeValue, string> = {
  'claude-code': 'Claude Code',
  'codex-cli': 'Codex CLI',
  'copilot-cli': 'GitHub Copilot CLI',
  cursor: 'Cursor',
  'gemini-cli': 'Gemini CLI',
  'rovo-dev': 'Rovo Dev CLI',
};

/** Resolve an agent type string to its corresponding icon component. */
export function getAgentTypeIcon(agentType?: string): ComponentType<IconProps> {
  if (agentType && agentType in agentTypeIconMap) {
    return agentTypeIconMap[agentType as AgentTypeValue];
  }
  return DefaultAgentIcon;
}
