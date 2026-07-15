// src/context/SaleContext.jsx
// Carries the in-progress cart across the New Sale -> Confirm Sale -> Sale Success screens
// (docs/UIUX_Design_Guide_Week2.docx, screens 3-5).
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
          line.product.id === product.id ? { ...line, quantity: line.quantity + quantity } : line
        );
      }
      return [...prev, { product, quantity }];
    });
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((line) => line.product.id !== productId));
  }

  function clearCart() {
    setCart([]);
  }

  const total = cart.reduce((sum, line) => sum + Number(line.product.unit_price) * line.quantity, 0);

  return (
    <SaleContext.Provider
      value={{ cart, addToCart, removeFromCart, clearCart, total, lastResult, setLastResult }}
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
