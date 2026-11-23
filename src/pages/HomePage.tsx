import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Flame,
  MapPin,
  MessageCircle,
  Soup,
  UtensilsCrossed,
} from 'lucide-react';
import {
  RESTAURANT_IMAGES,
  RESTAURANT_INFO,
  buildWhatsAppOrderUrl,
} from '../data/meals';
import { useMenu } from '../context/MenuContext';
import { MealCard } from '../components/MealCard';
import { DishImage } from '../components/DishImage';

export function HomePage() {
  const { meals, siteSettings } = useMenu();
  const featuredMeals = meals.filter((meal) => meal.featured).slice(0, 6);
  const quickWhatsAppUrl = buildWhatsAppOrderUrl(
    `Hello ${siteSettings.restaurantName}, I would like to place an order or confirm today’s meal prices.`
  );

  return (
    <div>
      {/* Full-Viewport Burgundy & Food Hero (Strictly 2 CTA Buttons, No Food Grid) */}
      <section className="relative min-h-[88vh] flex items-center bg-[#5A0B1E] text-[#FAF7F2] overflow-hidden">
        <div className="absolute inset-0">
          <DishImage
            src={RESTAURANT_IMAGES.hero}
            alt="Nigerian jollof rice served with seasoned chicken"
            loading="eager"
            className="w-full h-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#3A0613]/95 via-[#5A0B1E]/82 to-[#3A0613]/55"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#3A0613]/85 via-transparent to-[#3A0613]/40"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-20 sm:py-36">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            <p className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase text-[#86EFAC]">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Uselu, Benin City · Edo State, Nigeria</span>
            </p>

            <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white text-balance leading-[1.08]">
              <span className="font-sans font-extrabold uppercase tracking-[0.04em]">
                {RESTAURANT_INFO.uppercaseName}{' '}
              </span>
              <span className="font-script text-[#FCA5A5] font-bold text-5xl sm:text-6xl lg:text-[4.25rem]">
                {RESTAURANT_INFO.scriptSuffix}
              </span>
            </h1>

            <p className="mt-4 text-lg sm:text-xl text-[#FAF7F2]/95 font-medium">
              {siteSettings.heroSubtitle}
            </p>

            <p className="mt-3 text-sm sm:text-base text-[#FAF7F2]/80 leading-relaxed max-w-xl">
              {siteSettings.heroDescription}
            </p>

            {/* Exactly Two Hero CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/menu"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm sm:text-base font-semibold transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                <span>Explore Our Menu</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-white/40 bg-black/25 hover:bg-white/15 text-white text-sm sm:text-base font-semibold backdrop-blur-xs transition-colors whitespace-nowrap shrink-0"
              >
                <span>Contact Us</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section A: Welcome to Yomat Kitchen */}
      <section className="py-16 sm:py-24 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 flex flex-col justify-center"
            >
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#B91C1C]">
                Welcome to {siteSettings.restaurantName}
              </p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917] text-balance leading-[1.15]">
                {siteSettings.welcomeHeading}
              </h2>
              <p className="mt-5 text-base text-[#57534E] leading-relaxed">
                {siteSettings.welcomeBody}
              </p>
              <p className="mt-4 text-base text-[#57534E] leading-relaxed">
                Explore the preview showcase below to see how West African dishes, traditional
                soups, and swallows can be presented and ordered directly via phone or WhatsApp.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-5">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#5A0B1E] hover:text-[#B91C1C] transition-colors"
                >
                  <span>About Our Kitchen</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#15803D] hover:text-[#166534] transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Find Us in Uselu</span>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6"
            >
              <div className="relative h-full min-h-[300px] sm:min-h-[380px] rounded-xl overflow-hidden bg-[#F4EFE8] border border-[#5A0B1E]/10">
                <DishImage
                  src={RESTAURANT_IMAGES.culinaryPrep}
                  alt="Pot of traditional Nigerian Egusi Soup"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section B: Featured Menu Dishes */}
      <section className="py-16 sm:py-24 bg-[#F4EFE8]/75 border-y border-[#5A0B1E]/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#B91C1C]">
                Sample Menu Showcase
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917] text-balance">
                West African Cuisine Preview
              </h2>
              <p className="mt-3 text-base text-[#57534E] leading-relaxed">
                Preview our demonstration dishes below, or reach {siteSettings.restaurantName}{' '}
                directly via WhatsApp and phone at{' '}
                <a
                  href={`tel:+234${(siteSettings.phone || RESTAURANT_INFO.phoneDisplay).replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                  className="font-semibold text-[#5A0B1E] hover:underline tabular-nums"
                >
                  {siteSettings.phone || RESTAURANT_INFO.phoneDisplay}
                </a>{' '}
                to confirm official offerings.
              </p>
            </div>
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#5A0B1E] hover:text-[#B91C1C] transition-colors whitespace-nowrap shrink-0"
            >
              <span>View Full Menu ({meals.length})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {featuredMeals.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-[#FAF7F2] text-sm sm:text-base font-medium transition-colors"
            >
              <span>Explore All {meals.length} Dishes</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Section C: Why Choose Yomat Kitchen */}
      <section className="py-16 sm:py-24 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#B91C1C]">
              Why Dine With Us
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917] text-balance">
              Why Uselu Chooses {siteSettings.restaurantName}
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            <div className="pt-6 border-t border-[#5A0B1E]/15">
              <div className="w-11 h-11 rounded-lg bg-[#5A0B1E]/8 text-[#5A0B1E] flex items-center justify-center">
                <Flame className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-[#1C1917]">
                West African Classics
              </h3>
              <p className="mt-2.5 text-sm sm:text-base text-[#57534E] leading-relaxed">
                A preview showcase of comforting West African main dishes, rice classics, and
                everyday favourites designed around university and neighbourhood dining.
              </p>
            </div>

            <div className="pt-6 border-t border-[#5A0B1E]/15">
              <div className="w-11 h-11 rounded-lg bg-[#15803D]/10 text-[#15803D] flex items-center justify-center">
                <Soup className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-[#1C1917]">
                Traditional Soups &amp; Swallows
              </h3>
              <p className="mt-2.5 text-sm sm:text-base text-[#57534E] leading-relaxed">
                Demonstrating how hearty traditional soups and smooth swallows can be browsed,
                customized, and ordered directly with {siteSettings.restaurantName}.
              </p>
            </div>

            <div className="pt-6 border-t border-[#5A0B1E]/15">
              <div className="w-11 h-11 rounded-lg bg-[#B91C1C]/10 text-[#B91C1C] flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-[#1C1917]">
                Close to UNIBEN, Uselu
              </h3>
              <p className="mt-2.5 text-sm sm:text-base text-[#57534E] leading-relaxed">
                Conveniently situated at {siteSettings.address}—easy to reach for walk-in meals,
                takeaways, or direct WhatsApp and phone enquiries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section D: Bottom Burgundy Call to Action */}
      <section className="py-20 sm:py-24 bg-[#5A0B1E] text-[#FAF7F2] border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#86EFAC]">
            Uselu · Benin City, Edo State
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-5xl font-semibold tracking-tight text-white text-balance">
            Ready to Order Your Meal?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#FAF7F2]/85 max-w-xl mx-auto leading-relaxed">
            Browse our full {meals.length}-dish menu, build your order in the cart, or reach{' '}
            {siteSettings.restaurantName} directly on WhatsApp or phone at{' '}
            <span className="tabular-nums font-semibold text-white">
              {siteSettings.phone || RESTAURANT_INFO.phoneDisplay}
            </span>
            .
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] text-white text-base font-medium transition-colors"
            >
              <span>Explore Our Menu</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href={quickWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-base font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
