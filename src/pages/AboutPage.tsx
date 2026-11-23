import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, MessageCircle, Phone } from 'lucide-react';
import {
  RESTAURANT_IMAGES,
  RESTAURANT_INFO,
  buildWhatsAppOrderUrl,
} from '../data/meals';
import { PageHero } from '../components/PageHero';
import { DishImage } from '../components/DishImage';

export function AboutPage() {
  const whatsAppUrl = buildWhatsAppOrderUrl(
    'Hello Yomat Kitchen, I would like to ask about today’s meals.'
  );

  return (
    <div>
      <PageHero
        eyebrow="About Us"
        title="Yomat Kitchen in Uselu, Benin City"
        subtitle="West African restaurant serving West African cuisine Behind Science Laboratory Technology, University of Benin."
        image={RESTAURANT_IMAGES.aboutTable}
        imageAlt="Nigerian Fried Rice served with beef and fried plantain"
      />

      {/* Editorial Narrative */}
      <section className="py-16 sm:py-24 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
            <div className="lg:col-span-6 space-y-6 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#B91C1C]">
                Who We Are
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917] text-balance leading-[1.15]">
                Delicious West African Meals, Close to You.
              </h2>
              <p className="text-base text-[#57534E] leading-relaxed">
                Yomat Kitchen is a West African restaurant situated at{' '}
                <strong className="font-semibold text-[#1C1917]">
                  {RESTAURANT_INFO.address}
                </strong>{' '}
                Positioned right within the University of Benin / Uselu community, we bring
                satisfying West African cuisine close to students, staff, families, and neighbours.
              </p>
              <p className="text-base text-[#57534E] leading-relaxed">
                This demonstration website previews how Yomat Kitchen&apos;s menu, direct phone and
                WhatsApp ordering, and event catering enquiries can work together—with sample West
                African dishes ready for full customization.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href={RESTAURANT_INFO.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-white text-sm font-medium transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Get Directions</span>
                </a>
                <a
                  href={RESTAURANT_INFO.phoneTel}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#5A0B1E]/20 text-sm font-medium text-[#5A0B1E] hover:bg-[#F4EFE8] transition-colors tabular-nums"
                >
                  <Phone className="w-4 h-4" />
                  <span>{RESTAURANT_INFO.phoneDisplay}</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="aspect-[4/3] lg:h-full rounded-xl overflow-hidden bg-[#F4EFE8] border border-[#5A0B1E]/10">
                <DishImage
                  src={RESTAURANT_IMAGES.culinaryPrep}
                  alt="Pot of Nigerian Egusi Soup"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Culinary Highlights */}
      <section className="py-16 sm:py-24 bg-[#F4EFE8]/75 border-y border-[#5A0B1E]/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#EBE3D5]">
                  <DishImage
                    src="/src/assets/images/dish_black_soup.jpg"
                    alt="Traditional dark Edo Black Soup served with swallow"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#EBE3D5]">
                  <DishImage
                    src="/src/assets/images/dish_beans_plantain.jpg"
                    alt="Nigerian stewed beans and fried ripe plantain"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="col-span-2 aspect-[16/9] rounded-xl overflow-hidden bg-[#EBE3D5]">
                  <DishImage
                    src="/src/assets/images/dish_jollof_chicken.jpg"
                    alt="Nigerian Jollof Rice served with fried chicken"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col justify-center space-y-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#B91C1C]">
                  Our Menu Focus
                </p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917]">
                  Two Pillars of Our Kitchen
                </h2>
                <p className="mt-4 text-base text-[#57534E] leading-relaxed">
                  Our demonstration catalog illustrates two classic pillars of West African
                  dining—ready to be tailored to Yomat Kitchen&apos;s official daily menu.
                </p>
              </div>

              <div className="space-y-6 pt-6 border-t border-[#1C1917]/10">
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#1C1917]">
                    Main Dishes &amp; Meals
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-[#57534E] leading-relaxed">
                    Sample West African rice dishes, spaghetti, beans &amp; plantain, and sides
                    showcasing quick lunches, campus meals, and hearty dinners.
                  </p>
                </div>

                <div>
                  <h3 className="font-display text-xl font-semibold text-[#1C1917]">
                    Traditional Soups &amp; Swallow
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-[#57534E] leading-relaxed">
                    Preview pairings of smooth swallows alongside rich traditional soups for
                    authentic West African comfort.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/menu"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-[#FAF7F2] text-sm font-medium transition-colors"
                >
                  <span>Explore Our Menu</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message Us on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
