import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { GuardyMark } from '@/components/brand/GuardyMark';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen transition-all duration-300 flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="hidden md:flex items-center justify-end gap-1.5 px-6 py-2 text-[10px] text-muted-foreground/60">
          <GuardyMark size="xs" />
          <span>Guardy</span>
        </footer>
      </main>
    </div>
  );
};
