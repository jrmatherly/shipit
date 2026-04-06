'use client';

import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BaseDrawer } from '@/components/common/base-drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FolderOpen } from 'lucide-react';
import type { SkillData } from '@/lib/skills';

/*
 * Markdown component overrides for skill body rendering.
 * Styled to match the editorial palette and fit within the drawer's
 * constrained width. Uses the same pattern as tech-decisions-review.
 */
const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-foreground mt-6 mb-3 text-lg font-bold tracking-tight first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-foreground mt-5 mb-2 text-base font-bold tracking-tight">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="text-foreground mt-4 mb-2 text-sm font-bold">{children}</h3>,
  p: ({ children }) => (
    <p className="text-muted-foreground mb-3 text-sm leading-relaxed last:mb-0">{children}</p>
  ),
  strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children, className }) =>
    className ? (
      <code className={`${className} text-xs`}>{children}</code>
    ) : (
      <code className="bg-muted text-foreground rounded-md px-1.5 py-0.5 font-mono text-xs">
        {children}
      </code>
    ),
  pre: ({ children }) => (
    <pre className="bg-muted my-3 overflow-x-auto rounded-lg border p-3 text-xs">{children}</pre>
  ),
  ul: ({ children }) => (
    <ul className="text-muted-foreground mb-3 list-disc space-y-1 ps-5 text-sm">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="text-muted-foreground mb-3 list-decimal space-y-1 ps-5 text-sm">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  hr: () => <Separator className="my-4" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:text-primary/80 underline underline-offset-2"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-primary/30 text-muted-foreground my-3 border-l-2 pl-4 italic">
      {children}
    </blockquote>
  ),
};

export interface SkillDetailDrawerProps {
  skill: SkillData | null;
  onClose: () => void;
}

export function SkillDetailDrawer({ skill, onClose }: SkillDetailDrawerProps) {
  return (
    <BaseDrawer
      open={skill !== null}
      onClose={onClose}
      size="sm"
      modal
      data-testid="skill-detail-drawer"
      header={
        skill ? (
          <>
            <DrawerTitle>{skill.displayName}</DrawerTitle>
            <DrawerDescription>{skill.name}</DrawerDescription>
          </>
        ) : undefined
      }
    >
      {skill ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {/* Description */}
          <p className="text-muted-foreground text-sm">{skill.description}</p>

          {/* Badges with explanatory tooltips */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={skill.source === 'project' ? 'secondary' : 'outline'}
                  className="cursor-default"
                >
                  {skill.source === 'project' ? 'Project' : 'Global'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {skill.source === 'project'
                  ? 'Installed in this project\u2019s .claude/skills/ directory'
                  : 'Installed globally in your user profile'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="cursor-default">
                  {skill.category}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Skill category \u2014 used for filtering on the Skills page
              </TooltipContent>
            </Tooltip>
            {skill.context ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-default">
                    {skill.context}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Context restriction \u2014 this skill only activates in this context
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>

          {/* Allowed Tools */}
          {skill.allowedTools ? (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="text-sm font-semibold">Allowed Tools</h3>
                <p className="text-muted-foreground mt-1 text-sm">{skill.allowedTools}</p>
              </div>
            </>
          ) : null}

          {/* Resources */}
          {skill.resources.length > 0 ? (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="text-sm font-semibold">Resources</h3>
                <ul className="mt-2 space-y-1.5">
                  {skill.resources.map((resource) => (
                    <li
                      key={resource.name}
                      className="text-muted-foreground flex items-center gap-2 text-sm"
                    >
                      <FolderOpen className="size-3.5 shrink-0" />
                      <span>
                        {resource.name}/ — {resource.fileCount}{' '}
                        {resource.fileCount === 1 ? 'file' : 'files'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}

          {/* Body — rendered as markdown for proper heading/list/code formatting */}
          {skill.body ? (
            <>
              <Separator className="my-4" />
              <div className="prose-sm">
                <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {skill.body}
                </Markdown>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </BaseDrawer>
  );
}
