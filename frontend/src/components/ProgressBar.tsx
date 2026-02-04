interface Props {
  percentage: number;
  color?: 'blue' | 'green' | 'red' | 'yellow';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ProgressBar({
  percentage,
  color = 'blue',
  showLabel = true,
  size = 'md',
}: Props) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
  };

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="text-xs text-gray-500 mt-1 text-right">
          {clampedPercentage.toFixed(0)}%
        </div>
      )}
    </div>
  );
}
