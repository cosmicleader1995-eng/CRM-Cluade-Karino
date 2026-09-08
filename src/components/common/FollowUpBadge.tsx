import React from 'react';
import { FOLLOW_UP_STATUS_CODES } from '../../data/defaultData';

interface FollowUpBadgeProps {
  code: string | undefined | null;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FollowUpBadge: React.FC<FollowUpBadgeProps> = ({
  code,
  showLabel = false,
  size = 'md',
  className = ''
}) => {
  if (!code || code.trim() === '') {
    return (
      <span className={`inline-flex items-center justify-center rounded-lg bg-slate-800/40 text-slate-400 font-mono border border-slate-700/50 ${
        size === 'sm' ? 'w-5 h-5 text-[10px]' : size === 'lg' ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-xs'
      } ${className}`}>
        —
      </span>
    );
  }

  const status = FOLLOW_UP_STATUS_CODES.find(
    (c) => c.code === code || c.symbol === code || code.startsWith(c.code)
  );

  const sizeClasses = {
    sm: showLabel ? 'px-2 py-0.5 text-[11px] gap-1' : 'w-5 h-5 text-[11px]',
    md: showLabel ? 'px-2.5 py-1 text-xs gap-1.5' : 'w-6 h-6 text-xs font-bold',
    lg: showLabel ? 'px-3.5 py-1.5 text-sm gap-2' : 'w-8 h-8 text-base font-bold'
  }[size];

  if (!status) {
    // Arbitrary text
    return (
      <span
        className={`inline-flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 border border-slate-700 ${sizeClasses} ${className}`}
        title={code}
      >
        {code}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg border font-bold transition-all shadow-xs ${status.badgeClass} ${sizeClasses} ${className}`}
      title={`${status.label}: ${status.meaning}`}
    >
      <span className="font-mono">{status.symbol}</span>
      {showLabel && <span className="font-sans font-medium whitespace-nowrap">{status.label}</span>}
    </span>
  );
};
