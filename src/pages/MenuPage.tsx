import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import {
  RESTAURANT_IMAGES,
  RESTAURANT_INFO,
  buildWhatsAppOrderUrl,
} from '../data/meals';
import { MealCategory } from '../types/menu';
import { useMenu } from '../context/MenuContext';
import { PageHero } from '../components/PageHero';
import { MealCard } from '../components/MealCard';
import { DishImage } from '../components/DishImage';

type FilterOption = 'All Meals' | MealCategory;

const CATEGORIES: FilterOption[] = [
  'All Meals',
  'Main Dishes & Meals',
  'Soups & Swallow',
];

export function MenuPage() {
  const { meals, siteSettings } = useMenu();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = searchParams.get('category') as FilterOption | null;

  const [selectedCategory, setSelectedCategory] = useState<FilterOption>(
    initialParam && CATEGORIES.includes(initialParam) ? initialParam : 'All Meals'
  );

  useEffect(() => {
    const param = searchParams.get('category') as FilterOption | null;
    if (param && CATEGORIES.includes(param)) {
      setSelectedCategory(param);
    } else if (!param) {
      setSelectedCategory('All Meals');
    }
  }, [searchParams]);

  const handleCategoryChange = (category: FilterOption) => {
    setSelectedCategory(category);
    if (category === 'All Meals') {
      setSearchParams({});
    } else {
      setSearchParams({ category });
    }
  };

  const filteredMeals =
    selectedCategory === 'All Meals'
      ? meals
      : meals.filter((meal) => meal.category === selectedCategory);

  const phoneDisplay = siteSettings.phone || RESTAURANT_INFO.phoneDisplay;
  const priceInquiryUrl = buildWhatsAppOrderUrl(
    `Hello ${siteSettings.restaurantName}, please share today’s menu prices in Naira (₦).`
  );

  return (
    <div>
      <PageHero
        eyebrow="Yomat Kitchen Preview Menu"
        title="Explore Our Menu"
        subtitle="Sample West African main dishes, swallows, and traditional soups shown for preview. Contact Yomat Kitchen to confirm official dishes and pricing."
        image={RESTAURANT_IMAGES.hero}
        imageAlt="Plate of Nigerian Jollof Rice served with seasoned chicken"
      />

      <section className="py-12 sm:py-16 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Filter Controls + Pricing Inquiry Notice */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-8 border-b border-[#5A0B1E]/12">
            <div
              role="tablist"
              aria-label="Filter menu by category"
              className="flex flex-wrap items-center gap-2"
            >
              {CATEGORIES.map((category) => {
                const count =
                  category === 'All Meals'
                    ? meals.length
                    : meals.filter((m) => m.category === category).length;
                const isActive = selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleCategoryChange(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#5A0B1E] text-[#FAF7F2]'
                        : 'bg-[#F4EFE8] text-[#1C1917] hover:bg-[#E7DFD2]'
                    }`}
                  >
                    {category}{' '}
                    <span className="tabular-nums opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#57534E]">
              <span>{siteSettings.menuNotice}</span>
              <a
                href={priceInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold transition-colors shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Ask Prices on WhatsApp ({phoneDisplay})</span>
              </a>
            </div>
          </div>

          {/* Complete Meals Grid */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredMeals.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>

          {/* Culinary Showcase Consolidated into Our Menu */}
          <div className="mt-16 rounded-2xl bg-[#F4EFE8] border border-[#5A0B1E]/12 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              <div className="lg:col-span-5 aspect-[4/3] lg:aspect-auto lg:h-full bg-[#EBE3D5]">
                <DishImage
                  src={RESTAURANT_IMAGES.culinaryPrep}
                  alt="Simmering pot of West African Egusi Soup"
                  title="Yomat Kitchen Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:col-span-7 p-6 sm:p-10 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B91C1C]">
                  Sample Menu Preview
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
                  Delicious West African Meals, Close to You.
                </h2>
                <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
                  These demonstration dishes show how Yomat Kitchen&apos;s West African menu can be
                  browsed and ordered online. Visit us at {siteSettings.address} or call{' '}
                  {phoneDisplay} to confirm today&apos;s official offerings. Planning a group lunch
                  or campus event?
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-white text-sm font-medium transition-colors"
                  >
                    <span>Request Catering / Bulk Order</span>
                  </Link>
                  <Link
                    to="/cart"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#5A0B1E]/25 text-[#5A0B1E] hover:bg-white text-sm font-medium transition-colors"
                  >
                    <span>Review Order Cart</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
