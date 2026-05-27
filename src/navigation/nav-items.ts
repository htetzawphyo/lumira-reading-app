import { BookOpen, Library, Lightbulb, Settings } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

export type NavItem = {
  label: string;
  href: "/library" | "/reading" | "/knowledge" | "/settings";
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Library", href: "/library", icon: Library },
  { label: "Reading", href: "/reading", icon: BookOpen },
  { label: "Knowledge", href: "/knowledge", icon: Lightbulb },
  { label: "Settings", href: "/settings", icon: Settings },
];
