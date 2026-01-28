interface NewsValueBadgeProps {
  label: 'hot' | 'notable' | 'normal';
  score?: number;
  className?: string;
}

const labelConfig = {
  hot: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: '🔥',
    displayLabel: 'HOT',
  },
  notable: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: '⭐',
    displayLabel: '주목',
  },
  normal: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
    icon: '',
    displayLabel: '일반',
  },
};

export function NewsValueBadge({ label, score, className = '' }: NewsValueBadgeProps) {
  const config = labelConfig[label];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {config.icon && <span>{config.icon}</span>}
      <span>{config.displayLabel}</span>
      {score !== undefined && (
        <span className="opacity-70">({Math.round(score * 100)})</span>
      )}
    </span>
  );
}
