import { Slot } from "expo-router";

import { AdaptiveAppShell } from "@/navigation/adaptive-app-shell";

export default function MainLayout() {
  return (
    <AdaptiveAppShell>
      <Slot />
    </AdaptiveAppShell>
  );
}
