'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { LucideIcon } from 'lucide-react';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { useSoundAction } from '@/hooks/use-sound-action';

export interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
}

/*
 * Sidebar nav item with Stitch editorial active state.
 * Active state styling is applied via attribute selectors on the
 * data-active attribute that SidebarMenuButton writes when isActive=true.
 * Using an attribute selector avoids a hydration mismatch: the `active`
 * prop flows from usePathname() which can return different values during
 * SSR vs the first client render, so any conditional className based on
 * it would not match between server and client. data-active is written
 * once after hydration by the shadcn primitive, so CSS targeting it is
 * stable across both trees.
 *
 * The editorial active styling (text-primary, ring, subtle shadow,
 * font-semibold) is declared in globals.css under the
 * [data-sidebar=menu-button][data-active=true] selector.
 */
export function SidebarNavItem({ icon: Icon, label, href, active = false }: SidebarNavItemProps) {
  const navigateSound = useSoundAction('navigate');

  return (
    <SidebarMenuItem data-testid="sidebar-nav-item">
      <SidebarMenuButton asChild isActive={active} tooltip={label}>
        <Link href={href as Route} onClick={() => navigateSound.play()}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
