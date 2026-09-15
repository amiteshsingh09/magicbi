import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'MagicBI Explorer', description: 'Trustworthy analytics from messy source data.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
