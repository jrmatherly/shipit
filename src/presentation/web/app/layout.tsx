import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Inter } from 'next/font/google';
import '@xyflow/react/dist/base.css';
import '@cubone/react-file-manager/dist/style.css';
import './globals.css';
import { AppShell } from '@/components/layouts/app-shell';
import { Toaster } from '@/components/ui/sonner';
import { getFeatureFlags } from '@/lib/feature-flags';
import { getFabLayout } from '@/lib/fab-layout';
import { FeatureFlagsProvider } from '@/hooks/feature-flags-context';
import { FabLayoutProvider } from '@/hooks/fab-layout-context';
import { QueryProvider } from '@/components/providers/query-provider';
import { I18nProvider } from '@/components/providers/i18n-provider';
import { getLanguagePreference } from '@/lib/language';
import { RouteAnnouncer } from '@/components/common/route-announcer/route-announcer';

/*
 * Inter as the primary brand font for editorial palette adoption.
 * Loaded via next/font/google so it's self-hosted at build time
 * (no runtime CDN fetch, aligns with ShipIT's offline-capable ethos).
 * Exposed as --font-inter; globals.css wires it into --font-sans.
 * See .scratchpad/plans/stitch-developer-portal-adaptation.md §2.1.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/** Force dynamic rendering for all pages since they depend on client-side context. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ShipIT AI',
  description:
    'Autonomous AI Native SDLC Platform - Automate the development cycle from idea to deploy',
  icons: [
    { rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' },
    { rel: 'icon', url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    { rel: 'apple-touch-icon', url: '/apple-touch-icon.png', sizes: '180x180' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get('shipit-ai-sidebar-open')?.value === 'true';
  const [{ language, dir }, flags, fabLayout] = await Promise.all([
    getLanguagePreference(),
    getFeatureFlags(),
    getFabLayout(),
  ]);

  return (
    <html lang={language} dir={dir} className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Theme init script — uses only hardcoded string literals, no user input */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement,t=localStorage.getItem('shipit-ai-theme'),s=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t==='system'&&s)||(!t&&s)){d.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <RouteAnnouncer />
        <I18nProvider initialLanguage={language}>
          <QueryProvider>
            <FeatureFlagsProvider flags={flags}>
              <FabLayoutProvider layout={fabLayout}>
                <AppShell sidebarOpen={sidebarOpen}>{children}</AppShell>
              </FabLayoutProvider>
            </FeatureFlagsProvider>
          </QueryProvider>
        </I18nProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
