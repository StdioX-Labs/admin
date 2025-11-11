'use client';

import { ReactNode } from 'react';

interface HeaderProps {
  children?: ReactNode;
  title?: string;
}

export const Header = ({ children, title }: HeaderProps) => {
  return (
    <header className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
      <div className="flex items-center">
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
      </div>
      <div className="flex items-center space-x-4">
        {children}
      </div>
    </header>
  );
};