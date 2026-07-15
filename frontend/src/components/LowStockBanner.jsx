// src/components/LowStockBanner.jsx
// Reference: docs/API_Schema_Regimens.docx (Products), User Story 7
export default function LowStockBanner({ products }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="low-stock-banner">
      <strong>Low stock:</strong>{" "}
      {products.map((p) => `${p.name} (${p.quantity} left)`).join(", ")}
    </div>
  );
}
