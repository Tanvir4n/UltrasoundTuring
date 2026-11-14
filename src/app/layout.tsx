import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Evaluating Diffusion-Based Synthetic Ultrasound Data | Expert Evaluation Platform',
  description: 'Expert Visual Turing Test and Blind Assessment for Ovarian Morphology Classification in Diffusion-Generated Ultrasound Scans.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-cyan-500 selection:text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}

