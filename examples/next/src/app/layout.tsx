import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';

import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Relayer Tasks — @relayerjs/next Example',
  description: 'Task management example showcasing @relayerjs/next API route handlers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('dark', geist.variable)} suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <div className="mx-auto max-w-screen-xl px-6 py-8">{children}</div>
      </body>
    </html>
  );
}
