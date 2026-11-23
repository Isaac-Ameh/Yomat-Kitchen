export interface ServerMealInfo {
  id: string;
  name: string;
  category: 'Main Dishes & Meals' | 'Soups & Swallow';
  shortDescription: string;
  fullDescription: string;
  prepStyle: string;
  priceNaira: number; // 0 = Unconfirmed / Contact for Price; >0 = Confirmed & Approved Price in NGN
  priceConfirmed: boolean;
  image: string;
  imageAlt: string;
  isAvailable: boolean;
  isFeatured: boolean;
}

export const INITIAL_SERVER_MEALS: ServerMealInfo[] = [
  {
    id: 'spaghetti',
    name: 'Spaghetti',
    category: 'Main Dishes & Meals',
    shortDescription:
      'Nigerian-style seasoned spaghetti cooked in savoury tomato and pepper sauce, ideal for lunch or dinner.',
    fullDescription:
      'A popular everyday Nigerian meal made with tender spaghetti tossed in a well-seasoned tomato and pepper sauce. A filling, convenient choice for students and residents around Ugbowo.',
    prepStyle: 'Main Dish',
    priceNaira: 0,
    priceConfirmed: false,
    image: '/src/assets/images/dish_spaghetti.jpg',
    imageAlt: 'Plate of Nigerian-style spaghetti topped with rich tomato pepper sauce and meat',
    isAvailable: true,
    isFeatured: false,
  },
  {
    id: 'beans-and-plantain',
    name: 'Beans & Plantain',
    category: 'Main Dishes & Meals',
    shortDescription:
      'Hearty Nigerian stewed beans paired with sweet golden fried ripe plantain slices.',
    fullDescription:
      'A classic Nigerian comfort pairing combining rich, tender stewed beans with sweet caramelized fried plantain. Satisfying on its own or paired with your choice of protein.',
    prepStyle: 'Main Dish',
    priceNaira: 0,
    priceConfirmed: false,
    image: '/src/assets/images/dish_beans_plantain.jpg',
    imageAlt: 'Nigerian stewed beans served with sliced golden fried plantain and beef',
    isAvailable: true,
    isFeatured: false,
  },
  {
    id: 'dodo',
    name: 'Dodo',
    category: 'Main Dishes & Meals',
    shortDescription:
      'Sweet, golden-brown fried ripe plantain slices—enjoyed as a snack, side, or meal addition.',
    fullDescription:
      'Freshly fried ripe plantain slices with lightly caramelized edges and a soft, sweet centre. A versatile Nigerian favourite that pairs naturally with rice, beans, or spaghetti.',
    prepStyle: 'Side / Main Addition',
    priceNaira: 0,
    priceConfirmed: false,
    image: '/src/assets/images/dish_dodo.jpg',
    imageAlt: 'Golden fried ripe plantain slices (Dodo)',
    isAvailable: true,
    isFeatured: false,
  },
  {
    id: 'jollof-rice-and-chicken',
    name: 'Jollof Rice & Chicken',
    category: 'Main Dishes & Meals',
    shortDescription:
      'Fragrant Nigerian jollof rice simmered in rich tomato-pepper sauce and served with seasoned chicken.',
    fullDescription:
      'Nigeria’s signature celebration and everyday favourite. Parboiled rice cooked in rich tomato and pepper seasoning for vibrant colour and flavour, served alongside well-seasoned chicken.',
    prepStyle: 'Signature Rice Dish',
    priceNaira: 0,
    priceConfirmed: false,
    image: '/src/assets/images/dish_jollof_chicken.jpg',
    imageAlt: 'Plate of Nigerian Jollof Rice served with fried chicken',
    isAvailable: true,
    isFeatured: true,
  },
  {
    id: 'fried-rice-and-beef',
    name: 'Fried Rice & Beef',
    category: 'Main Dishes & Meals',
    shortDescription:
      'Colourful Nigerian fried rice stir-fried with savoury spices and served with tender seasoned beef.',
    fullDescription:
      'Seasoned Nigerian-style fried rice prepared with mixed vegetables and aromatic spices, plated with tender, flavourful beef. A favourite choice for lunch, dinner, and takeaways in Ugbowo.',
    prepStyle: 'Signature Rice Dish',
    priceNaira: 0,
    priceConfirmed: false,
    image: '/src/assets/images/dish_fried_rice_beef.jpg',
    imageAlt: 'Nigerian Fried Rice served with seasoned beef and fried plantain',
    isAvailable: true,
    isFeatured: true,
  },
  {
    id: 'santana',
    name: 'Santana',
    category: 'Main Dishes & Meals',
    shortDescription:
      'Traditional Nigerian fermented cassava fufu swallow (also called Santan or Akpu), smooth and filling.',
    fullDescription:
      'Known locally across Nigeria as Santana, Santan, or Akpu, this traditional fermented cassava swallow is pounded smooth and soft. Ideal for pairing with Egusi Soup, Black Soup, or Ogbono Soup.',
    prepStyle: 'Traditional Cassava Swallow',
    priceNaira: 0,
    priceConfirmed: false,
    image: '/src/assets/images/dish_santana.jpg',
    imageAlt: 'Smooth white fermented cassava fufu swallow (Santana / Akpu) served on a plate',
    isAvailable: true,
    isFeatured: true,
  },
  {
    id: 'semovita',
    name: 'Semovita',
    category: 'Soups & Swallow',
    shortDescription:
      'Smooth, warm wheat semolina swallow prepared to pair cleanly with rich Nigerian soups.',
    fullDescription:
      'A popular Nigerian swallow made from refined wheat semolina turned smooth and soft. Pairs effortlessly with Egusi Soup, Black Soup, or Ogbono Soup for a deeply satisfying meal.',
    prepStyle: 'Traditional Swallow',
    priceNaira: 0,
    priceConfirmed: false,
    image: '/src/assets/images/dish_semovita.jpg',
    imageAlt: 'Smooth Semovita swallow plated alongside Nigerian soup',
    isAvailable: true,
    isFeatured: false,
  },
  {
    id: 'egusi-soup',
    name: 'Egusi Soup',
    category: 'Soups & Swallow',
    shortDescription:
      'Rich Nigerian melon-seed soup simmered with leafy vegetables and traditional seasoning.',
    fullDescription:
      'A staple across Nigerian homes and restaurants, Egusi Soup is prepared from ground melon seeds cooked with palm oil, traditional seasonings, and green vegetables. Delicious alongside Semovita or Santana.',
    prepStyle: 'Traditional Nigerian Soup',
    priceNaira: 0,
    priceConfirmed: false,
    image: '/src/assets/images/dish_egusi_soup.jpg',
    imageAlt: 'Nigerian Egusi Soup served with assorted meats and swallow',
    isAvailable: true,
    isFeatured: true,
  },
  {
    id: 'black-soup',
    name: 'Black Soup',
    category: 'Soups & Swallow',
    shortDescription:
      'Classic Edo-style dark herbal soup prized in Benin City for its rich, earthy aroma and flavour.',
    fullDescription:
      'A cherished delicacy of Edo State and Benin City (traditionally known as Omoebe), Black Soup gets its distinctive dark colour and aromatic depth from finely ground traditional leaves simmered into a hearty broth. Best enjoyed with Semovita or Santana.',
    prepStyle: 'Edo Traditional Soup',
    priceNaira: 0,
    priceConfirmed: false,
    image: '/src/assets/images/dish_black_soup.jpg',
    imageAlt: 'Traditional dark Nigerian Black Soup served in a ceramic bowl with swallow',
    isAvailable: true,
    isFeatured: true,
  },
  {
    id: 'ogbono-soup',
    name: 'Ogbono Soup',
    category: 'Soups & Swallow',
    shortDescription:
      'Classic Nigerian draw soup made with ground wild bush mango seeds for a smooth, rich finish.',
    fullDescription:
      'Prepared from finely ground ogbono (wild bush mango) seeds cooked gently into a glossy, nutty draw soup. A comforting classic across Benin City that pairs naturally with Semovita or Santana.',
    prepStyle: 'Traditional Draw Soup',
    priceNaira: 0,
    priceConfirmed: false,
    image: '/src/assets/images/dish_ogbono_soup.jpg',
    imageAlt: 'Bowl of Nigerian Ogbono Soup with assorted meats and leafy greens',
    isAvailable: true,
    isFeatured: true,
  },
];

// Live runtime catalog (defaults to unconfirmed 0 until Manager approves in Admin Portal or DB overrides)
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
