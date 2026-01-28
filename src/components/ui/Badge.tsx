interface BadgeProps {
  market: 'KR' | 'US';
  className?: string;
}

const marketConfig = {
  KR: {
    label: '한국',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  US: {
    label: '미국',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

export function Badge({ market, className = '' }: BadgeProps) {
  const config = marketConfig[market];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
