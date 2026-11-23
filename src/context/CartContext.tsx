import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem, Meal } from '../types/menu';
import { MEALS } from '../data/meals';
import { useAppAuth } from './AppAuthContext';
import { useMenu } from './MenuContext';
import { parseApiJson } from '../lib/api';

interface CartContextValue {
  items: CartItem[];
  isLoading: boolean;
  totalItems: number;
  subtotal: number;
  hasUnpricedItems: boolean;
  lastAddedMessage: string | null;
  addToCart: (meal: Meal, quantity?: number) => boolean;
  updateQuantity: (mealId: string, quantity: number) => void;
  removeFromCart: (mealId: string) => void;
  clearCart: () => void;
  dismissNotification: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

interface ServerCartEntry {
  mealId: string;
  quantity: number;
}

function hydrateCartItems(entries: ServerCartEntry[], catalog: Meal[]): CartItem[] {
  const hydrated: CartItem[] = [];
  for (const entry of entries) {
    const meal = catalog.find((m) => m.id === entry.mealId) || MEALS.find((m) => m.id === entry.mealId);
    if (meal && Number.isInteger(entry.quantity) && entry.quantity > 0) {
      hydrated.push({ meal, quantity: entry.quantity });
    }
  }
  return hydrated;
}

function getCartStorageKey(userId: string | null): string {
  return `yomat_kitchen_cart:${userId || 'guest'}`;
}

function readLocalCart(userId: string | null, catalog: Meal[]): CartItem[] {
  try {
    const raw = window.localStorage.getItem(getCartStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return hydrateCartItems(parsed, catalog);
  } catch {
    return [];
  }
}

function writeLocalCart(userId: string | null, cartItems: CartItem[]): void {
  try {
    const key = getCartStorageKey(userId);
    if (cartItems.length === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(
      key,
      JSON.stringify(
        cartItems.map((item) => ({
          mealId: item.meal.id,
          quantity: item.quantity,
        }))
      )
    );
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAppAuth();
  const { meals } = useMenu();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAddedMessage, setLastAddedMessage] = useState<string | null>(null);

  // Re-hydrate prices & metadata whenever live catalog updates (e.g. after Manager price approval)
  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        const fresh = meals.find((m) => m.id === item.meal.id);
        return fresh ? { ...item, meal: fresh } : item;
      })
    );
  }, [meals]);

  // Sync cart from protected /api/cart endpoint when signed in, or guest localStorage otherwise
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      setItems(readLocalCart(null, meals));
      setIsLoading(false);
      return;
    }

    const activeUserId = userId;
    const localBackup = readLocalCart(activeUserId, meals);
    const guestItems = readLocalCart(null, meals);
    const initialLocal = localBackup.length > 0 ? localBackup : guestItems;
    if (initialLocal.length > 0) {
      setItems(initialLocal);
      if (guestItems.length > 0 && localBackup.length === 0) {
        writeLocalCart(activeUserId, guestItems);
        writeLocalCart(null, []);
      }
    }

    let cancelled = false;
    async function loadServerCart() {
      setIsLoading(initialLocal.length === 0);
      try {
        const token = await getToken();
        if (!token) return;

        const res = await fetch('/api/cart', {
          credentials: 'same-origin',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const data = await parseApiJson<{ items?: ServerCartEntry[] }>(
          res,
          'Unable to load cart.'
        );
        if (cancelled || !Array.isArray(data.items)) return;

        if (data.items.length > 0) {
          const hydrated = hydrateCartItems(data.items, meals);
          setItems(hydrated);
          writeLocalCart(activeUserId, hydrated);
        } else if (initialLocal.length > 0) {
          await fetch('/api/cart', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              items: initialLocal.map((item) => ({
                mealId: item.meal.id,
                quantity: item.quantity,
              })),
            }),
          });
        }
      } catch {
        // Keep current state if network request fails
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadServerCart();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userId, getToken]);

  const persistCart = useCallback(
    async (nextItems: CartItem[]) => {
      writeLocalCart(isSignedIn && userId ? userId : null, nextItems);

      if (!isSignedIn || !userId) return;
      try {
        const token = await getToken();
        if (!token) return;

        await fetch('/api/cart', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: nextItems.map((item) => ({
              mealId: item.meal.id,
              quantity: Math.min(99, Math.max(1, item.quantity)),
            })),
          }),
        });
      } catch {
        // Ignore transient sync failures
      }
    },
    [isSignedIn, userId, getToken]
  );

  useEffect(() => {
    if (!lastAddedMessage) return;
    const timer = window.setTimeout(() => {
      setLastAddedMessage(null);
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [lastAddedMessage]);

  const addToCart = useCallback(
    (meal: Meal, quantity = 1): boolean => {
      const safeQty = Math.min(99, Math.max(1, quantity));
      const latestMeal = meals.find((m) => m.id === meal.id) || meal;
      setItems((prev) => {
        const existing = prev.find((item) => item.meal.id === latestMeal.id);
        const next = existing
          ? prev.map((item) =>
              item.meal.id === latestMeal.id
                ? { meal: latestMeal, quantity: Math.min(99, item.quantity + safeQty) }
                : item
            )
          : [...prev, { meal: latestMeal, quantity: safeQty }];
        void persistCart(next);
        return next;
      });
      setLastAddedMessage(`${safeQty} × ${latestMeal.name} added to your order`);
      return true;
    },
    [persistCart, meals]
  );

  const updateQuantity = useCallback(
    (mealId: string, quantity: number) => {
      setItems((prev) => {
        const next =
          quantity <= 0
            ? prev.filter((item) => item.meal.id !== mealId)
            : prev.map((item) =>
                item.meal.id === mealId
                  ? { ...item, quantity: Math.min(99, quantity) }
                  : item
              );
        void persistCart(next);
        return next;
      });
    },
    [persistCart]
  );

  const removeFromCart = useCallback(
    (mealId: string) => {
      setItems((prev) => {
        const next = prev.filter((item) => item.meal.id !== mealId);
        void persistCart(next);
        return next;
      });
    },
    [persistCart]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    writeLocalCart(isSignedIn && userId ? userId : null, []);
    if (!isSignedIn || !userId) return;
    void (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        await fetch('/api/cart', {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore transient sync failures
      }
    })();
  }, [isSignedIn, userId, getToken]);

  const dismissNotification = useCallback(() => {
    setLastAddedMessage(null);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + (typeof item.meal.price === 'number' ? item.meal.price : 0) * item.quantity,
    0
  );
  const hasUnpricedItems = items.some((item) => item.meal.price === null || item.meal.price <= 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        totalItems,
        subtotal,
        hasUnpricedItems,
        lastAddedMessage,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        dismissNotification,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
