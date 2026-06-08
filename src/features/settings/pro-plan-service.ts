export type ProPlanFeatureCategory =
  | "appearance"
  | "reading"
  | "cloud"
  | "ai";

export type ProPlanConfig = {
  planName: string;
  subtitle: string;
  heroText: string;
  prices: {
    mm: {
      amount: number | null;
      currency: "MMK";
      interval: "month";
      display: string;
    };
    international: {
      amount: number | null;
      currency: "USD";
      interval: "month";
      display: string;
    };
  };
  features: Array<{
    id: string;
    title: string;
    description: string;
    category: ProPlanFeatureCategory;
    included: boolean;
  }>;
  aiLimits: {
    summariesPerMonth: number | null;
    chatMessagesPerMonth: number | null;
  };
  paymentMethods: Array<{
    id: string;
    name: string;
    region: "MM" | "international";
    enabled: boolean;
    comingSoon?: boolean;
  }>;
  promotionalText: string;
};

export const fallbackProPlanConfig: ProPlanConfig = {
  planName: "Lumira Pro",
  subtitle:
    "Read comfortably, back up your library, and unlock AI-powered reading tools.",
  heroText:
    "A premium reading workspace for people who want their books, notes, and ideas to stay organized.",
  prices: {
    mm: {
      amount: 4500,
      currency: "MMK",
      interval: "month",
      display: "4,500 MMK / month",
    },
    international: {
      amount: 4.5,
      currency: "USD",
      interval: "month",
      display: "$4.50 / month",
    },
  },
  features: [
    {
      id: "more-app-themes",
      title: "More App Themes",
      description: "Personalize the whole app with premium visual themes.",
      category: "appearance",
      included: true,
    },
    {
      id: "more-reading-backgrounds",
      title: "More Reading Backgrounds",
      description:
        "Choose comfortable reading backgrounds like Sepia, Night Purple, Sage Calm, and Soft Lavender.",
      category: "reading",
      included: true,
    },
    {
      id: "cloud-sync-backup",
      title: "Cloud Sync & Backup",
      description: "Back up your EPUB library and restore it on another device.",
      category: "cloud",
      included: true,
    },
    {
      id: "sync-notes-highlights",
      title: "Sync Notes & Highlights",
      description:
        "Keep your notes, highlights, reading progress, and folders backed up.",
      category: "cloud",
      included: true,
    },
    {
      id: "ai-book-summary",
      title: "AI Book Summary",
      description: "Get helpful summaries of your books or chapters.",
      category: "ai",
      included: true,
    },
    {
      id: "discuss-with-ai",
      title: "Discuss with AI",
      description: "Ask questions about your reading and explore ideas with AI.",
      category: "ai",
      included: true,
    },
  ],
  aiLimits: {
    summariesPerMonth: 50,
    chatMessagesPerMonth: 300,
  },
  paymentMethods: [
    {
      id: "aya-pay",
      name: "AYA Pay",
      region: "MM",
      enabled: true,
      comingSoon: false,
    },
    {
      id: "wave-pay",
      name: "Wave Pay",
      region: "MM",
      enabled: true,
      comingSoon: false,
    },
    {
      id: "uab-pay",
      name: "UAB Pay",
      region: "MM",
      enabled: true,
      comingSoon: false,
    },
    {
      id: "stripe-card",
      name: "Card payment",
      region: "international",
      enabled: false,
      comingSoon: true,
    },
  ],
  promotionalText:
    "AI limits may vary by plan and can be updated to keep the service reliable.",
};

function hasUsableConfig(config: Partial<ProPlanConfig> | null | undefined) {
  return Boolean(
    config?.planName &&
      config.prices?.mm &&
      config.prices?.international &&
      config.features?.length,
  );
}

export const proPlanService = {
  async getProPlanConfig(): Promise<ProPlanConfig> {
    try {
      // Later this can fetch from the backend and merge with fallback values.
      const backendConfig = null as Partial<ProPlanConfig> | null;

      if (hasUsableConfig(backendConfig)) {
        return {
          ...fallbackProPlanConfig,
          ...backendConfig,
        } as ProPlanConfig;
      }
    } catch {
      // Keep the premium screen available even if remote config fails.
    }

    return fallbackProPlanConfig;
  },
};
