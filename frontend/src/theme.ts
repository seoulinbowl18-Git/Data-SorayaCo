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

export const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "sneakers", label: "Sneakers" },
  { key: "boots", label: "Boots" },
  { key: "loafers", label: "Loafers" },
  { key: "apparel", label: "Apparel" },
] as const;

export const API = process.env.EXPO_PUBLIC_BACKEND_URL as string;
