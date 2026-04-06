import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SkillDetailDrawer } from '@/components/features/skills/skill-detail-drawer';
import type { SkillData } from '@/lib/skills';

function makeSkill(overrides: Partial<SkillData> = {}): SkillData {
  return {
    name: 'shipit-kit:implement',
    displayName: 'implement',
    description: 'Validate specs and autonomously execute implementation tasks',
    category: 'Workflow',
    source: 'project',
    body: 'Full body content here.',
    resources: [],
    ...overrides,
  };
}

describe('SkillDetailDrawer', () => {
  it('renders skill display name as sheet title when open', () => {
    render(
      <TooltipProvider>
        <SkillDetailDrawer skill={makeSkill()} onClose={vi.fn()} />
      </TooltipProvider>
    );
    expect(screen.getByText('implement')).toBeInTheDocument();
  });

  it('renders full skill name as sheet description', () => {
    render(
      <TooltipProvider>
        <SkillDetailDrawer skill={makeSkill()} onClose={vi.fn()} />
      </TooltipProvider>
    );
    expect(screen.getByText('shipit-kit:implement')).toBeInTheDocument();
  });

  it('renders skill description', () => {
    render(
      <TooltipProvider>
        <SkillDetailDrawer skill={makeSkill()} onClose={vi.fn()} />
      </TooltipProvider>
    );
    expect(
      screen.getByText('Validate specs and autonomously execute implementation tasks')
    ).toBeInTheDocument();
  });

  it('renders source badge for project skills', () => {
    render(
      <TooltipProvider>
        <SkillDetailDrawer skill={makeSkill({ source: 'project' })} onClose={vi.fn()} />
      </TooltipProvider>
    );
    expect(screen.getByText('Project')).toBeInTheDocument();
  });

  it('renders source badge for global skills', () => {
    render(
      <TooltipProvider>
        <SkillDetailDrawer skill={makeSkill({ source: 'global' })} onClose={vi.fn()} />
      </TooltipProvider>
    );
    expect(screen.getByText('Global')).toBeInTheDocument();
  });

  it('renders context badge when context is provided', () => {
    render(
      <TooltipProvider>
        <SkillDetailDrawer skill={makeSkill({ context: 'fork' })} onClose={vi.fn()} />
      </TooltipProvider>
    );
    expect(screen.getByText('fork')).toBeInTheDocument();
  });

  it('does not render context badge when context is undefined', () => {
    render(
      <TooltipProvider>
        <SkillDetailDrawer skill={makeSkill({ context: undefined })} onClose={vi.fn()} />
      </TooltipProvider>
    );
    expect(screen.queryByText('fork')).not.toBeInTheDocument();
  });

  it('renders allowed-tools badge when allowedTools is provided', () => {
    render(
      <TooltipProvider>
        <SkillDetailDrawer
          skill={makeSkill({ allowedTools: 'Read, Write, Bash' })}
          onClose={vi.fn()}
        />
      </TooltipProvider>
    );
    expect(screen.getByText('Read, Write, Bash')).toBeInTheDocument();
  });

  it('does not render allowed-tools section when allowedTools is undefined', () => {
    render(
      <TooltipProvider>
        <SkillDetailDrawer skill={makeSkill({ allowedTools: undefined })} onClose={vi.fn()} />
      </TooltipProvider>
    );
    expect(screen.queryByText('Allowed Tools')).not.toBeInTheDocument();
  });

  it('renders resource list with file counts', () => {
    const skill = makeSkill({
      resources: [
        { name: 'references', fileCount: 7 },
        { name: 'templates', fileCount: 3 },
      ],
    });
    render(
      <TooltipProvider>
        <SkillDetailDrawer skill={skill} onClose={vi.fn()} />
      </TooltipProvider>
    );

    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText(/references\//)).toBeInTheDocument();
    expect(screen.getByText(/7 files/)).toBeInTheDocument();
    expect(screen.getByText(/templates\//)).toBeInTheDocument();
    expect(screen.getByText(/3 files/)).toBeInTheDocument();
  });

  it('renders singular "file" for single file count', () => {
    const skill = makeSkill({
      resources: [{ name: 'scripts', fileCount: 1 }],
    });
    render(
      <TooltipProvider>
        <SkillDetailDrawer skill={skill} onClose={vi.fn()} />
      </TooltipProvider>
    );
    expect(screen.getByText(/1 file$/)).toBeInTheDocument();
  });

  it('hides resource section when resources array is empty', () => {
    render(
      <TooltipProvider>
        <SkillDetailDrawer skill={makeSkill({ resources: [] })} onClose={vi.fn()} />
      </TooltipProvider>
    );
    expect(screen.queryByText('Resources')).not.toBeInTheDocument();
  });

  it('renders skill body text via markdown', () => {
    render(
      <TooltipProvider>
        <SkillDetailDrawer
          skill={makeSkill({ body: 'Line one\n  Line two\n    Line three' })}
          onClose={vi.fn()}
        />
      </TooltipProvider>
    );
    const bodyElement = screen.getByText(/Line one/);
    expect(bodyElement).toBeInTheDocument();
    expect(bodyElement.tagName).toBe('P');
  });

  it('renders nothing when skill is null', () => {
    const { container } = render(
      <TooltipProvider>
        <SkillDetailDrawer skill={null} onClose={vi.fn()} />
      </TooltipProvider>
    );
    expect(container.querySelector('[data-slot="sheet-content"]')).not.toBeInTheDocument();
  });

  it('calls onClose when sheet is dismissed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <TooltipProvider>
        <SkillDetailDrawer skill={makeSkill()} onClose={onClose} />
      </TooltipProvider>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders category badge', () => {
    render(
      <TooltipProvider>
        <SkillDetailDrawer skill={makeSkill({ category: 'Workflow' })} onClose={vi.fn()} />
      </TooltipProvider>
    );
    expect(screen.getByText('Workflow')).toBeInTheDocument();
  });
});
