import {
  Banknote,
  Book,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  type LucideIcon,
  MonitorPlay,
  Music,
  Navigation,
  PawPrint,
  Phone,
  PiggyBank,
  Pill,
  Plane,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Tag,
  TrendingUp,
  Umbrella,
  Utensils,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";

/**
 * The single source of truth for category icons — used both to render a
 * category's stored `icon` key and to populate the icon-picker grid in
 * `CategorySelect`. Kept in sync by hand with the backend's `iconKeySchema`
 * (`backend/src/modules/categories/schemas.ts`), which only validates the
 * key and never renders anything.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  car: Car,
  navigation: Navigation,
  "monitor-play": MonitorPlay,
  music: Music,
  "heart-pulse": HeartPulse,
  "shopping-bag": ShoppingBag,
  zap: Zap,
  home: Home,
  "gamepad-2": Gamepad2,
  coffee: Coffee,
  tag: Tag,
  banknote: Banknote,
  briefcase: Briefcase,
  gift: Gift,
  "trending-up": TrendingUp,
  plane: Plane,
  bus: Bus,
  fuel: Fuel,
  wifi: Wifi,
  phone: Phone,
  dumbbell: Dumbbell,
  "paw-print": PawPrint,
  book: Book,
  wrench: Wrench,
  "piggy-bank": PiggyBank,
  film: Film,
  shirt: Shirt,
  pill: Pill,
  "graduation-cap": GraduationCap,
  umbrella: Umbrella,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

export const DEFAULT_ICON_KEY = "tag";
