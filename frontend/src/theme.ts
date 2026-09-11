export const colors = {
  surface: "#FFFFFF",
  onSurface: "#1A1A1A",
  surfaceSecondary: "#F5F5F5",
  onSurfaceSecondary: "#333333",
  surfaceTertiary: "#EAEAEA",
  surfaceInverse: "#111111",
  onSurfaceInverse: "#FFFFFF",
  brand: "#000000",
  onBrand: "#FFFFFF",
  muted: "#8A8A8A",
  border: "#E5E5E5",
  divider: "#EEEEEE",
  danger: "#D32F2F",
  success: "#2E7D32",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
};

export const BRAND_NAME = "Soraya.Co";

// Category / tag list. Order MUST match user-provided spec.
// Best Seller, Promo, Reseller are tag-based collections (populated later
// when the merchant flags specific products).
export const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "atasan", label: "Atasan (Top)" },
  { key: "blouse", label: "Blouse" },
  { key: "tunik-rayon", label: "Tunik Rayon" },
  { key: "gamis-maxy", label: "Gamis Maxy" },
  { key: "midi-dress", label: "Midi Dress" },
  { key: "setelan", label: "Setelan" },
  { key: "best-seller", label: "Best Seller" },
  { key: "pyajamas", label: "Pyajamas" },
  { key: "promo", label: "Promo" },
  { key: "reseller", label: "Reseller" },
] as const;

export const PAYMENT_METHODS = [
  "QRIS",
  "BCA",
  "BRI",
  "BNI",
  "Mandiri",
  "DANA",
  "GoPay",
  "OVO",
  "ShopeePay",
] as const;

export const API = process.env.EXPO_PUBLIC_BACKEND_URL as string;
