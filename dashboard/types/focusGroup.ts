import { CloserProduct } from "./closer";

export type PersonaId =
  | "value-hunter"
  | "gen-z-streetwear"
  | "daily-commuter"
  | "impulse-scroller"
  | "detail-skeptic";

export interface BuyerPersona {
  id: PersonaId;
  name: string;
  tagline: string;
  avatar: string;
  demographics: string;
  buyingIntentPct: number;
  sentiment: "BULLISH" | "NEUTRAL" | "HIGH_INTEREST" | "CAUTIOUS";
  reactionQuote: string;
  keyTrigger: string;
  frictionPoint: string;
  tailoredVoicePitch: string;
  wordCount: number;
  charCount: number;
  hardGuardPassed: boolean;
}

export interface MonteCarloFunnelMetrics {
  totalImpressions: number;
  thumbstopCount: number;
  thumbstopRatePct: number;
  clickCount: number;
  ctrPct: number;
  atcCount: number;
  atcRatePct: number;
  purchaseCount: number;
  purchaseConvPct: number;
  dailyBudget: number;
  projectedRoas: number;
  estimatedCpa: number;
  projectedDailyRevenue: number;
  projectedMonthlyRevenue: number;
  channels: {
    name: string;
    sharePct: number;
    budgetRupiah: string;
    expectedRoas: number;
    badge: string;
    color: string;
  }[];
}

export interface SimulatedAudienceDot {
  id: number;
  stage: "DROPPED" | "THUMBSTOP" | "CLICK" | "ATC" | "PURCHASE";
  x: number;
  y: number;
  color: string;
}

export interface FocusGroupApiResponse {
  product: CloserProduct;
  personas: BuyerPersona[];
  funnel: MonteCarloFunnelMetrics;
  overallProductScore: number;
  verdict: string;
  latencyMs: number;
}
