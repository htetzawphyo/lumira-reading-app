import { Folder, Library, Lightbulb, Settings } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

export type NavItem = {
  label: string;
  href: "/library" | "/folders" | "/knowledge" | "/settings";
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Library", href: "/library", icon: Library },
  { label: "Folders", href: "/folders", icon: Folder },
  { label: "Knowledge", href: "/knowledge", icon: Lightbulb },
  { label: "Settings", href: "/settings", icon: Settings },
];
