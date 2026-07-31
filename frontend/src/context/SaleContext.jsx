// Carries the in-progress cart across New Sale → Confirm → Success.
import { createContext, useContext, useState } from "react";

const SaleContext = createContext(null);

export function SaleProvider({ children }) {
  const [cart, setCart] = useState([]); // [{ product, quantity }]
  const [lastResult, setLastResult] = useState(null);

  function addToCart(product, quantity) {
    setCart((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.product.id === product.id
            ? {
                ...line,
                quantity: Math.min(
                  line.quantity + quantity,
                  Number(product.quantity) || line.quantity + quantity
                ),
              }
            : line
        );
      }
      return [...prev, { product, quantity }];
    });
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((line) => line.product.id !== productId));
  }

  function setQuantity(productId, quantity) {
    const qty = Math.max(0, Number(quantity) || 0);
    setCart((prev) => {
      if (qty <= 0) return prev.filter((line) => line.product.id !== productId);
      return prev.map((line) =>
        line.product.id === productId
          ? { ...line, quantity: Math.min(qty, Number(line.product.quantity) || qty) }
          : line
      );
    });
  }

  function clearCart() {
    setCart([]);
  }

  const total = cart.reduce(
    (sum, line) => sum + Number(line.product.unit_price) * line.quantity,
    0
  );

  return (
    <SaleContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        setQuantity,
        clearCart,
        total,
        lastResult,
        setLastResult,
      }}
    >
      {children}
    </SaleContext.Provider>
  );
}

export function useSale() {
  const ctx = useContext(SaleContext);
  if (!ctx) throw new Error("useSale must be used inside SaleProvider");
  return ctx;
}
