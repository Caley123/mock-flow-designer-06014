import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  );
};
