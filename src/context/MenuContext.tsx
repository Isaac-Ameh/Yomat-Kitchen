import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Meal, WebsiteSettings } from '../types/menu';
import { DEFAULT_WEBSITE_SETTINGS, MEALS } from '../data/meals';

interface MenuContextValue {
  meals: Meal[];
  categories: string[];
  siteSettings: WebsiteSettings;
  isLoading: boolean;
  refreshMenuAndSettings: () => Promise<void>;
}

const DEFAULT_CATEGORIES = ['Rice Dishes', 'Swallows & Soups', 'Other Specials'];
const MenuContext = createContext<MenuContextValue | undefined>(undefined);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [meals, setMeals] = useState<Meal[]>(MEALS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [siteSettings, setSiteSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMenuAndSettings = useCallback(async () => {
    try {
      const [menuRes, settingsRes] = await Promise.all([
        fetch('/api/menu', { credentials: 'same-origin' }),
        fetch('/api/site-settings', { credentials: 'same-origin' }),
      ]);

      if (menuRes.ok) {
        const menuData = (await menuRes.json()) as {
          meals?: Meal[];
          categories?: Array<{ name?: string } | string>;
        };
        if (Array.isArray(menuData.meals) && menuData.meals.length > 0) {
          setMeals(menuData.meals);
        }
        if (Array.isArray(menuData.categories) && menuData.categories.length > 0) {
          const names = menuData.categories
            .map((c) => (typeof c === 'string' ? c : c?.name || ''))
            .filter(Boolean);
          if (names.length > 0) {
            setCategories(names);
          }
        }
      }

      if (settingsRes.ok) {
        const settingsData = (await settingsRes.json()) as { settings?: Partial<WebsiteSettings> };
        if (settingsData.settings) {
          setSiteSettings((prev) => ({ ...prev, ...settingsData.settings }));
        }
      }
    } catch {
      // Retain baseline MEALS and DEFAULT_WEBSITE_SETTINGS on transient errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMenuAndSettings();
  }, [refreshMenuAndSettings]);

  return (
    <MenuContext.Provider
      value={{ meals, categories, siteSettings, isLoading, refreshMenuAndSettings }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return ctx;
}
