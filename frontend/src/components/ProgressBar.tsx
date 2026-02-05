import { memo } from 'react';

interface Props {
  percentage: number;
  color?: 'sage' | 'success' | 'danger' | 'warning';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'bar' | 'semicircle';
}

const colorClasses = {
  sage: 'bg-gradient-green',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
};

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

function ProgressBar({
  percentage,
  color = 'sage',
  showLabel = true,
  size = 'md',
  variant = 'bar',
}: Props) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  if (variant === 'semicircle') {
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-16 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 100 50">
            {/* Фон полукруга */}
            <path
              d="M 5 50 A 45 45 0 0 1 95 50"
              fill="none"
              stroke="#EFEEE9"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Прогресс с градиентом */}
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8BC34A" />
                <stop offset={`${clampedPercentage}%`} stopColor="#8BC34A" />
                <stop offset={`${clampedPercentage}%`} stopColor="#757575" />
                <stop offset="100%" stopColor="#757575" />
              </linearGradient>
            </defs>
            <path
              d="M 5 50 A 45 45 0 0 1 95 50"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="141.37"
              strokeDashoffset={141.37 - (141.37 * clampedPercentage) / 100}
              className="transition-all duration-500"
            />
          </svg>
          {showLabel && (
            <div className="absolute inset-0 flex items-end justify-center pb-1">
              <span className="text-2xl font-bold text-slate-700">
                {clampedPercentage.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className={`w-full bg-cream-300 rounded-full ${sizeClasses[size]} overflow-hidden`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="text-xs text-slate-600 mt-1 text-right font-medium">
          {clampedPercentage.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

export default memo(ProgressBar);
