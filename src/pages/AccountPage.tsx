import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { UserProfile } from '@clerk/react';
import { LogOut, ShoppingBag, UtensilsCrossed, Star, CheckCircle2, Clock } from 'lucide-react';
import { useAppAuth } from '../context/AppAuthContext';
import { parseApiJson } from '../lib/api';
import { RESTAURANT_IMAGES } from '../data/meals';
import { PageHero } from '../components/PageHero';

interface ReviewableItem {
  mealId: string;
  name: string;
  alreadyReviewed: boolean;
}

interface ReviewableOrder {
  reference: string;
  createdAt: string;
  status: string;
  items: ReviewableItem[];
}

export function AccountPage() {
  const { isClerkConfigured, isSignedIn, signOut, fullName, email, getToken } = useAppAuth();
  const [reviewableOrders, setReviewableOrders] = useState<ReviewableOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [reviewModalOrder, setReviewModalOrder] = useState<ReviewableOrder | null>(null);
  const [selectedMealId, setSelectedMealId] = useState('');
  const [rating, setRating] = useState(5);
  const [foodQuality, setFoodQuality] = useState(5);
  const [foodTaste, setFoodTaste] = useState(5);
  const [portionSize, setPortionSize] = useState(5);
  const [packaging, setPackaging] = useState(5);
  const [serviceExperience, setServiceExperience] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchReviewableOrders = useCallback(async () => {
    if (!isSignedIn) {
      setReviewableOrders([]);
      setLoadingOrders(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        setReviewableOrders([]);
        return;
      }
      const res = await fetch('/api/orders/reviewable', {
        credentials: 'same-origin',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiJson<{ orders?: ReviewableOrder[] }>(
        res,
        'Unable to load your paid orders.'
      );
      if (Array.isArray(data.orders)) {
        setReviewableOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch reviewable orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    void fetchReviewableOrders();
  }, [fetchReviewableOrders]);

  const handleOpenReviewModal = (order: ReviewableOrder, mealId: string) => {
    setReviewModalOrder(order);
    setSelectedMealId(mealId);
    setRating(5);
    setFoodQuality(5);
    setFoodTaste(5);
    setPortionSize(5);
    setPackaging(5);
    setServiceExperience(5);
    setComment('');
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalOrder || !selectedMealId || !comment.trim()) {
      setErrorMessage('Please fill in all required fields and write your review comment.');
      return;
    }

    setSubmittingReview(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Please sign in again to submit a verified review.');
      }
      const res = await fetch('/api/reviews', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderReference: reviewModalOrder.reference,
          mealId: selectedMealId,
          rating,
          foodQuality,
          foodTaste,
          portionSize,
          packaging,
          serviceExperience,
          comment,
        }),
      });
      await parseApiJson<{ success?: boolean }>(res, 'Failed to submit review.');

      setSuccessMessage('Verified review submitted successfully! Thank you for helping Yomat Kitchen.');
      setTimeout(() => {
        setReviewModalOrder(null);
        void fetchReviewableOrders();
      }, 1500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div>
      <PageHero
        eyebrow="Your Account"
        title={fullName ? `Welcome, ${fullName}` : 'Your Account'}
        subtitle="Manage your profile details, Yomat Kitchen verified orders, and submit meal reviews."
        image={RESTAURANT_IMAGES.aboutTable}
        imageAlt="Nigerian Fried Rice and Beef"
      />

      <section className="py-12 sm:py-16 bg-[#FAF7F2]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/8 p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                {fullName || 'Yomat Kitchen Customer'}
              </h2>
              {email && <p className="mt-1 text-sm text-[#57534E]">{email}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/cart"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-[#FAF7F2] text-sm font-medium transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>View Order Cart</span>
              </Link>
              <Link
                to="/menu"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1C1917]/15 text-sm font-medium text-[#1C1917] hover:bg-[#F4EFE8] transition-colors"
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>Browse Menu</span>
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1C1917]/15 text-sm font-medium text-[#1C1917] hover:bg-[#F4EFE8] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* VERIFIED ORDERS & REVIEW SECTION */}
          <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#1C1917]/10 pb-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-[#1C1917]">
                  Your Paid Orders &amp; Review Eligibility
                </h3>
                <p className="text-xs text-[#57534E] mt-0.5">
                  Review meals from your completed &amp; verified paid orders.
                </p>
              </div>
            </div>

            {loadingOrders ? (
              <p className="text-sm text-[#57534E] py-4 text-center">Loading your paid orders...</p>
            ) : reviewableOrders.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Clock className="w-10 h-10 text-[#5A0B1E]/40 mx-auto" />
                <p className="text-sm text-[#57534E]">No paid orders found yet.</p>
                <Link
                  to="/menu"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A0B1E] text-white text-xs font-medium rounded-lg"
                >
                  Browse West African Meals
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {reviewableOrders.map((ord) => (
                  <div
                    key={ord.reference}
                    className="p-4 rounded-lg border border-[#1C1917]/10 bg-[#FAF7F2]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#5A0B1E]">
                          {ord.reference}
                        </span>
                        <span className="text-[10px] bg-[#15803D]/10 text-[#15803D] font-bold px-2 py-0.5 rounded uppercase">
                          Paid &amp; Verified
                        </span>
                      </div>
                      <p className="text-xs text-[#57534E] mt-1">
                        Ordered on {new Date(ord.createdAt).toLocaleDateString()} at{' '}
                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ord.items.map((it, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-[#1C1917]/10 text-xs font-medium text-[#1C1917]"
                          >
                            <span>{it.name}</span>
                            {it.alreadyReviewed ? (
                              <span className="text-[10px] text-[#15803D] font-bold flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Reviewed
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenReviewModal(ord, it.mealId)}
                                className="text-[10px] font-semibold text-[#5A0B1E] hover:underline cursor-pointer ml-1"
                              >
                                [Rate Meal]
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isClerkConfigured && (
            <div className="flex justify-center">
              <UserProfile routing="path" path="/account" />
            </div>
          )}
        </div>
      </section>

      {/* REVIEW SUBMISSION MODAL */}
      {reviewModalOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/15 max-w-md w-full p-6 sm:p-8 space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1C1917]/10">
              <div>
                <p className="text-xs font-semibold text-[#5A0B1E]">Verified Purchase Review</p>
                <h3 className="font-display text-lg font-semibold text-[#1C1917]">
                  Rate {reviewModalOrder.items.find((i) => i.mealId === selectedMealId)?.name || selectedMealId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOrder(null)}
                className="p-1 rounded-lg text-[#57534E] hover:text-[#1C1917]"
              >
                ✕
              </button>
            </div>

            {successMessage ? (
              <div className="bg-[#15803D]/10 border border-[#15803D]/30 p-4 rounded-lg text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#15803D] mx-auto" />
                <p className="text-sm font-semibold text-[#15803D]">{successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 rounded-lg bg-[#B91C1C]/10 border border-[#B91C1C]/30 text-xs text-[#B91C1C]">
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                    Overall Experience Rating (1–5 Stars)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setRating(s);
                          setFoodQuality(s);
                          setFoodTaste(s);
                          setPortionSize(s);
                          setPackaging(s);
                          setServiceExperience(s);
                        }}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          rating >= s
                            ? 'bg-[#E11D48]/10 border-[#E11D48] text-[#E11D48]'
                            : 'border-[#1C1917]/15 text-[#1C1917]/30'
                        }`}
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    ))}
                    <span className="text-sm font-bold text-[#1C1917] ml-2">{rating} / 5</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#57534E] mb-1">Food Taste</label>
                    <select
                      value={foodTaste}
                      onChange={(e) => setFoodTaste(Number(e.target.value))}
                      className="w-full p-2 rounded border border-[#1C1917]/20 bg-[#FAF7F2]"
                    >
                      <option value={5}>5 - Exceptional</option>
                      <option value={4}>4 - Very Good</option>
                      <option value={3}>3 - Average</option>
                      <option value={2}>2 - Fair</option>
                      <option value={1}>1 - Poor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#57534E] mb-1">Portion Size</label>
                    <select
                      value={portionSize}
                      onChange={(e) => setPortionSize(Number(e.target.value))}
                      className="w-full p-2 rounded border border-[#1C1917]/20 bg-[#FAF7F2]"
                    >
                      <option value={5}>5 - Generous &amp; Filling</option>
                      <option value={4}>4 - Satisfactory</option>
                      <option value={3}>3 - Average</option>
                      <option value={2}>2 - Small</option>
                      <option value={1}>1 - Inadequate</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#57534E] mb-1">Packaging</label>
                    <select
                      value={packaging}
                      onChange={(e) => setPackaging(Number(e.target.value))}
                      className="w-full p-2 rounded border border-[#1C1917]/20 bg-[#FAF7F2]"
                    >
                      <option value={5}>5 - Neat &amp; Secure</option>
                      <option value={4}>4 - Good</option>
                      <option value={3}>3 - Okay</option>
                      <option value={2}>2 - Spilled slightly</option>
                      <option value={1}>1 - Poor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#57534E] mb-1">Service Experience</label>
                    <select
                      value={serviceExperience}
                      onChange={(e) => setServiceExperience(Number(e.target.value))}
                      className="w-full p-2 rounded border border-[#1C1917]/20 bg-[#FAF7F2]"
                    >
                      <option value={5}>5 - Prompt &amp; Courteous</option>
                      <option value={4}>4 - Good</option>
                      <option value={3}>3 - Average</option>
                      <option value={2}>2 - Delayed</option>
                      <option value={1}>1 - Poor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                    Written Feedback / Comments
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe your meal experience (e.g. delicious smoky jollof rice, hot and tender chicken)..."
                    className="w-full p-3 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-xs text-[#1C1917]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalOrder(null)}
                    className="px-4 py-2 rounded-lg border border-[#1C1917]/15 text-xs font-medium text-[#1C1917] hover:bg-[#FAF7F2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2 rounded-lg bg-[#5A0B1E] text-white text-xs font-medium hover:bg-[#731129] disabled:opacity-50"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Verified Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
