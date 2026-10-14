import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat, Space_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

// As três fontes do portfólio, servidas pelo próprio site (next/font).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-montserrat',
});
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-space-mono' });

export const metadata: Metadata = {
  title: 'Buscador',
  description: 'Buscador pessoal de vagas na UE',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#0b0c10', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${montserrat.variable} ${spaceMono.variable}`}>
      <body className="min-h-svh">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
