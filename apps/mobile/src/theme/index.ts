import { color, radius, space } from "@yuvmi/shared";

export const theme = {
  color,
  radius,
  space,
  font: {
    size: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 24,
      xxl: 28,
      display: 32,
    },
    weight: {
      regular: "400" as const,
      medium: "500" as const,
      semibold: "600" as const,
      bold: "700" as const,
    },
  },
} as const;

export type Theme = typeof theme;
