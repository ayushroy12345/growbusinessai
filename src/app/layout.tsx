import type { Metadata } from 'next';
import { Fraunces, Outfit } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Grow Business AI | Customer loyalty that brings people back',
  description:
    'Grow Business AI helps local businesses turn visits into repeat customers with QR check-in, milestone rewards, and private feedback.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${fraunces.variable} antialiased min-h-screen flex flex-col text-ink`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-sand/80 py-8 text-center">
          <p className="text-xs tracking-wide text-ink/50">
            © {new Date().getFullYear()} Grow Business AI. Loyalty for businesses that want people to return.
          </p>
        </footer>
      </body>
    </html>
  );
}
