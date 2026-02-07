interface Props {
  icon: string;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  variant?: 'info' | 'success' | 'warning';
}

export default function HintCard({
  icon,
  title,
  message,
  actionText,
  onAction,
  variant = 'info'
}: Props) {
  const variantClasses = {
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700',
  };

  return (
    <div className={`card p-4 border-l-4 ${variantClasses[variant]}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-700 dark:text-gray-50 mb-1">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {message}
          </p>
          {actionText && onAction && (
            <button
              onClick={onAction}
              className="text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 hover:underline"
            >
              {actionText} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
