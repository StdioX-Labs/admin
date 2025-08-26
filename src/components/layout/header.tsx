import { ReactNode } from 'react';

interface HeaderProps {
  children?: ReactNode;
  title?: string;
  showUserMenu?: boolean;
}

export const Header = ({ children, title, showUserMenu = true }: HeaderProps) => {
  return (
    <header className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
      <div className="flex items-center">
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
      </div>
      <div className="flex items-center space-x-4">
        {children}
        {showUserMenu && (
          <div className="flex items-center space-x-2 my-1">

          </div>
        )}
      </div>
    </header>
  );
};