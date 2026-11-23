export type MealCategory = string;

export interface Meal {
  id: string;
  name: string;
  category: MealCategory;
  shortDescription: string;
  fullDescription: string;
  prepStyle: string;
  price: number | null; // Confirmed price in Nigerian Naira (NGN), or null when contact-for-price applies
  image: string;
  imageAlt: string;
  featured?: boolean;
  isAvailable?: boolean;
}

export interface CartItem {
  meal: Meal;
  quantity: number;
}

export interface WebsiteSettings {
  restaurantName: string;
  currency: string;
  isOpen: boolean;
  address: string;
  phone: string;
  email: string;
  openingHours: string;
  heroSubtitle: string;
  heroDescription: string;
  welcomeHeading: string;
  welcomeBody: string;
  menuNotice: string;
}

