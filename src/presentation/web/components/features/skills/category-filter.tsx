import { cn } from '@/lib/utils';
import type { SkillCategory } from '@/lib/skills';

const CATEGORIES: { label: string; value: SkillCategory | null }[] = [
  { label: 'All', value: null },
  { label: 'Workflow', value: 'Workflow' },
  { label: 'Code Generation', value: 'Code Generation' },
  { label: 'Analysis', value: 'Analysis' },
  { label: 'Reference', value: 'Reference' },
];

export interface CategoryFilterProps {
  activeCategory: SkillCategory | null;
  onCategoryChange: (category: SkillCategory | null) => void;
  counts?: Record<SkillCategory, number>;
}

/*
 * Category filter — editorial tab treatment matching the Tools page.
 * Uses bg-card container with editorial-shadow, active pill with bg-muted +
 * text-primary + ring lift, inactive pills with muted text and hover affordance.
 */
export function CategoryFilter({ activeCategory, onCategoryChange, counts }: CategoryFilterProps) {
  return (
    <div
      className="bg-card editorial-shadow inline-flex flex-wrap items-center gap-1 rounded-lg p-1"
      role="group"
      aria-label="Filter by category"
    >
      {CATEGORIES.map(({ label, value }) => {
        const isActive = activeCategory === value;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onCategoryChange(value)}
            className={cn(
              'cursor-pointer rounded-md px-3 py-1.5 text-xs font-bold transition-all',
              isActive
                ? 'bg-muted text-primary shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
            {counts != null && value != null ? (
              <span className="ms-1 opacity-70">({counts[value]})</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
