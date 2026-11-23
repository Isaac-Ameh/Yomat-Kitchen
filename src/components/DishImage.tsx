import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface DishImageProps {
  src: string;
  alt: string;
  title?: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}

export function DishImage({
  src,
  alt,
  title,
  className = '',
  loading = 'lazy',
}: DishImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-[#EBE3D5] text-[#5A0B1E]/75 p-6 text-center ${className}`}
      >
        <UtensilsCrossed className="w-8 h-8 mb-2 opacity-60" strokeWidth={1.5} />
        <span className="font-display text-sm font-medium text-[#1C1917]/80 line-clamp-2">
          {title || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
