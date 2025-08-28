// src/components/common/Spinner.jsx
import React from "react";

/**
 * Simple, reusable spinner.
 * - Inherits color from parent (uses currentColor). Set via `className="text-white"` etc.
 * - Accessible: role="status" + aria-label.
 */
export const Spinner = ({ size = "sm", className = "", label = "Loading…" }) => {
  const sizeMap = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    xl: "h-8 w-8",
  };
  // Keep thickness consistent with your previous inline usage (border-2 for most sizes)
  const thicknessMap = {
    xs: "border",
    sm: "border-2",
    md: "border-2",
    lg: "border-2",
    xl: "border-2",
  };

  return (
    <span
      role="status"
      aria-label={label}
      className={[
        "inline-block animate-spin rounded-full border-current border-t-transparent align-[-0.125em]",
        sizeMap[size] || sizeMap.sm,
        thicknessMap[size] || thicknessMap.sm,
        className,
      ].join(" ")}
    />
  );
};

/**
 * Centered loader pill for page/section loading states.
 * - `tint` controls the pill background (brand color by default).
 * - Spinner inherits white via text-white.
 */
export const CenterLoader = ({
  label = "Loading…",
  tint = "rgb(77, 52, 144)",
}) => (
  <div className="w-full py-12 flex items-center justify-center">
    <div
      className="flex items-center gap-3 rounded-lg text-white px-4 py-3 shadow-lg"
      style={{ backgroundColor: tint }}
    >
      <Spinner size="sm" className="text-white" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  </div>
);

export default Spinner;
