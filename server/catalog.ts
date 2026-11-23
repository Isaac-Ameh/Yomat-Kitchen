export interface ServerMealInfo {
  id: string;
  name: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  prepStyle: string;
  priceNaira: number;
  priceConfirmed: boolean;
  image: string;
  imageAlt: string;
  isAvailable: boolean;
  isFeatured: boolean;
}

export const INITIAL_SERVER_MEALS: ServerMealInfo[] = [
  {
    id: 'jollof-rice-and-chicken',
    name: 'Jollof Rice & Chicken',
    category: 'Rice Dishes',
    shortDescription:
      'Fragrant Nigerian party-style jollof rice simmered in rich tomato-pepper sauce and served with seasoned chicken.',
    fullDescription:
      'Our signature Nigerian Jollof Rice slow-cooked in spiced tomato and pepper base, served hot alongside crispy, well-seasoned fried chicken. A popular everyday favourite around UNIBEN and Uselu.',
    prepStyle: 'Signature Rice Dish',
    priceNaira: 2500,
    priceConfirmed: true,
    image: '/src/assets/images/dish_jollof_chicken.jpg',
    imageAlt: 'Plate of Nigerian Jollof Rice served with seasoned fried chicken',
    isAvailable: true,
    isFeatured: true,
  },
  {
    id: 'beans-and-fried-plantain',
    name: 'Beans & Fried Plantain',
    category: 'Other Specials',
    shortDescription:
      'Hearty palm-oil stewed Nigerian honey beans paired with sweet golden fried ripe plantain slices.',
    fullDescription:
      'Tender honey beans slow-cooked in a savoury palm-oil pepper sauce, topped with caramelized fried ripe plantain (dodo). Filling, nutritious, and comforting for lunch or dinner.',
    prepStyle: 'Traditional Comfort Meal',
    priceNaira: 1800,
    priceConfirmed: true,
    image: '/src/assets/images/dish_beans_fried_plantain.jpg',
    imageAlt: 'Plate of Nigerian stewed beans served with sliced golden fried ripe plantain',
    isAvailable: true,
    isFeatured: false,
  },
  {
    id: 'eba-and-afang',
    name: 'Eba & Afang Soup',
    category: 'Swallows & Soups',
    shortDescription:
      'Smooth garri swallow paired with rich Afang vegetable soup cooked with prawns and assorted meats.',
    fullDescription:
      'Freshly prepared Nigerian Afang soup made with finely shredded afang and waterleaf vegetables, palm oil, and rich seafood and meat proteins, served with warm smooth Eba.',
    prepStyle: 'Traditional Swallow & Soup',
    priceNaira: 3300,
    priceConfirmed: true,
    image: '/src/assets/images/dish_eba_afang.jpg',
    imageAlt: 'Nigerian Afang Soup garnished with prawns, stockfish, and leafy greens',
    isAvailable: true,
    isFeatured: true,
  },
  {
    id: 'eba-and-egusi',
    name: 'Eba & Egusi Soup',
    category: 'Swallows & Soups',
    shortDescription:
      'Warm yellow garri Eba served with rich, lumpy melon-seed Egusi soup and tender beef.',
    fullDescription:
      'Ground egusi (melon seed) soup cooked with palm oil, traditional spices, leafy greens, and seasoned beef, paired with freshly turned golden Eba.',
    prepStyle: 'Traditional Swallow & Soup',
    priceNaira: 2800,
    priceConfirmed: true,
    image: '/src/assets/images/dish_eba_egusi.jpg',
    imageAlt: 'Yellow Eba swallow served beside rich Nigerian Egusi soup and beef',
    isAvailable: true,
    isFeatured: true,
  },
  {
    id: 'fried-rice-and-chicken',
    name: 'Fried Rice & Chicken',
    category: 'Rice Dishes',
    shortDescription:
      'Colourful Nigerian fried rice stir-fried with sweet corn, carrots, and green peas alongside grilled chicken.',
    fullDescription:
      'Aromatic Nigerian-style fried rice seasoned in savoury stock with crisp mixed vegetables, plated with juicy spiced fried chicken.',
    prepStyle: 'Signature Rice Dish',
    priceNaira: 2700,
    priceConfirmed: true,
    image: '/src/assets/images/dish_fried_rice_chicken.jpg',
    imageAlt: 'Nigerian fried rice with sweet corn, carrots, green peas, and seasoned chicken thighs',
    isAvailable: true,
    isFeatured: true,
  },
  {
    id: 'eba-and-okra',
    name: 'Eba & Okra Soup',
    category: 'Swallows & Soups',
    shortDescription:
      'Freshly cooked spiced okra draw soup with red stew and assorted proteins served with smooth Eba.',
    fullDescription:
      'Delicious Nigerian okra soup simmered with chopped fresh okra, rich tomato-pepper stew, and tender meats, accompanied by warm garri Eba.',
    prepStyle: 'Traditional Swallow & Soup',
    priceNaira: 2900,
    priceConfirmed: true,
    image: '/src/assets/images/dish_eba_okra.jpg',
    imageAlt: 'Plate of smooth Eba served with spiced Nigerian okra soup and meat',
    isAvailable: true,
    isFeatured: false,
  },
  {
    id: 'rice-and-stew',
    name: 'Rice & Stew',
    category: 'Rice Dishes',
    shortDescription:
      'Steamed long-grain white rice cooked with mixed vegetables and served with rich Nigerian tomato beef stew.',
    fullDescription:
      'Fluffy white rice garnished with tender vegetables, topped with classic Nigerian peppered tomato stew and seasoned beef.',
    prepStyle: 'Classic Rice Dish',
    priceNaira: 1800,
    priceConfirmed: true,
    image: '/src/assets/images/dish_rice_and_stew.jpg',
    imageAlt: 'Steamed white rice with vegetables and rich Nigerian tomato beef stew',
    isAvailable: true,
    isFeatured: false,
  },
  {
    id: 'semo-and-ogbono',
    name: 'Semo & Ogbono Soup',
    category: 'Swallows & Soups',
    shortDescription:
      'Smooth wheat semovita wrap served with glossy Nigerian ogbono draw soup and leafy greens.',
    fullDescription:
      'Wild bush mango seed (ogbono) soup simmered to a smooth, nutty finish with vegetables and traditional spices, plated with rolled smooth Semovita.',
    prepStyle: 'Traditional Swallow & Soup',
    priceNaira: 2900,
    priceConfirmed: true,
    image: '/src/assets/images/dish_semo_ogbono.jpg',
    imageAlt: 'Rolled smooth Semovita swallow paired with a bowl of Nigerian Ogbono soup',
    isAvailable: true,
    isFeatured: false,
  },
  {
    id: 'yam-porridge',
    name: 'Yam Porridge',
    category: 'Other Specials',
    shortDescription:
      'Creamy Nigerian Asaro (yam porridge) simmered in rich palm-oil pepper sauce with tender meat.',
    fullDescription:
      'Chunks of white yam slow-boiled in seasoned tomato, pepper, and palm-oil broth until thick and creamy, served with flavourful beef.',
    prepStyle: 'Traditional Comfort Meal',
    priceNaira: 2200,
    priceConfirmed: true,
    image: '/src/assets/images/dish_yam_porridge.jpg',
    imageAlt: 'Bowl of rich Nigerian yam porridge (Asaro) topped with tender spiced meat',
    isAvailable: true,
    isFeatured: false,
  },
  {
    id: 'white-rice-stew-and-chicken',
    name: 'White Rice, Stew & Chicken',
    category: 'Rice Dishes',
    shortDescription:
      'Fluffy white rice served with rich Nigerian tomato-pepper stew and golden fried chicken.',
    fullDescription:
      'Classic long-grain white rice paired with slow-simmered red tomato stew and generous pieces of seasoned fried chicken.',
    prepStyle: 'Classic Rice Dish',
    priceNaira: 2300,
    priceConfirmed: true,
    image: '/src/assets/images/dish_white_rice_stew_chicken.jpg',
    imageAlt: 'Plate of steamed white rice with Nigerian red tomato stew and fried chicken',
    isAvailable: true,
    isFeatured: true,
  },
  {
    id: 'pounded-yam-and-egusi',
    name: 'Pounded Yam & Egusi',
    category: 'Swallows & Soups',
    shortDescription:
      'Smooth pounded yam served with rich Nigerian melon-seed Egusi soup, chicken, and assorted meats.',
    fullDescription:
      'Traditional hand-pounded yam swallow served alongside hearty Egusi soup loaded with leafy greens, ponmo, assorted meats, and seasoned chicken.',
    prepStyle: 'Signature Swallow & Soup',
    priceNaira: 3200,
    priceConfirmed: true,
    image: '/src/assets/images/dish_pounded_yam_egusi.jpg',
    imageAlt: 'Smooth pounded yam in a bowl of Nigerian Egusi soup with chicken and assorted meats',
    isAvailable: true,
    isFeatured: true,
  },
  {
    id: 'fufu-and-ofe-nsala',
    name: 'Fufu & Ofe Nsala',
    category: 'Swallows & Soups',
    shortDescription:
      'Smooth cassava fufu served with aromatic Ofe Nsala (white soup) cooked with spices and tender chicken.',
    fullDescription:
      'Delicate Eastern Nigerian Ofe Nsala prepared without palm oil using traditional spices, utazi leaves, and chicken, paired with smooth cassava fufu.',
    prepStyle: 'Traditional Swallow & Soup',
    priceNaira: 3400,
    priceConfirmed: true,
    image: '/src/assets/images/dish_fufu_ofe_nsala.jpg',
    imageAlt: 'Smooth cassava fufu wraps served beside a bowl of spiced Nigerian Ofe Nsala soup with chicken',
    isAvailable: true,
    isFeatured: false,
  },
  {
    id: 'rice-and-beans-with-plantain',
    name: 'Rice & Beans with Plantain',
    category: 'Other Specials',
    shortDescription:
      'Hearty plate of white rice and stewed brown beans served with red stew, fried plantain, and fresh salad.',
    fullDescription:
      'A satisfying Nigerian everyday combo bringing together steamed rice, well-cooked brown beans, savoury peppered stew, sweet fried plantain, and crisp garden salad.',
    prepStyle: 'Combo Special',
    priceNaira: 2000,
    priceConfirmed: true,
    image: '/src/assets/images/dish_rice_beans_plantain.jpg',
    imageAlt: 'Plate of Nigerian rice and brown beans with tomato stew, fried plantain, and salad',
    isAvailable: true,
    isFeatured: false,
  },
];

// Live runtime catalog (pre-seeded with verified priced dishes; synced dynamically with Supabase)
export const liveMealCatalog = new Map<string, ServerMealInfo>(
  INITIAL_SERVER_MEALS.map((meal) => [meal.id, { ...meal }])
);

export const SERVER_MEAL_CATALOG: Record<string, ServerMealInfo> = Object.fromEntries(
  INITIAL_SERVER_MEALS.map((m) => [m.id, m])
);

export function getCatalogMeal(mealId: string): ServerMealInfo | undefined {
  return liveMealCatalog.get(mealId);
}

export function isKnownCatalogMeal(mealId: string): boolean {
  return liveMealCatalog.has(mealId);
}
