'use client';

import { useEffect } from 'react';
import { ThemeProvider } from '@/lib/ThemeProvider';
import { AuthProvider } from '@/hooks/useAuth';
import { AppointmentProvider } from '@/hooks/useAppointment';
import { initAOS } from '@/lib/aos';
import '@/styles/globals.css';
import 'aos/dist/aos.css';
import Header from '@/components/Header';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAOS();
  }, []);

  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <AppointmentProvider>
              <Header />
              <main className="min-h-screen bg-background">
                {children}
              </main>
            </AppointmentProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}