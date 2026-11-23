import { motion } from 'motion/react';
import { DishImage } from './DishImage';

interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  image: string;
  imageAlt: string;
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
  imageAlt,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-[#5A0B1E] text-[#FAF7F2] pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="absolute inset-0">
        <DishImage
          src={image}
          alt={imageAlt}
          loading="eager"
          className="w-full h-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#3A0613]/85 via-[#5A0B1E]/70 to-[#3A0613]/85"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase text-[#86EFAC]">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-3xl sm:text-5xl font-semibold tracking-tight text-white text-balance leading-[1.12]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 text-base sm:text-lg text-[#FAF7F2]/90 leading-relaxed max-w-xl">
              {subtitle}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
