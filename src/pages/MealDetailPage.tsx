import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
} from 'lucide-react';
import {
  RESTAURANT_IMAGES,
  RESTAURANT_INFO,
  buildWhatsAppOrderUrl,
  formatPrice,
} from '../data/meals';
import { useCart } from '../context/CartContext';
import { useMenu } from '../context/MenuContext';
import { DishImage } from '../components/DishImage';
import { MealCard } from '../components/MealCard';
import { PageHero } from '../components/PageHero';

export function MealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { meals, siteSettings } = useMenu();
  const meal = meals.find((m) => m.id === id);
  const { addToCart, totalItems } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const phoneDisplay = siteSettings.phone || RESTAURANT_INFO.phoneDisplay;
  const phoneDigits = phoneDisplay.replace(/[^0-9]/g, '');
  const phoneTel = phoneDigits.startsWith('0')
    ? `tel:+234${phoneDigits.slice(1)}`
    : `tel:+${phoneDigits}`;

  useEffect(() => {
    setQuantity(1);
    setAddedFeedback(false);
  }, [id]);

  if (!meal) {
    return (
      <div>
        <PageHero
          eyebrow="Menu Item"
          title="Meal Not Found"
          subtitle="We could not find that dish on our current menu."
          image={RESTAURANT_IMAGES.hero}
          imageAlt="Nigerian Jollof Rice and Chicken"
        />
        <section className="py-20 bg-[#FAF7F2] text-center">
          <div className="max-w-lg mx-auto px-4">
            <p className="text-base text-[#57534E]">
              The meal you are looking for may have moved or the link may be incomplete.
            </p>
            <Link
              to="/menu"
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#5A0B1E] text-[#FAF7F2] text-sm font-medium hover:bg-[#731129] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Menu</span>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const available = meal.isAvailable !== false;
  const relatedMeals = meals
    .filter((m) => m.category === meal.category && m.id !== meal.id)
    .slice(0, 3);

  const handleAddToCart = () => {
    if (!available) return;
    const added = addToCart(meal, quantity);
    if (added) {
      setAddedFeedback(true);
      window.setTimeout(() => setAddedFeedback(false), 1800);
    }
  };

  const directWhatsAppUrl = buildWhatsAppOrderUrl(
    `Hello ${siteSettings.restaurantName}, I would like to order ${quantity}x ${meal.name}${
      typeof meal.price === 'number' && meal.price > 0
        ? ` (${formatPrice(meal.price)} each)`
        : ' and confirm the current price in Naira (₦)'
    }.`
  );

  return (
    <div>
      <PageHero
        eyebrow={meal.category}
        title={meal.name}
        subtitle={meal.prepStyle}
        image={meal.image}
        imageAlt={meal.imageAlt}
      />

      <section className="py-10 sm:py-16 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#5A0B1E] hover:text-[#B91C1C] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Menu</span>
          </Link>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left: Large Dish Photography */}
            <div className="lg:col-span-7">
              <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#F4EFE8] border border-[#5A0B1E]/10">
                <DishImage
                  src={meal.image}
                  alt={meal.imageAlt}
                  title={meal.name}
                  loading="eager"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="mt-3 text-xs text-[#57534E]">
                Representative West African dish photography (preview demonstration content). Reach out
                via phone or WhatsApp to confirm official dishes and pricing.
              </p>
            </div>

            {/* Right: Contiguous Order & Dish Details Module */}
            <div className="lg:col-span-5 bg-[#FFFFFF] rounded-xl border border-[#5A0B1E]/12 p-6 sm:p-8">
              <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#B91C1C]">
                {meal.category}
              </p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
                {meal.name}
              </h2>

              <div className="mt-3 flex flex-wrap items-baseline gap-3">
                <span className="tabular-nums font-display text-2xl font-semibold text-[#15803D]">
                  {formatPrice(meal.price)}
                </span>
                <span className="text-xs text-[#57534E]">
                  {typeof meal.price === 'number' && meal.price > 0
                    ? 'Confirmed kitchen price'
                    : `Confirm current rate via ${phoneDisplay}`}
                </span>
              </div>

              <p className="mt-5 text-base text-[#57534E] leading-relaxed">
                {meal.fullDescription}
              </p>

              {/* Category & Serving Note */}
              <div className="mt-6 pt-5 border-t border-[#1C1917]/8">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1C1917]">
                  Menu Section &amp; Service
                </h3>
                <p className="mt-2 text-sm text-[#57534E] leading-relaxed">
                  {meal.prepStyle} · Demonstration item — contact {phoneDisplay} to confirm
                  availability at {RESTAURANT_INFO.shortLocation}.
                </p>
              </div>

              {/* Quantity & Order Controls */}
              <div className="mt-6 pt-6 border-t border-[#1C1917]/8 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1C1917]">Quantity</span>
                  <div className="inline-flex items-center rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2]">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                      className="p-2.5 text-[#1C1917] hover:bg-[#F4EFE8] rounded-l-lg transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="tabular-nums px-4 text-sm font-semibold text-[#1C1917] min-w-[2.5rem] text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      aria-label="Increase quantity"
                      className="p-2.5 text-[#1C1917] hover:bg-[#F4EFE8] rounded-r-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!available}
                  onClick={handleAddToCart}
                  className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-base font-medium transition-colors ${
                    !available
                      ? 'bg-[#1C1917]/15 text-[#57534E] cursor-not-allowed'
                      : addedFeedback
                      ? 'bg-[#15803D] text-white cursor-pointer'
                      : 'bg-[#5A0B1E] hover:bg-[#731129] text-[#FAF7F2] cursor-pointer'
                  }`}
                >
                  {!available ? (
                    <span>Currently Unavailable</span>
                  ) : addedFeedback ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Added to Order ({quantity})</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5" />
                      <span>Add to Order ({quantity})</span>
                    </>
                  )}
                </button>

                <a
                  href={directWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Inquire / Order on WhatsApp</span>
                </a>

                <a
                  href={phoneTel}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-[#1C1917]/15 text-sm font-medium text-[#1C1917] hover:bg-[#F4EFE8] transition-colors tabular-nums"
                >
                  <Phone className="w-4 h-4 text-[#5A0B1E]" />
                  <span>Call {phoneDisplay}</span>
                </a>

                {totalItems > 0 && (
                  <Link
                    to="/cart"
                    className="block w-full text-center py-2.5 rounded-lg border border-[#5A0B1E]/25 text-sm font-medium text-[#5A0B1E] hover:bg-[#F4EFE8] transition-colors"
                  >
                    Review Order Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Dishes */}
      {relatedMeals.length > 0 && (
        <section className="py-14 sm:py-20 bg-[#F4EFE8]/75 border-t border-[#5A0B1E]/8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
              More in {meal.category}
            </h2>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {relatedMeals.map((related) => (
                <MealCard key={related.id} meal={related} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
