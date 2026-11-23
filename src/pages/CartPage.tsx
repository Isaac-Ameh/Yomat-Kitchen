import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PaystackPop from '@paystack/inline-js';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAppAuth } from '../context/AppAuthContext';
import { useMenu } from '../context/MenuContext';
import {
  RESTAURANT_IMAGES,
  RESTAURANT_INFO,
  buildWhatsAppOrderUrl,
  formatNaira,
  formatPrice,
} from '../data/meals';
import { PageHero } from '../components/PageHero';
import { DishImage } from '../components/DishImage';
import { parseApiJson } from '../lib/api';

interface PaidReceipt {
  reference: string;
  totalNaira: number;
  paidAt?: string;
  channel?: string;
  items: Array<{
    mealId: string;
    name: string;
    unitPriceNaira: number;
    quantity: number;
    lineTotalNaira: number;
  }>;
}

export function CartPage() {
  const {
    items,
    isLoading,
    totalItems,
    subtotal,
    hasUnpricedItems,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { isSignedIn, getToken, email } = useAppAuth();
  const { siteSettings } = useMenu();
  const [searchParams, setSearchParams] = useSearchParams();

  const [customerNote, setCustomerNote] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'initializing' | 'awaiting' | 'verifying'
  >('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [fallbackAuthUrl, setFallbackAuthUrl] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PaidReceipt | null>(null);

  const phoneDisplay = siteSettings.phone || RESTAURANT_INFO.phoneDisplay;
  const phoneDigits = phoneDisplay.replace(/[^0-9]/g, '');
  const phoneTel = phoneDigits.startsWith('0')
    ? `tel:+234${phoneDigits.slice(1)}`
    : `tel:+${phoneDigits}`;

  const verifyPaymentOnServer = useCallback(
    async (reference: string) => {
      setPaymentStatus('verifying');
      setPaymentError(null);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Your session expired. Please sign in again.');
        }

        const res = await fetch(
          `/api/payments/paystack/verify/${encodeURIComponent(reference)}`,
          {
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await parseApiJson<{
          verified?: boolean;
          receipt?: PaidReceipt;
          error?: string;
        }>(res, 'Could not verify Paystack payment.');

        if (!data.verified || !data.receipt) {
          throw new Error(data.error || 'Could not verify Paystack payment.');
        }

        setReceipt(data.receipt);
        setFallbackAuthUrl(null);
        clearCart();
      } catch (err) {
        setPaymentError(
          err instanceof Error ? err.message : 'Unable to verify Paystack payment.'
        );
      } finally {
        setPaymentStatus('idle');
      }
    },
    [getToken, clearCart]
  );

  // Support Paystack redirect callback (?reference=... or ?trxref=...)
  useEffect(() => {
    const callbackRef = searchParams.get('reference') || searchParams.get('trxref');
    if (callbackRef && /^(EMK|MK)-[A-Za-z0-9_-]{6,64}$/.test(callbackRef)) {
      setSearchParams({}, { replace: true });
      void verifyPaymentOnServer(callbackRef);
    }
  }, [searchParams, setSearchParams, verifyPaymentOnServer]);

  const buildOrderMessage = (): string => {
    const lines = [
      `Hello ${siteSettings.restaurantName},`,
      'I would like to order:',
      ...items.map((item) => {
        const linePrice =
          typeof item.meal.price === 'number' && item.meal.price > 0
            ? ` (${formatNaira(item.meal.price * item.quantity)})`
            : '';
        return `- ${item.quantity}x ${item.meal.name}${linePrice}`;
      }),
    ];
    if (!hasUnpricedItems && subtotal > 0) {
      lines.push(`Estimated Subtotal: ${formatNaira(subtotal)}`);
    }
    if (customerNote.trim()) {
      lines.push(`Note: ${customerNote.trim()}`);
    }
    lines.push(
      hasUnpricedItems
        ? 'Please confirm current pricing in Naira (₦) and preparation time.'
        : 'Please confirm preparation and pickup/delivery time.'
    );
    return lines.join('\n');
  };

  const whatsappOrderUrl = buildWhatsAppOrderUrl(buildOrderMessage());

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildOrderMessage());
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // Ignore clipboard failure in restricted contexts
    }
  };

  const canPayOnline = isSignedIn && !hasUnpricedItems && subtotal > 0;

  const handlePayWithPaystack = async () => {
    if (!canPayOnline) return;
    setPaymentStatus('initializing');
    setPaymentError(null);
    setFallbackAuthUrl(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Please sign in to proceed with online payment.');
      }

      const initRes = await fetch('/api/payments/paystack/initialize', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            mealId: item.meal.id,
            quantity: item.quantity,
          })),
        }),
      });

      const initData = await parseApiJson<{
        access_code?: string;
        reference?: string;
        authorization_url?: string;
        error?: string;
      }>(initRes, 'Unable to start Paystack checkout.');

      if (!initData.access_code || !initData.reference) {
        throw new Error(initData.error || 'Unable to start Paystack checkout.');
      }

      const { access_code, reference, authorization_url } = initData;

      if (authorization_url) {
        setFallbackAuthUrl(authorization_url);
      }

      setPaymentStatus('awaiting');
      const popup = new PaystackPop();
      popup.resumeTransaction(access_code, {
        onSuccess: (tx) => {
          const verifiedRef = tx?.reference || reference;
          void verifyPaymentOnServer(verifiedRef);
        },
        onCancel: () => {
          setPaymentStatus('idle');
          setPaymentError('Payment window was closed before completing payment.');
        },
        onError: (err) => {
          setPaymentStatus('idle');
          setPaymentError(
            err?.message ||
              'Could not display the Paystack modal in this frame. You can use the direct Paystack checkout link below.'
          );
        },
      });
    } catch (err) {
      setPaymentStatus('idle');
      setPaymentError(
        err instanceof Error ? err.message : 'Unable to start Paystack payment.'
      );
    }
  };

  return (
    <div>
      <PageHero
        eyebrow="Your Order"
        title="Order Cart"
        subtitle="Review your selected preview dishes, adjust quantities, and send your order enquiry via WhatsApp or checkout."
        image={RESTAURANT_IMAGES.culinaryPrep}
        imageAlt="Pot of Nigerian Egusi Soup"
      />

      <section className="py-12 sm:py-20 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {receipt ? (
            <div className="max-w-xl mx-auto bg-[#FFFFFF] rounded-xl border border-[#15803D]/25 p-6 sm:p-8 space-y-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-7 h-7 text-[#15803D] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#B91C1C]">
                    Payment Confirmed
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-[#1C1917]">
                    Thank You for Your Order
                  </h2>
                  <p className="mt-1 text-sm text-[#57534E]">
                    Reference:{' '}
                    <code className="text-xs bg-[#F4EFE8] px-1.5 py-0.5 rounded text-[#1C1917]">
                      {receipt.reference}
                    </code>
                  </p>
                </div>
              </div>

              <div className="border-y border-[#1C1917]/10 py-4 space-y-2.5 text-sm">
                {receipt.items.map((item) => (
                  <div key={item.mealId} className="flex items-center justify-between gap-4">
                    <span className="text-[#1C1917]">
                      {item.quantity} × {item.name}
                    </span>
                    <span className="tabular-nums font-medium text-[#1C1917]">
                      {formatNaira(item.lineTotalNaira)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#1C1917]">Total Paid (Paystack)</span>
                <span className="tabular-nums font-display text-2xl font-semibold text-[#5A0B1E]">
                  {formatNaira(receipt.totalNaira)}
                </span>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  to="/menu"
                  onClick={() => setReceipt(null)}
                  className="px-6 py-3 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-[#FAF7F2] text-sm font-medium transition-colors"
                >
                  Order More Meals
                </Link>
                <Link
                  to="/contact"
                  className="px-6 py-3 rounded-lg border border-[#1C1917]/15 text-sm font-medium text-[#1C1917] hover:bg-[#F4EFE8] transition-colors"
                >
                  Contact Kitchen
                </Link>
              </div>
            </div>
          ) : isLoading ? (
            <div className="max-w-lg mx-auto text-center py-12 px-6 bg-[#FFFFFF] rounded-xl border border-[#1C1917]/8">
              <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#5A0B1E]/20 border-t-[#5A0B1E] animate-spin" />
              <p className="mt-4 text-sm text-[#57534E]">Loading your order...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="max-w-lg mx-auto text-center py-12 px-6 bg-[#FFFFFF] rounded-xl border border-[#5A0B1E]/12">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#F4EFE8] text-[#5A0B1E] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h2 className="mt-5 font-display text-2xl font-semibold text-[#1C1917]">
                Your Order Cart Is Empty
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-[#57534E] leading-relaxed">
                Explore our demonstration Main Dishes &amp; Meals and Soups &amp; Swallow to select
                items and send your order enquiry to {siteSettings.restaurantName}.
              </p>
              <Link
                to="/menu"
                className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-[#FAF7F2] text-sm font-medium transition-colors"
              >
                <span>Browse Our Menu</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Cart Items List */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#5A0B1E]/12">
                  <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#1C1917]">
                    Selected Meals ({totalItems})
                  </h2>
                  <button
                    type="button"
                    onClick={clearCart}
                    disabled={paymentStatus !== 'idle'}
                    className="text-xs sm:text-sm font-medium text-[#57534E] hover:text-[#B91C1C] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Clear Order
                  </button>
                </div>

                {items.map(({ meal, quantity }) => (
                  <article
                    key={meal.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 bg-[#FFFFFF] rounded-xl border border-[#5A0B1E]/10 p-4 sm:p-5"
                  >
                    <Link
                      to={`/menu/${meal.id}`}
                      className="w-full sm:w-32 aspect-[4/3] rounded-lg overflow-hidden bg-[#F4EFE8] shrink-0"
                    >
                      <DishImage
                        src={meal.image}
                        alt={meal.imageAlt}
                        title={meal.name}
                        className="w-full h-full object-cover"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#57534E]">{meal.category}</p>
                      <h3 className="mt-0.5 font-display text-lg font-semibold text-[#1C1917]">
                        <Link
                          to={`/menu/${meal.id}`}
                          className="hover:text-[#5A0B1E] transition-colors"
                        >
                          {meal.name}
                        </Link>
                      </h3>
                      <p className="mt-1 tabular-nums text-xs sm:text-sm text-[#15803D] font-medium">
                        {formatPrice(meal.price)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#1C1917]/8">
                      {/* Quantity Stepper */}
                      <div className="inline-flex items-center rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(meal.id, quantity - 1)}
                          aria-label={`Decrease quantity of ${meal.name}`}
                          className="p-2 text-[#1C1917] hover:bg-[#F4EFE8] rounded-l-lg transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="tabular-nums px-3 text-sm font-semibold text-[#1C1917] min-w-[2rem] text-center">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(meal.id, quantity + 1)}
                          aria-label={`Increase quantity of ${meal.name}`}
                          className="p-2 text-[#1C1917] hover:bg-[#F4EFE8] rounded-r-lg transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Line Total or Qty Label */}
                      <div className="text-right min-w-[6.5rem]">
                        <p className="tabular-nums text-sm font-semibold text-[#5A0B1E]">
                          {typeof meal.price === 'number' && meal.price > 0
                            ? formatNaira(meal.price * quantity)
                            : `${quantity} × Plate`}
                        </p>
                      </div>

                      {/* Remove Item */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(meal.id)}
                        aria-label={`Remove ${meal.name} from order`}
                        className="p-2 rounded-lg text-[#57534E] hover:text-[#B91C1C] hover:bg-[#B91C1C]/8 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                ))}

                <div className="pt-2">
                  <Link
                    to="/menu"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#5A0B1E] hover:text-[#B91C1C] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Add More Dishes</span>
                  </Link>
                </div>
              </div>

              {/* Order Summary & WhatsApp / Phone / Paystack Checkout */}
              <aside className="lg:col-span-4 bg-[#FFFFFF] rounded-xl border border-[#5A0B1E]/12 p-6 sm:p-7 space-y-5">
                <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                  Order Summary
                </h2>

                <div className="space-y-2.5 text-sm border-b border-[#1C1917]/10 pb-4">
                  <div className="flex items-center justify-between text-[#57534E]">
                    <span>Total Items</span>
                    <span className="tabular-nums font-semibold text-[#1C1917]">
                      {totalItems} {totalItems === 1 ? 'meal' : 'meals'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[#57534E]">
                    <span>Pricing</span>
                    <span className="font-semibold text-[#15803D] text-right">
                      {hasUnpricedItems ? 'Contact for Price' : formatNaira(subtotal)}
                    </span>
                  </div>
                  {email && (
                    <div className="flex items-center justify-between gap-3 text-[#57534E]">
                      <span>Account Email</span>
                      <span className="truncate text-[#1C1917] max-w-[180px]">{email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="order-note"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5"
                  >
                    Optional Pickup / Pairing Note
                  </label>
                  <textarea
                    id="order-note"
                    rows={2}
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    placeholder="e.g., Pickup around 2:00 PM near Science Laboratory Technology, UNIBEN..."
                    className="w-full rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2] px-3.5 py-2 text-xs text-[#1C1917] placeholder:text-[#57534E]/60 focus:outline-none focus:ring-2 focus:ring-[#5A0B1E]"
                  />
                </div>

                {paymentError && (
                  <div
                    role="alert"
                    className="rounded-lg bg-[#B91C1C]/8 border border-[#B91C1C]/20 p-3.5 flex items-start gap-2.5 text-xs text-[#B91C1C]"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{paymentError}</p>
                  </div>
                )}

                <div className="space-y-3 pt-1">
                  {canPayOnline && (
                    <button
                      type="button"
                      onClick={handlePayWithPaystack}
                      disabled={paymentStatus !== 'idle'}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-[#1C1917] hover:bg-black disabled:opacity-60 text-[#FAF7F2] text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>
                        {paymentStatus === 'initializing'
                          ? 'Starting Paystack...'
                          : paymentStatus === 'awaiting'
                          ? 'Complete Payment in Paystack...'
                          : paymentStatus === 'verifying'
                          ? 'Verifying Payment...'
                          : `Pay ${formatNaira(subtotal)} with Paystack`}
                      </span>
                    </button>
                  )}

                  {!isSignedIn && !hasUnpricedItems && subtotal > 0 && (
                    <Link
                      to="/sign-in?redirect_url=/cart"
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#1C1917]/20 text-sm font-medium text-[#1C1917] hover:bg-[#F4EFE8] transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Sign In to Pay {formatNaira(subtotal)} Online</span>
                    </Link>
                  )}

                  <a
                    href={whatsappOrderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-sm font-semibold transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Order via WhatsApp ({phoneDisplay})</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => void handleCopySummary()}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-[#5A0B1E]/25 text-sm font-medium text-[#5A0B1E] hover:bg-[#F4EFE8] transition-colors cursor-pointer"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-4 h-4 text-[#15803D]" />
                        <span>Order Summary Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Order Summary</span>
                      </>
                    )}
                  </button>

                  <a
                    href={phoneTel}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-white text-sm font-medium transition-colors tabular-nums"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call {phoneDisplay}</span>
                  </a>

                  {fallbackAuthUrl && (
                    <a
                      href={fallbackAuthUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-medium transition-colors"
                    >
                      <span>Open Paystack Checkout Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <p className="text-xs text-[#57534E] leading-relaxed">
                  {hasUnpricedItems
                    ? `Direct WhatsApp ordering confirms today's Naira (₦) price and kitchen readiness directly with ${siteSettings.restaurantName}.`
                    : `Pay securely online via Paystack when signed in, or send your order directly via WhatsApp to ${phoneDisplay}.`}
                </p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
