export const PLANS = {
  FREE: {
    name: "Free",
    credits: 25,
    maxSeats: 10,
    priceMonthly: 0,
    priceAnnual: 0,
    stripePriceIdMonthly: null,
    stripePriceIdAnnual: null,
  },
  PRO: {
    name: "Pro",
    credits: 250,
    maxSeats: 10,
    priceMonthly: 1900,
    priceAnnual: 19000,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? "",
  },
  BUSINESS: {
    name: "Business",
    credits: 1000,
    maxSeats: 20,
    priceMonthly: 7900,
    priceAnnual: 79000,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? "",
    stripePriceIdAnnual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL ?? "",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
