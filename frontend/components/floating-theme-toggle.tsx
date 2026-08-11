'use client';

import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

export function FloatingThemeToggle() {
  const pathname = usePathname();

  // No dashboard o toggle já aparece ao lado do botão "Sair" (ver
  // app/dashboard/layout.tsx) — manter a versão flutuante lá também
  // fazia o botão sobrepor o "Sair".
  if (pathname?.startsWith('/dashboard')) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
      <ThemeToggle />
    </div>
  );
}
