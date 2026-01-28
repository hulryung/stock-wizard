interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle';
}

const variantStyles = {
  text: 'h-4 w-full rounded',
  card: 'h-48 w-full rounded-xl',
  circle: 'h-12 w-12 rounded-full',
};

export function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 ${variantStyles[variant]} ${className}`}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton variant="circle" className="h-10 w-10" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}
