export interface ObservedPriceReference {
  restaurant: string;
  location: string;
  observedItem: string;
  observedRange: string;
  sourceUrl: string;
  researchDate: string;
}

export interface DishPricingProposal {
  mealId: string;
  mealName: string;
  category: 'Main Dishes & Meals' | 'Soups & Swallow';
  observedReferences: ObservedPriceReference[];
  marketBaselineSummary: string;
  recommendedPriceNaira: number;
  pricingRationale: string;
  isEstimatedRecommendation: true;
  researchDate: string;
}

export const RESEARCH_DATE = '2026-11-22';

export const DISH_PRICING_PROPOSALS: DishPricingProposal[] = [
  {
    mealId: 'jollof-rice-and-chicken',
    mealName: 'Jollof Rice & Chicken',
    category: 'Main Dishes & Meals',
    observedReferences: [
      {
        restaurant: 'Zain & Best Restaurant',
        location: 'Benin City (Airport / Irhirhi Rd)',
        observedItem: 'Combo Jollof Rice',
        observedRange: '₦2,500',
        sourceUrl: 'https://zainandbestfoods.com',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Micke & Micke Kitchen',
        location: 'Benin City (BIU Rd)',
        observedItem: 'Jollof Rice with fried chicken & plantain',
        observedRange: '₦4,500',
        sourceUrl: 'https://mickeandmickekitchen.com',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Bikass Food',
        location: 'Benin City',
        observedItem: 'Jollof Rice (base) + UNIBEN/Ugbowo chicken combo range',
        observedRange: '₦2,000 (base) / ₦3,000–₦4,500 (with chicken)',
        sourceUrl: 'https://bikassfood.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦2,000–₦2,500 (rice) up to ₦4,500 (with chicken)',
    recommendedPriceNaira: 3500,
    pricingRationale:
      'Estimated Ugbowo/UNIBEN student-friendly combo rate balancing a full jollof portion with seasoned chicken, positioned below ₦4,500 premium combos.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'fried-rice-and-beef',
    mealName: 'Fried Rice & Beef',
    category: 'Main Dishes & Meals',
    observedReferences: [
      {
        restaurant: 'Zain & Best Restaurant',
        location: 'Benin City',
        observedItem: 'Fried Rice',
        observedRange: '₦2,800',
        sourceUrl: 'https://zainandbestfoods.com',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Bikass Food',
        location: 'Benin City',
        observedItem: 'Fried Rice (base)',
        observedRange: '₦1,800',
        sourceUrl: 'https://bikassfood.com',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Micke & Micke Kitchen',
        location: 'Benin City',
        observedItem: 'Extra Beef portion reference',
        observedRange: '₦2,000 (protein add-on)',
        sourceUrl: 'https://mickeandmickekitchen.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦1,800–₦2,800 (rice) + ₦1,000–₦2,000 (beef)',
    recommendedPriceNaira: 3300,
    pricingRationale:
      'Estimated combo price reflecting fried rice preparation ingredients plus seasoned beef, kept affordable for everyday Ugbowo diners.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'spaghetti',
    mealName: 'Spaghetti',
    category: 'Main Dishes & Meals',
    observedReferences: [
      {
        restaurant: 'Bikass Food',
        location: 'Benin City',
        observedItem: 'Chicken Spaghetti',
        observedRange: '₦1,500',
        sourceUrl: 'https://bikassfood.com',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Home & Away Foods',
        location: 'Benin City (Ugbowo / Uselu tier)',
        observedItem: 'Spaghetti / everyday main plate',
        observedRange: '₦2,500–₦3,500',
        sourceUrl: 'https://homeandawayfoods.com',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Micke & Micke Kitchen',
        location: 'Benin City',
        observedItem: 'Spaghetti Jollof with Chicken',
        observedRange: '₦4,000',
        sourceUrl: 'https://mickeandmickekitchen.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦1,500–₦2,500 (standard), ₦4,000 (premium combo)',
    recommendedPriceNaira: 2200,
    pricingRationale:
      'Estimated everyday student-friendly portion price starting above ₦2,000 for seasoned Nigerian tomato-pepper spaghetti.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'beans-and-plantain',
    mealName: 'Beans & Plantain',
    category: 'Main Dishes & Meals',
    observedReferences: [
      {
        restaurant: 'Bikass Food',
        location: 'Benin City',
        observedItem: 'Beans',
        observedRange: '₦1,200',
        sourceUrl: 'https://bikassfood.com',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Home & Away Foods',
        location: 'Benin City',
        observedItem: 'Porridge / Fried Beans',
        observedRange: '₦1,750–₦3,000',
        sourceUrl: 'https://homeandawayfoods.com',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Spoons / Micke & Micke',
        location: 'Benin City',
        observedItem: 'Fried Plantain side pairing',
        observedRange: '₦1,000–₦1,500',
        sourceUrl: 'https://spoonsng.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City combined beans + plantain estimate: ~₦2,500',
    recommendedPriceNaira: 2500,
    pricingRationale:
      'Estimated combined meal pricing accounting for both stewed beans and sweet fried plantain at UNIBEN/Ugbowo market rates.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'dodo',
    mealName: 'Dodo',
    category: 'Main Dishes & Meals',
    observedReferences: [
      {
        restaurant: 'Spoons Benin City',
        location: 'Benin City',
        observedItem: 'Fried Plantain (Portion)',
        observedRange: '₦1,000–₦1,500',
        sourceUrl: 'https://spoonsng.com',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Micke & Micke Kitchen',
        location: 'Benin City',
        observedItem: 'Plantain side portion',
        observedRange: '₦1,500',
        sourceUrl: 'https://mickeandmickekitchen.com',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Zain & Best Restaurant',
        location: 'Benin City',
        observedItem: 'Full Boiled Plantain dish',
        observedRange: '₦2,000',
        sourceUrl: 'https://zainandbestfoods.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦1,000–₦1,500 (side) up to ₦2,000 (full portion)',
    recommendedPriceNaira: 1500,
    pricingRationale:
      'Estimated side/snack portion price matching local Benin City plantain side menus without overpricing students.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'santana',
    mealName: 'Santana',
    category: 'Main Dishes & Meals',
    observedReferences: [
      {
        restaurant: 'Harvest Table Restaurant',
        location: 'Benin City',
        observedItem: 'Swallow wraps (Fufu / Eba / Starch tier)',
        observedRange: '₦1,000–₦1,500',
        sourceUrl: 'https://harvesttablerestaurant.com.ng',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Home & Away Foods',
        location: 'Benin City',
        observedItem: 'Traditional Swallow wrap range',
        observedRange: '₦1,000–₦2,000',
        sourceUrl: 'https://homeandawayfoods.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City swallow wrap range: ₦1,000–₦2,000',
    recommendedPriceNaira: 1200,
    pricingRationale:
      'Estimated per-wrap price for fermented cassava fufu (Santana), typically slightly lower than packaged wheat semolina.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'semovita',
    mealName: 'Semovita',
    category: 'Soups & Swallow',
    observedReferences: [
      {
        restaurant: 'Harvest Table Restaurant',
        location: 'Benin City',
        observedItem: 'Semovita wrap',
        observedRange: '₦1,000–₦1,500',
        sourceUrl: 'https://harvesttablerestaurant.com.ng',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Spoons Benin City',
        location: 'Benin City',
        observedItem: 'Semovita / swallow serving',
        observedRange: '₦1,500–₦2,000',
        sourceUrl: 'https://spoonsng.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦1,000–₦2,000 per wrap',
    recommendedPriceNaira: 1500,
    pricingRationale:
      'Estimated per-serving price reflecting refined wheat semolina cost while keeping soup+swallow meals around ₦3,500–₦4,000 total.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'egusi-soup',
    mealName: 'Egusi Soup',
    category: 'Soups & Swallow',
    observedReferences: [
      {
        restaurant: 'Harvest Table Restaurant',
        location: 'Benin City',
        observedItem: 'Egusi Soup (standard plate)',
        observedRange: '₦2,000–₦2,500',
        sourceUrl: 'https://harvesttablerestaurant.com.ng',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Micke & Micke Kitchen',
        location: 'Benin City',
        observedItem: 'Pounded Yam & Egusi combo',
        observedRange: '₦5,000 (combo)',
        sourceUrl: 'https://mickeandmickekitchen.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City standalone plate range: ₦2,000–₦2,500',
    recommendedPriceNaira: 2500,
    pricingRationale:
      'Estimated standard Egusi plate pricing reflecting melon seed, palm oil, and vegetable costs in Benin City.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'black-soup',
    mealName: 'Black Soup',
    category: 'Soups & Swallow',
    observedReferences: [
      {
        restaurant: 'Zain & Best Restaurant',
        location: 'Benin City',
        observedItem: 'Black Soup (Omoebe)',
        observedRange: '₦1,500',
        sourceUrl: 'https://zainandbestfoods.com',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Bikass Food & Home & Away',
        location: 'Benin City',
        observedItem: 'Black Soup plate',
        observedRange: '₦1,200–₦2,500',
        sourceUrl: 'https://bikassfood.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦1,200–₦2,500 per plate',
    recommendedPriceNaira: 2300,
    pricingRationale:
      'Estimated Edo traditional soup portion rate accounting for fresh ground leaves and seasoning in Ugbowo.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'ogbono-soup',
    mealName: 'Ogbono Soup',
    category: 'Soups & Swallow',
    observedReferences: [
      {
        restaurant: 'Harvest Table Restaurant',
        location: 'Benin City',
        observedItem: 'Ogbono Soup plate',
        observedRange: '₦2,000–₦2,700',
        sourceUrl: 'https://harvesttablerestaurant.com.ng',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Bikass Food & Home & Away',
        location: 'Benin City',
        observedItem: 'Ogbono Soup base plate',
        observedRange: '₦1,200–₦2,700',
        sourceUrl: 'https://bikassfood.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦1,200–₦2,700 per plate',
    recommendedPriceNaira: 2400,
    pricingRationale:
      'Estimated Ogbono draw soup rate accounting for ground ogbono seed costs while keeping Ugbowo soup+swallow meals competitive.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
];
