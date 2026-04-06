'use client';

import { useRef, useEffect, useCallback } from 'react';
import { XIcon, Play, Square } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { FocusScope } from 'radix-ui/internal';
import { cn } from '@/lib/utils';
import { ActionButton } from '@/components/common/action-button';
import { DeploymentStatusBadge } from '@/components/common/deployment-status-badge';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerOverlay,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { useDeployAction, type DeployActionInput } from '@/hooks/use-deploy-action';
import { useFeatureFlags } from '@/hooks/feature-flags-context';

const drawerVariants = cva('', {
  variants: {
    size: {
      sm: 'w-96',
      md: 'w-2xl',
      lg: 'w-[772px]',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

export interface BaseDrawerProps extends VariantProps<typeof drawerVariants> {
  open: boolean;
  onClose: () => void;
  modal?: boolean;
  /** When true, clicking anywhere outside the drawer closes it, ignoring `data-no-drawer-close` guards. */
  dismissOnOutsideClick?: boolean;
  title?: string;
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
  deployTarget?: DeployActionInput;
}

export function BaseDrawer({
  open,
  onClose,
  modal = false,
  dismissOnOutsideClick = false,
  title = 'Drawer',
  size,
  header,
  children,
  footer,
  className,
  'data-testid': testId,
  deployTarget,
}: BaseDrawerProps) {
  const { i18n } = useTranslation();
  const featureFlags = useFeatureFlags();
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const drawerDirection = i18n.dir() === 'rtl' ? 'left' : 'right';

  // Capture the element that had focus right before FocusScope steals it.
  // onMountAutoFocus fires synchronously before the first focusable child receives focus,
  // so document.activeElement still points at the trigger element at this point.
  const handleMountAutoFocus = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
  }, []);

  // Restore focus to the trigger element when the FocusScope unmounts (drawer closes).
  const handleUnmountAutoFocus = useCallback((event: Event) => {
    if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
      event.preventDefault();
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, []);

  // Dismiss non-modal drawer on Escape key.
  // Modal drawers already get Escape handling from Radix Dialog.
  useEffect(() => {
    if (!open || modal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, modal, onClose]);

  // Close when clicking outside the drawer panel (no overlay needed — canvas stays draggable).
  //
  // Uses `click` (not `pointerdown`) as the trigger so canvas drags don't close the drawer,
  // but tracks the `pointerdown` target separately. When the user presses the mouse on an
  // in-drawer control that opens a portaled popover (Radix Select, DropdownMenu, Popover),
  // Radix calls preventDefault on pointerdown and opens its portal over the trigger. By
  // the time pointerup fires, the cursor is over the portal overlay, and Chrome computes
  // the `click` event's target as the common ancestor of pointerdown/pointerup — which is
  // `<body>` because the portal is detached from the drawer subtree. Without tracking the
  // pointerdown origin we would misread this as an outside click and close the drawer.
  useEffect(() => {
    if (!open || modal) return;

    // When dismissOnOutsideClick is false (default), also respect data-no-drawer-close guards.
    const ignoreSelector = dismissOnOutsideClick
      ? '[role="alertdialog"], [role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]'
      : '[data-no-drawer-close], [role="alertdialog"], [role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]';

    /** True when `el` is inside the drawer or an explicitly-ignored overlay. */
    const isInsideOrIgnored = (el: Element | null | undefined): boolean => {
      if (!el) return false;
      if (contentRef.current?.contains(el)) return true;
      if (el.closest(ignoreSelector)) return true;
      return false;
    };

    // Track the most recent pointerdown target so the click handler can check
    // where the gesture ORIGINATED, not just where it landed.
    let pointerDownOrigin: Element | null = null;
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownOrigin = e.target as Element | null;
    };

    const handleClick = (e: MouseEvent) => {
      const origin = pointerDownOrigin;
      // Clear for the next gesture regardless of outcome.
      pointerDownOrigin = null;

      const target = e.target as Element;
      // If the clicked element was unmounted by React before the event reached
      // the document (e.g. a "Next" button removed on the last step), it is no
      // longer in the DOM tree — treat it as an internal click, not an outside one.
      if (!document.body.contains(target)) return;
      // Click landed inside the drawer or a protected overlay.
      if (isInsideOrIgnored(target)) return;
      // Click landed outside, but the gesture ORIGINATED inside the drawer or a
      // protected overlay (e.g. a Radix Select trigger whose portal stole the
      // pointerup target). This is not a real outside click — bail out.
      if (isInsideOrIgnored(origin)) return;
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('click', handleClick);
    };
  }, [open, modal, onClose, dismissOnOutsideClick]);

  return (
    <Drawer
      direction={drawerDirection}
      modal={modal}
      handleOnly
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      {modal ? <DrawerOverlay /> : null}
      <DrawerContent
        ref={contentRef}
        direction={drawerDirection}
        showCloseButton={false}
        className={cn(
          drawerVariants({ size }),
          // Editorial glass treatment: semi-transparent with backdrop blur in BOTH modes
          // for polished depth. Light mode uses white/80, dark mode uses card surface/85.
          'bg-white/80 backdrop-blur-xl dark:bg-[#1e293bd9]',
          className
        )}
        data-testid={testId}
        onInteractOutside={modal ? undefined : (e) => e.preventDefault()}
        {...(!modal ? { 'aria-modal': true } : {})}
      >
        {/* Visually hidden title & description required by Radix Dialog for accessibility */}
        <DrawerTitle asChild>
          <span className="sr-only">{title}</span>
        </DrawerTitle>
        <DrawerDescription asChild>
          <span className="sr-only">{title}</span>
        </DrawerDescription>

        {/*
         * Focus management for non-modal drawers (WCAG 2.4.3 Focus Order, 2.1.2 No Keyboard Trap).
         * Modal drawers get focus trapping from Radix Dialog automatically.
         * For non-modal drawers, FocusScope traps keyboard focus inside the drawer and
         * returns focus to the trigger element on close via onUnmountAutoFocus.
         */}
        <FocusScope.Root
          trapped={!modal}
          loop={!modal}
          asChild
          onMountAutoFocus={handleMountAutoFocus}
          onUnmountAutoFocus={handleUnmountAutoFocus}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Close button */}
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="ring-offset-background focus:ring-ring absolute end-3 top-2 z-50 rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
              data-testid={testId ? `${testId}-close-button` : undefined}
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </button>

            {/* Header slot */}
            {header ? <DrawerHeader className="shrink-0">{header}</DrawerHeader> : null}

            {/* Separator between header and content — matches review drawer style */}
            {header ? <Separator /> : null}

            {/* Dev server bar — rendered when deployTarget is provided and env deploy is enabled */}
            {featureFlags.envDeploy && deployTarget ? (
              <DeployBar deployTarget={deployTarget} />
            ) : null}

            {/* Scrollable content area. Consumers should add p-4 for consistent spacing. */}
            {/* Footer components like DrawerActionBar typically include border-t. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>

            {/* Footer slot */}
            {footer ? <DrawerFooter className="shrink-0">{footer}</DrawerFooter> : null}
          </div>
        </FocusScope.Root>
      </DrawerContent>
    </Drawer>
  );
}

function DeployBar({ deployTarget }: { deployTarget: DeployActionInput }) {
  const deployAction = useDeployAction(deployTarget);
  const isDeploymentActive = deployAction.status === 'Booting' || deployAction.status === 'Ready';

  return (
    <div data-testid="base-drawer-deploy-bar" className="flex items-center gap-2 px-4 pt-3 pb-3">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <ActionButton
                label={isDeploymentActive ? 'Stop Dev Server' : 'Start Dev Server'}
                onClick={isDeploymentActive ? deployAction.stop : deployAction.deploy}
                loading={deployAction.deployLoading || deployAction.stopLoading}
                error={!!deployAction.deployError}
                icon={isDeploymentActive ? Square : Play}
                iconOnly
                variant="outline"
                size="icon-sm"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {isDeploymentActive ? 'Stop Dev Server' : 'Start Dev Server'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {isDeploymentActive ? (
        <DeploymentStatusBadge
          status={deployAction.status}
          url={deployAction.url}
          targetId={deployTarget.targetId}
        />
      ) : null}
    </div>
  );
}
