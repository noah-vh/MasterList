import React from 'react';

interface BadgeProps {
  label: string;
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ label, className = "", icon }) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${className}`}>
      {icon && <span className="mr-1.5">{icon}</span>}
      {label}
    </span>
  );
};
