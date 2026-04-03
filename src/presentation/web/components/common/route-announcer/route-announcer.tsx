'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Announces route changes to screen readers via an aria-live region.
 * Placed in the root layout so it catches all navigation events.
 */
export function RouteAnnouncer(): React.JSX.Element {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Use document.title if available, otherwise describe the path
    const title = document.title || pathname;
    setAnnouncement(`Navigated to ${title}`);
  }, [pathname]);

  return (
    <div aria-live="polite" aria-atomic="true" role="status" className="sr-only">
      {announcement}
    </div>
  );
}
