import Link from 'next/link';
import { ReactNode } from 'react';

interface NavbarProps {
  children?: ReactNode;
  className?: string;
}

export const Navbar = ({ children, className = '' }: NavbarProps) => {
  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/b2b', label: 'B2B' },
    { href: '/dashboard/events', label: 'Events' },
    { href: '/dashboard/finance', label: 'Finance' },
  ];

  return (
    <nav className={`bg-gray-800 text-white ${className}`}>
      <div className="px-4 py-3">
        <ul className="flex space-x-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-gray-300">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        {children}
      </div>
    </nav>
  );
};