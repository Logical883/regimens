import { Box } from "lucide-react";

export default function BrandMark() {
  return (
    <div className="brand-bar">
      <div className="brand-mark" aria-hidden="true">
        <Box size={18} strokeWidth={1.75} />
      </div>
      <div className="brand-text">
        <strong>Regimens</strong>
        <span>Stationery</span>
      </div>
    </div>
  );
}