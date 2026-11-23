import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useCart } from '../context/CartContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { lastAddedMessage, dismissNotification } = useCart();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1C1917]">
      <Navbar />

      <main className="flex-1">{children}</main>

      <Footer />

      {/* Non-intrusive Cart Feedback Toast */}
      <AnimatePresence>
        {lastAddedMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#5A0B1E] text-[#FAF7F2] rounded-xl shadow-lg border border-white/15 px-4 py-3 flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-[#86EFAC] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{lastAddedMessage}</p>
              <Link
                to="/cart"
                className="text-xs text-[#86EFAC] hover:underline font-medium"
              >
                View Order Cart
              </Link>
            </div>
            <button
              type="button"
              onClick={dismissNotification}
              aria-label="Dismiss notification"
              className="p-1 rounded-md text-[#FAF7F2]/70 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
