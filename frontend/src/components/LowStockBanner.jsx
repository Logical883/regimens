import { TriangleAlert } from "lucide-react";

export default function LowStockBanner({ products }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="alert alert--warning" role="status">
      <TriangleAlert size={18} strokeWidth={1.75} />
      <div>
        <strong>Low stock</strong>
        <p className="muted" style={{ marginTop: 4 }}>
          {products.map((p) => `${p.name} (${p.quantity} left)`).join(", ")}
        </p>
      </div>
    </div>
  );
}