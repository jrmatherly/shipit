import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SkillData } from '@/lib/skills';
import { FolderOpen } from 'lucide-react';

export interface SkillCardProps {
  skill: SkillData;
  onSelect: (skill: SkillData) => void;
}

export function SkillCard({ skill, onSelect }: SkillCardProps) {
  return (
    <Card
      className="cursor-pointer p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300 dark:hover:ring-slate-600"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(skill)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(skill);
        }
      }}
      data-testid={`skill-card-${skill.name}`}
    >
      {/* Title + monospace name — matches ToolCard's tight editorial header */}
      <h3 className="text-foreground text-sm leading-tight font-bold tracking-tight">
        {skill.displayName}
      </h3>
      <p className="text-muted-foreground mt-1 font-mono text-xs">{skill.name}</p>

      {/* Description */}
      <p className="text-muted-foreground mt-3 line-clamp-2 text-xs leading-relaxed">
        {skill.description}
      </p>

      {/* Badges — bottom of card */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge variant={skill.source === 'project' ? 'secondary' : 'outline'}>
          {skill.source === 'project' ? 'Project' : 'Global'}
        </Badge>
        {skill.context ? <Badge variant="outline">{skill.context}</Badge> : null}
        {skill.allowedTools ? <Badge variant="outline">Tools</Badge> : null}
        {skill.resources.length > 0 ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <FolderOpen className="size-3" />
            {skill.resources.length} {skill.resources.length === 1 ? 'resource' : 'resources'}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
