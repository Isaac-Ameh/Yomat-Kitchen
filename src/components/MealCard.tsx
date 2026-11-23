import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { Meal } from '../types/menu';
import { formatPrice } from '../data/meals';
import { useCart } from '../context/CartContext';
import { DishImage } from './DishImage';

interface MealCardProps {
  meal: Meal;
}

export function MealCard({ meal }: MealCardProps) {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const available = meal.isAvailable !== false;

  const handleAdd = () => {
    if (!available) return;
    const added = addToCart(meal, 1);
    if (added) {
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1400);
    }
  };

  return (
    <article className="group flex flex-col bg-[#FFFFFF] rounded-xl border border-[#5A0B1E]/10 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link
        to={`/menu/${meal.id}`}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4EFE8] block"
      >
        <DishImage
          src={meal.image}
          alt={meal.imageAlt || meal.name}
          title={meal.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        {!available && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-[#1C1917]/85 text-[#FAF7F2] text-[11px] font-semibold">
            Currently Unavailable
          </span>
        )}
      </Link>

      <div className="flex flex-col flex-1 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 text-xs text-[#57534E]">
          <span>{meal.category}</span>
          <span className="tabular-nums font-semibold text-xs sm:text-sm text-[#15803D]">
            {formatPrice(meal.price)}
          </span>
        </div>

        <h3 className="mt-2 font-display text-lg sm:text-xl font-semibold text-[#1C1917] leading-snug">
          <Link
            to={`/menu/${meal.id}`}
            className="hover:text-[#5A0B1E] transition-colors"
          >
            {meal.name}
          </Link>
        </h3>

        <p className="mt-2 text-sm text-[#57534E] leading-relaxed line-clamp-2 flex-1">
          {meal.shortDescription}
        </p>

        <div className="mt-5 pt-4 border-t border-[#1C1917]/8 flex items-center justify-between gap-3">
          <Link
            to={`/menu/${meal.id}`}
            className="text-sm font-medium text-[#5A0B1E] hover:text-[#B91C1C] transition-colors whitespace-nowrap shrink-0"
          >
            View Dish
          </Link>

          <button
            type="button"
            disabled={!available}
            onClick={handleAdd}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              !available
                ? 'bg-[#1C1917]/15 text-[#57534E] cursor-not-allowed'
                : justAdded
                ? 'bg-[#15803D] text-white cursor-pointer'
                : 'bg-[#5A0B1E] text-[#FAF7F2] hover:bg-[#731129] cursor-pointer'
            }`}
          >
            {!available ? (
              <span>Unavailable</span>
            ) : justAdded ? (
              <>
                <Check className="w-4 h-4" />
                <span>Added</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add to Order</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
