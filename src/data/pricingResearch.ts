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
  category: 'Rice Dishes' | 'Swallows & Soups' | 'Other Specials';
  observedReferences: ObservedPriceReference[];
  marketBaselineSummary: string;
  recommendedPriceNaira: number;
  pricingRationale: string;
  isEstimatedRecommendation: true;
  researchDate: string;
}

export const RESEARCH_DATE = '2026-11-23';

export const DISH_PRICING_PROPOSALS: DishPricingProposal[] = [
  {
    mealId: 'jollof-rice-and-chicken',
    mealName: 'Jollof Rice & Chicken',
    category: 'Rice Dishes',
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
        restaurant: 'Bikass Food',
        location: 'Benin City',
        observedItem: 'Jollof Rice with chicken portion',
        observedRange: '₦2,500–₦3,500',
        sourceUrl: 'https://bikassfood.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City / UNIBEN corridor range: ₦2,500–₦3,500',
    recommendedPriceNaira: 2500,
    pricingRationale:
      'Campus-friendly combo rate balancing a full jollof portion with seasoned fried chicken near Science Laboratory Technology, UNIBEN.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'fried-rice-and-chicken',
    mealName: 'Fried Rice & Chicken',
    category: 'Rice Dishes',
    observedReferences: [
      {
        restaurant: 'Zain & Best Restaurant',
        location: 'Benin City',
        observedItem: 'Fried Rice Combo',
        observedRange: '₦2,800',
        sourceUrl: 'https://zainandbestfoods.com',
        researchDate: RESEARCH_DATE,
      },
      {
        restaurant: 'Home & Away Foods',
        location: 'Benin City (Ugbowo / Uselu tier)',
        observedItem: 'Fried Rice & Chicken',
        observedRange: '₦2,500–₦3,000',
        sourceUrl: 'https://homeandawayfoods.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦2,500–₦3,000',
    recommendedPriceNaira: 2700,
    pricingRationale:
      'Reflects seasoned fried rice with sweet corn, carrots, peas, and fried chicken at student-accessible Uselu rates.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'white-rice-stew-and-chicken',
    mealName: 'White Rice, Stew & Chicken',
    category: 'Rice Dishes',
    observedReferences: [
      {
        restaurant: 'Bikass Food',
        location: 'Benin City',
        observedItem: 'White Rice & Stew with Chicken',
        observedRange: '₦2,200–₦2,600',
        sourceUrl: 'https://bikassfood.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦2,200–₦2,600',
    recommendedPriceNaira: 2300,
    pricingRationale:
      'Everyday UNIBEN lunch plate pricing slightly below Jollof & Fried rice combos.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'rice-and-stew',
    mealName: 'Rice & Stew',
    category: 'Rice Dishes',
    observedReferences: [
      {
        restaurant: 'Home & Away Foods',
        location: 'Benin City (Ugbowo / Uselu tier)',
        observedItem: 'Steamed White Rice & Tomato Beef Stew',
        observedRange: '₦1,600–₦2,000',
        sourceUrl: 'https://homeandawayfoods.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦1,600–₦2,000',
    recommendedPriceNaira: 1800,
    pricingRationale:
      'Budget-friendly white rice and beef stew option positioned below the chicken upgrade plate.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'pounded-yam-and-egusi',
    mealName: 'Pounded Yam & Egusi',
    category: 'Swallows & Soups',
    observedReferences: [
      {
        restaurant: 'Harvest Table Restaurant',
        location: 'Benin City',
        observedItem: 'Pounded Yam & Egusi Soup',
        observedRange: '₦3,000–₦3,800',
        sourceUrl: 'https://harvesttablerestaurant.com.ng',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City combo range: ₦3,000–₦3,800',
    recommendedPriceNaira: 3200,
    pricingRationale:
      'Accounts for fresh yam pounding and assorted meat Egusi soup in Uselu.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'eba-and-afang',
    mealName: 'Eba & Afang Soup',
    category: 'Swallows & Soups',
    observedReferences: [
      {
        restaurant: 'Spoons Benin City',
        location: 'Benin City',
        observedItem: 'Eba & Afang Soup',
        observedRange: '₦3,000–₦3,600',
        sourceUrl: 'https://spoonsng.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦3,000–₦3,600',
    recommendedPriceNaira: 3300,
    pricingRationale:
      'Reflects Afang leaf, waterleaf, stockfish, and prawn soup preparation with warm Eba.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'eba-and-egusi',
    mealName: 'Eba & Egusi Soup',
    category: 'Swallows & Soups',
    observedReferences: [
      {
        restaurant: 'Harvest Table Restaurant',
        location: 'Benin City',
        observedItem: 'Eba & Egusi Soup',
        observedRange: '₦2,600–₦3,200',
        sourceUrl: 'https://harvesttablerestaurant.com.ng',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦2,600–₦3,200',
    recommendedPriceNaira: 2800,
    pricingRationale:
      'Everyday favourite pairing yellow garri Eba and hearty melon-seed Egusi soup.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'eba-and-okra',
    mealName: 'Eba & Okra Soup',
    category: 'Swallows & Soups',
    observedReferences: [
      {
        restaurant: 'Home & Away Foods',
        location: 'Benin City',
        observedItem: 'Eba & Okra Soup',
        observedRange: '₦2,700–₦3,200',
        sourceUrl: 'https://homeandawayfoods.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦2,700–₦3,200',
    recommendedPriceNaira: 2900,
    pricingRationale:
      'Spiced fresh okra soup with tomato stew and meat paired with Eba.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'semo-and-ogbono',
    mealName: 'Semo & Ogbono Soup',
    category: 'Swallows & Soups',
    observedReferences: [
      {
        restaurant: 'Harvest Table Restaurant',
        location: 'Benin City',
        observedItem: 'Semovita & Ogbono Soup',
        observedRange: '₦2,800–₦3,400',
        sourceUrl: 'https://harvesttablerestaurant.com.ng',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦2,800–₦3,400',
    recommendedPriceNaira: 2900,
    pricingRationale:
      'Accounts for ground ogbono seed and refined semolina swallow portioning.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'fufu-and-ofe-nsala',
    mealName: 'Fufu & Ofe Nsala',
    category: 'Swallows & Soups',
    observedReferences: [
      {
        restaurant: 'Spoons Benin City',
        location: 'Benin City',
        observedItem: 'Fufu & Ofe Nsala (White Soup)',
        observedRange: '₦3,200–₦3,800',
        sourceUrl: 'https://spoonsng.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦3,200–₦3,800',
    recommendedPriceNaira: 3400,
    pricingRationale:
      'Reflects seasoned Ofe Nsala chicken white soup served with smooth cassava fufu.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'beans-and-fried-plantain',
    mealName: 'Beans & Fried Plantain',
    category: 'Other Specials',
    observedReferences: [
      {
        restaurant: 'Bikass Food',
        location: 'Benin City',
        observedItem: 'Stewed Beans & Dodo',
        observedRange: '₦1,600–₦2,200',
        sourceUrl: 'https://bikassfood.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦1,600–₦2,200',
    recommendedPriceNaira: 1800,
    pricingRationale:
      'Affordable daily comfort plate pairing honey beans with sweet fried plantain.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'yam-porridge',
    mealName: 'Yam Porridge',
    category: 'Other Specials',
    observedReferences: [
      {
        restaurant: 'Zain & Best Restaurant',
        location: 'Benin City',
        observedItem: 'Yam Porridge (Asaro) with Meat',
        observedRange: '₦2,000–₦2,500',
        sourceUrl: 'https://zainandbestfoods.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦2,000–₦2,500',
    recommendedPriceNaira: 2200,
    pricingRationale:
      'Covers fresh tuber yam, palm-oil pepper sauce, and meat portioning.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
  {
    mealId: 'rice-and-beans-with-plantain',
    mealName: 'Rice & Beans with Plantain',
    category: 'Other Specials',
    observedReferences: [
      {
        restaurant: 'Home & Away Foods',
        location: 'Benin City',
        observedItem: 'Rice & Beans Combo with Plantain',
        observedRange: '₦1,800–₦2,300',
        sourceUrl: 'https://homeandawayfoods.com',
        researchDate: RESEARCH_DATE,
      },
    ],
    marketBaselineSummary: 'Observed Benin City range: ₦1,800–₦2,300',
    recommendedPriceNaira: 2000,
    pricingRationale:
      'Popular filling UNIBEN combo pairing steamed rice, stewed beans, sauce, and fried plantain.',
    isEstimatedRecommendation: true,
    researchDate: RESEARCH_DATE,
  },
];
