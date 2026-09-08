import React from 'react';
import { FOLLOW_UP_STATUS_CODES } from '../../data/defaultData';

interface FollowUpSelectorProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  disabled?: boolean;
}

export const FollowUpSelector: React.FC<FollowUpSelectorProps> = ({
  value,
  onChange,
  className = '',
  disabled = false
}) => {
  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 flex-wrap ${className}`}>
      {FOLLOW_UP_STATUS_CODES.map((item) => {
        const isSelected = value === item.code || value === item.symbol;
        return (
          <button
            key={item.code}
            type="button"
            disabled={disabled}
            onClick={() => onChange(isSelected ? '' : item.code)}
            title={`${item.label} - ${item.meaning}`}
            className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1 cursor-pointer border ${
              isSelected
                ? `${item.badgeClass} ring-2 ring-amber-400/50 shadow-md scale-105`
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-800/80'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span>{item.symbol}</span>
          </button>
        );
      })}
    </div>
  );
};
