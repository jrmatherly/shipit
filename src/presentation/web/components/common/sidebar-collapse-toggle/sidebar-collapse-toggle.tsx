'use client';

import { PanelLeft } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSoundAction } from '@/hooks/use-sound-action';

export interface SidebarCollapseToggleProps {
  className?: string;
}

export function SidebarCollapseToggle({ className }: SidebarCollapseToggleProps) {
  const { toggleSidebar, open } = useSidebar();
  const expandSound = useSoundAction('expand');
  const collapseSound = useSoundAction('collapse');
  const label = open ? 'Collapse sidebar' : 'Expand sidebar';

  const handleClick = () => {
    // Play sound based on current state (before toggle)
    if (open) {
      collapseSound.play();
    } else {
      expandSound.play();
    }
    toggleSidebar();
  };

  return (
    <Button
      data-testid="sidebar-collapse-toggle"
      variant="ghost"
      size="icon"
      className={cn(
        // Generous hit area: full sidebar-menu-button size in both expanded
        // and collapsed modes so the toggle is easy to click regardless of
        // sidebar state. The icon stays centered via flex.
        'flex cursor-pointer items-center justify-center',
        'size-8 group-data-[collapsible=icon]:size-8!',
        className
      )}
      onClick={handleClick}
      aria-label={label}
    >
      <PanelLeft className="size-4" />
    </Button>
  );
}
