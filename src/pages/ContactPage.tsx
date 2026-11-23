import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  UtensilsCrossed,
} from 'lucide-react';
import {
  RESTAURANT_IMAGES,
  RESTAURANT_INFO,
  buildWhatsAppOrderUrl,
} from '../data/meals';
import { useMenu } from '../context/MenuContext';
import { PageHero } from '../components/PageHero';

interface FormErrors {
  name?: string;
  phone?: string;
  message?: string;
}

export function ContactPage() {
  const { siteSettings } = useMenu();
  const [enquiryMode, setEnquiryMode] = useState<'meal' | 'catering'>('meal');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [eventType, setEventType] = useState('Campus / Birthday Catering');
  const [eventDate, setEventDate] = useState('');
  const [guestCount, setGuestCount] = useState('30');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [cateringSaved, setCateringSaved] = useState(false);

  const phoneDisplay = siteSettings.phone || RESTAURANT_INFO.phoneDisplay;
  const address = siteSettings.address || RESTAURANT_INFO.address;
  const phoneDigits = phoneDisplay.replace(/[^0-9]/g, '');
  const phoneTel = phoneDigits.startsWith('0')
    ? `tel:+234${phoneDigits.slice(1)}`
    : `tel:+${phoneDigits}`;

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (!name.trim()) {
      nextErrors.name = 'Please enter your name.';
    }
    if (!phone.trim()) {
      nextErrors.phone = 'Please enter your phone number or WhatsApp contact.';
    }
    if (!message.trim() || message.trim().length < 6) {
      nextErrors.message = 'Please enter your meal or catering details (at least 6 characters).';
    }
    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmittedMessage(null);
      return;
    }

    setErrors({});
    setCateringSaved(false);

    if (enquiryMode === 'catering') {
      setSubmitting(true);
      try {
        const res = await fetch('/api/catering', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            eventType: eventType.trim(),
            eventDate: eventDate.trim(),
            guestCount: Number(guestCount) || 25,
            requestedDishes: message.trim(),
            notes: `Submitted via Contact page (${eventType})`,
          }),
        });
        if (res.ok) {
          setCateringSaved(true);
        }
      } catch {
        // Still allow WhatsApp handoff below
      } finally {
        setSubmitting(false);
      }
    }

    const composed =
      enquiryMode === 'catering'
        ? `Hello ${siteSettings.restaurantName},\nCatering Enquiry:\nName: ${name.trim()}\nPhone: ${phone.trim()}\nEvent: ${eventType}\nDate: ${
            eventDate || 'TBD'
          }\nGuests: ${guestCount}\nDishes/Notes: ${message.trim()}`
        : `Hello ${siteSettings.restaurantName},\nName: ${name.trim()}\nPhone: ${phone.trim()}\nMessage: ${message.trim()}`;

    setSubmittedMessage(composed);
    setName('');
    setPhone('');
    setEmail('');
    setEventDate('');
    setMessage('');
  };

  return (
    <div>
      <PageHero
        eyebrow="Location & Contact"
        title={`Visit or Contact ${siteSettings.restaurantName}`}
        subtitle="Find us Behind Science Laboratory Technology, University of Benin, Uselu, Benin City—or reach out directly by phone, WhatsApp, or catering enquiry."
        image={RESTAURANT_IMAGES.hero}
        imageAlt="Plate of Nigerian Jollof Rice served with fried chicken"
      />

      <section className="py-16 sm:py-24 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            {/* Left: Contact Info & Map */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#B91C1C]">
                  Uselu · Benin City, Edo State
                </p>
                <h2 className="mt-2 font-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
                  {siteSettings.restaurantName}
                </h2>
                <p className="mt-3 text-sm text-[#57534E] leading-relaxed">
                  Visit us Behind Science Laboratory Technology, University of Benin, Uselu, or
                  call / message us on WhatsApp to confirm meal availability, pricing, or event
                  catering.
                </p>
              </div>

              <div className="space-y-5 pt-4 border-t border-[#5A0B1E]/12">
                <div className="flex items-start gap-3.5">
                  <MapPin className="w-5 h-5 text-[#5A0B1E] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#1C1917]">Address</h3>
                    <p className="mt-0.5 text-sm text-[#57534E] leading-relaxed">{address}</p>
                    <a
                      href={RESTAURANT_INFO.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#15803D] hover:underline"
                    >
                      <span>Open in Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <Phone className="w-5 h-5 text-[#5A0B1E] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#1C1917]">
                      Phone &amp; WhatsApp
                    </h3>
                    <p className="mt-0.5 text-sm text-[#57534E] tabular-nums">
                      <a href={phoneTel} className="font-semibold text-[#5A0B1E] hover:underline">
                        {phoneDisplay}
                      </a>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      <a
                        href={buildWhatsAppOrderUrl(
                          `Hello ${siteSettings.restaurantName}, I would like to ask about today’s meals.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Message on WhatsApp</span>
                      </a>
                      <a
                        href={phoneTel}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-white text-xs font-semibold transition-colors tabular-nums"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call {phoneDisplay}</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <Clock className="w-5 h-5 text-[#5A0B1E] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#1C1917]">Opening Hours</h3>
                    <p className="mt-0.5 text-sm text-[#57534E]">{siteSettings.openingHours}</p>
                    <p className="mt-1 text-xs font-medium text-[#15803D]">
                      {siteSettings.isOpen ? 'Kitchen Open for Service' : 'Currently Closed'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <UtensilsCrossed className="w-5 h-5 text-[#5A0B1E] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#1C1917]">Cuisine &amp; Services</h3>
                    <p className="mt-0.5 text-sm text-[#57534E]">
                      West African Restaurant · West African Cuisine · Dine-in, Takeaway &amp; Event
                      Catering
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Meal or Catering Enquiry Form */}
            <div className="lg:col-span-7 bg-[#FFFFFF] rounded-xl border border-[#5A0B1E]/12 p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
                  {enquiryMode === 'catering'
                    ? 'Request Event Catering'
                    : 'Send a Meal or Order Enquiry'}
                </h2>
                <div className="inline-flex rounded-lg border border-[#5A0B1E]/15 p-1 bg-[#FAF7F2]">
                  <button
                    type="button"
                    onClick={() => setEnquiryMode('meal')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      enquiryMode === 'meal'
                        ? 'bg-[#5A0B1E] text-white'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    }`}
                  >
                    Meal Enquiry
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnquiryMode('catering')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      enquiryMode === 'catering'
                        ? 'bg-[#5A0B1E] text-white'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    }`}
                  >
                    Event Catering
                  </button>
                </div>
              </div>

              <p className="mt-2 text-sm text-[#57534E]">
                {enquiryMode === 'catering'
                  ? `Submit your event catering request directly to ${siteSettings.restaurantName} management and follow up on WhatsApp.`
                  : `Fill in your details below to prepare a message for ${siteSettings.restaurantName}, then launch WhatsApp to send it directly to ${phoneDisplay}.`}
              </p>

              {submittedMessage && (
                <div
                  role="status"
                  className="mt-6 rounded-lg bg-[#15803D]/8 border border-[#15803D]/25 p-4 flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#15803D]">
                      {cateringSaved
                        ? 'Your catering enquiry has been logged with our kitchen'
                        : 'Your enquiry is ready to send'}
                    </p>
                    <p className="text-sm text-[#57534E]">
                      Click below to send this message directly via WhatsApp, or call{' '}
                      <a href={phoneTel} className="font-semibold text-[#5A0B1E] underline tabular-nums">
                        {phoneDisplay}
                      </a>
                      .
                    </p>
                    <a
                      href={buildWhatsAppOrderUrl(submittedMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Send via WhatsApp Now</span>
                    </a>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-sm font-medium text-[#1C1917]"
                    >
                      Full Name
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Osas Eghosa"
                      aria-invalid={Boolean(errors.name)}
                      className="mt-1.5 w-full rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2] px-4 py-2.5 text-sm text-[#1C1917] placeholder:text-[#57534E]/60 focus:outline-none focus:ring-2 focus:ring-[#5A0B1E]"
                    />
                    {errors.name && (
                      <p className="mt-1.5 text-xs text-[#B91C1C]">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-phone"
                      className="block text-sm font-medium text-[#1C1917]"
                    >
                      Phone / WhatsApp Number
                    </label>
                    <input
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g., 0803 000 0000"
                      aria-invalid={Boolean(errors.phone)}
                      className="mt-1.5 w-full rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2] px-4 py-2.5 text-sm text-[#1C1917] placeholder:text-[#57534E]/60 focus:outline-none focus:ring-2 focus:ring-[#5A0B1E]"
                    />
                    {errors.phone && (
                      <p className="mt-1.5 text-xs text-[#B91C1C]">{errors.phone}</p>
                    )}
                  </div>
                </div>

                {enquiryMode === 'catering' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917]">Event Type</label>
                      <input
                        type="text"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#5A0B1E]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917]">Event Date</label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#5A0B1E]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917]">Guests</label>
                      <input
                        type="number"
                        min={5}
                        max={2000}
                        value={guestCount}
                        onChange={(e) => setGuestCount(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#5A0B1E]"
                      />
                    </div>
                  </div>
                )}

                {enquiryMode === 'catering' && (
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917]">
                      Optional Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g., osas@example.com"
                      className="mt-1.5 w-full rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2] px-4 py-2.5 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#5A0B1E]"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-sm font-medium text-[#1C1917]"
                  >
                    {enquiryMode === 'catering'
                      ? 'Requested Dishes & Tray Quantities'
                      : 'Enquiry or Meal Request'}
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      enquiryMode === 'catering'
                        ? 'e.g., 50 packs of Jollof Rice & Chicken, 20 portions of Fried Rice & Beef...'
                        : 'Let us know which meals you are asking about (e.g., Jollof Rice & Chicken, Black Soup & Semovita)...'
                    }
                    aria-invalid={Boolean(errors.message)}
                    className="mt-1.5 w-full rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2] px-4 py-2.5 text-sm text-[#1C1917] placeholder:text-[#57534E]/60 focus:outline-none focus:ring-2 focus:ring-[#5A0B1E]"
                  />
                  {errors.message && (
                    <p className="mt-1.5 text-xs text-[#B91C1C]">{errors.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] disabled:opacity-60 text-[#FAF7F2] text-sm font-medium transition-colors cursor-pointer"
                >
                  {submitting
                    ? 'Submitting Enquiry...'
                    : enquiryMode === 'catering'
                    ? 'Submit Catering Enquiry'
                    : 'Prepare Enquiry Message'}
                </button>
              </form>
            </div>
          </div>

          {/* Embedded Google Map for University of Benin, Uselu */}
          <div className="mt-14 bg-[#FFFFFF] rounded-xl border border-[#5A0B1E]/12 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1C1917]/8 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-semibold text-[#1C1917]">
                  Map: University of Benin, Uselu, Benin City, Edo State
                </h3>
                <p className="text-xs text-[#57534E]">{address}</p>
              </div>
              <a
                href={RESTAURANT_INFO.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5A0B1E] hover:text-[#B91C1C]"
              >
                <span>Open Full Map</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="aspect-[16/9] sm:aspect-[21/9] w-full bg-[#F4EFE8]">
              <iframe
                title="Map showing University of Benin, Uselu, Benin City, Edo State, Nigeria"
                src={RESTAURANT_INFO.googleMapsEmbedUrl}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
