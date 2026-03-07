interface LoadingSkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: string;
  className?: string;
}

export function LoadingSkeleton({
  width = '100%',
  height = 20,
  rounded = 'rounded-md',
  className = '',
}: LoadingSkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${rounded} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
}
