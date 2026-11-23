import { RESTAURANT_INFO } from '../data/meals';

interface BrandMarkProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export function BrandMark({ variant = 'dark', size = 'md' }: BrandMarkProps) {
  const isLight = variant === 'light';

  const mainSize =
    size === 'lg'
      ? 'text-xl sm:text-2xl'
      : size === 'sm'
      ? 'text-base sm:text-lg'
      : 'text-lg sm:text-xl';

  const scriptSize =
    size === 'lg'
      ? 'text-2xl sm:text-3xl'
      : size === 'sm'
      ? 'text-xl sm:text-2xl'
      : 'text-2xl sm:text-[1.65rem]';

  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap select-none">
      <span
        className={`font-sans font-extrabold uppercase tracking-[0.06em] ${mainSize} ${
          isLight ? 'text-white' : 'text-[#5A0B1E]'
        }`}
      >
        {RESTAURANT_INFO.uppercaseName}
      </span>
      <span
        className={`font-script font-bold leading-none ${scriptSize} ${
          isLight ? 'text-[#FCA5A5]' : 'text-[#B91C1C]'
        }`}
      >
        {RESTAURANT_INFO.scriptSuffix}
      </span>
      <span
        aria-hidden="true"
        className="inline-block w-1.5 h-1.5 rounded-full bg-[#15803D] self-center ml-0.5"
      />
    </span>
  );
}
