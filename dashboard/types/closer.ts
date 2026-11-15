export type UIActionType =
  | "SWITCH_ANGLE"
  | "MACRO_INSPECT"
  | "CALCULATE_BUNDLE"
  | "ANALYZE_OOTD"
  | "FLASH_CHECKOUT"
  | "IDLE";

export interface UIActionPayload {
  action: UIActionType;
  angleIndex?: 0 | 1 | 2;
  zoom?: number;
  calloutText?: string;
  targetCoord?: { x: number; y: number };
  qty?: number;
  discountPct?: number;
  finalPrice?: string;
  unitPriceSaved?: string;
  voucherCode?: string;
  expiresInSeconds?: number;
}

export interface ProductAngle {
  index: 0 | 1 | 2;
  title: string;
  subtitle: string;
  badge: string;
  hotspotX: number; // percentage 0-100
  hotspotY: number; // percentage 0-100
  calloutLabel: string;
  accentHex: string;
}

export interface CloserProduct {
  id: string;
  name: string;
  sku: string;
  priceNumeric: number;
  priceFormatted: string;
  category: string;
  tagline: string;
  colorwayName: string;
  dominantColors: { hex: string; name: string }[];
  specs: string[];
  soleTech: string;
  upperMaterial: string;
  weightGrams: number;
  angles: [ProductAngle, ProductAngle, ProductAngle];
}

export interface CloserChatRequest {
  userMessage: string;
  product: CloserProduct;
  currentAngle: 0 | 1 | 2;
  ootdColors?: { hex: string; name: string; ratio: number }[];
  ootdHarmonyScore?: number;
  conversationHistory?: { role: "user" | "assistant"; text: string }[];
}

export interface CloserChatResponse {
  reply: string;
  wordCount: number;
  charCount: number;
  hardGuardPassed: boolean;
  provider: string;
  latencyMs: number;
  ui_action: UIActionPayload;
}

export interface VisionAnalysisResponse {
  harmonyScore: number;
  verdictBadge: string;
  dominantOutfitColors: { hex: string; name: string; ratio: number }[];
  contrastRatio: string;
  styleNotes: string;
  salesPitch: string;
  wordCount: number;
  charCount: number;
  ui_action: UIActionPayload;
}

export const PRESET_PRODUCTS: CloserProduct[] = [
  {
    id: "aero-nitro-x9",
    name: "AERO NITRO-BOUNCE X9",
    sku: "ANX9-CYBER-2026",
    priceNumeric: 2490000,
    priceFormatted: "Rp 2.490.000",
    category: "Hyper-Cushion Street Runner",
    tagline: "Dual-Density Nitrogen Foam + Full-Length Carbon Matrix Plate",
    colorwayName: "Obsidian / Volt Cyan / Hyper Orange",
    dominantColors: [
      { hex: "#0F172A", name: "Obsidian Matte" },
      { hex: "#06B6D4", name: "Volt Cyan" },
      { hex: "#F97316", name: "Hyper Orange" },
    ],
    specs: [
      "Busa Sol Nitro-Bounce 42mm (88% Energy Return)",
      "Pelat Karbon Torq-Blade anti-twist di bagian midfoot",
      "Upper AeroWeave Monofilament breathable tahan cipratan",
      "Outsole Continental Grip anti-slip di aspal basah",
    ],
    soleTech: "Nitro-Bounce 42mm + Carbon Torq-Blade",
    upperMaterial: "AeroWeave Engineered Mesh 3D",
    weightGrams: 218,
    angles: [
      {
        index: 0,
        title: "Angle 1: Lateral Aero Profile",
        subtitle: "Siluet aerodinamis dengan AeroWeave 3D Upper & garis reflektif Volt Cyan",
        badge: "SIDE PROFILE",
        hotspotX: 54,
        hotspotY: 46,
        calloutLabel: "AeroWeave 3D Breathable Matrix (218g Ultra-Light)",
        accentHex: "#06B6D4",
      },
      {
        index: 1,
        title: "Angle 2: Nitro-Bounce Sole & Carbon Core",
        subtitle: "Bantalan udara Nitrogen 42mm super empuk + Carbon Torq-Blade pendorong langkah",
        badge: "SOLE & TECH",
        hotspotX: 48,
        hotspotY: 70,
        calloutLabel: "42mm Nitro-Bounce Cushion + Carbon Torq-Blade (88% Rebound)",
        accentHex: "#F97316",
      },
      {
        index: 2,
        title: "Angle 3: On-Feet Streetwear Silhouette",
        subtitle: "Tampilan dari atas & on-feet yang tajam untuk cargo, denim, maupun jogger",
        badge: "ON-FEET FIT",
        hotspotX: 52,
        hotspotY: 55,
        calloutLabel: "Ergonomic Collar Lock + Reflective Tongue Loop",
        accentHex: "#10B981",
      },
    ],
  },
  {
    id: "vortex-stealth-pro",
    name: "VORTEX STEALTH GTX-PRO",
    sku: "VST-GORE-088",
    priceNumeric: 2850000,
    priceFormatted: "Rp 2.850.000",
    category: "Tactical Urban Gorpcore",
    tagline: "Waterproof Gore-Membrane + Vibram Arctic Megagrip Lug Sole",
    colorwayName: "Phantom Black / Emerald Neon / Titanium",
    dominantColors: [
      { hex: "#111827", name: "Phantom Black" },
      { hex: "#10B981", name: "Emerald Tactical" },
      { hex: "#94A3B8", name: "Titanium Grey" },
    ],
    specs: [
      "Membran HydroShield 100% tahan air hujan deras",
      "Sol bawah Vibram Megagrip 5mm traksi ekstrem",
      "Sistem tali Fidlock Magnetic Quick-Lace 1 detik",
      "Midsole OrthoCloud empuk untuk jalan 20.000 langkah",
    ],
    soleTech: "Vibram Megagrip + OrthoCloud Dual Pod",
    upperMaterial: "Ripstop Ballistic Nylon + Gore-Shield",
    weightGrams: 265,
    angles: [
      {
        index: 0,
        title: "Angle 1: Tactical Lateral Armor",
        subtitle: "Ripstop Ballistic Upper tahan air dengan aksen Emerald Neon reflektif",
        badge: "SIDE PROFILE",
        hotspotX: 50,
        hotspotY: 44,
        calloutLabel: "HydroShield Waterproof Ripstop + Fidlock Dial",
        accentHex: "#10B981",
      },
      {
        index: 1,
        title: "Angle 2: Vibram Megagrip Outsole",
        subtitle: "Gigi traksi multi-arah 5mm + busa OrthoCloud peredam benturan",
        badge: "SOLE & TECH",
        hotspotX: 46,
        hotspotY: 72,
        calloutLabel: "Vibram Megagrip 5mm Lugs + OrthoCloud Heel Pod",
        accentHex: "#06B6D4",
      },
      {
        index: 2,
        title: "Angle 3: On-Feet Gorpcore Stance",
        subtitle: "Proporsi chunky modern yang mengunci pergelangan kaki dengan nyaman",
        badge: "ON-FEET FIT",
        hotspotX: 55,
        hotspotY: 50,
        calloutLabel: "Magnetic Quick-Lace System + Padded Ankle Shield",
        accentHex: "#A855F7",
      },
    ],
  },
  {
    id: "solaris-court-retro",
    name: "SOLARIS COURT RETRO '89",
    sku: "SCR-VNTG-089",
    priceNumeric: 1990000,
    priceFormatted: "Rp 1.990.000",
    category: "Luxury Heritage Court Sneaker",
    tagline: "Full-Grain Italian Nappa Leather + Air-Capsule Heel Unit",
    colorwayName: "Sail Cream / Crimson Varsity / Gum",
    dominantColors: [
      { hex: "#F8FAFC", name: "Sail Cream" },
      { hex: "#EF4444", name: "Varsity Crimson" },
      { hex: "#D97706", name: "Raw Gum" },
    ],
    specs: [
      "Kulit asli Full-Grain Italian Nappa anti-crease",
      "Kapsul udara Air-Pocket tersembunyi di tumit",
      "Outsole Raw Gum Rubber klasik berdaya cengkeram tinggi",
      "Insole Memory-Cork yang mengikuti kontur telapak kaki",
    ],
    soleTech: "Hidden Air-Capsule + Heritage Gum Cup-Sole",
    upperMaterial: "Full-Grain Nappa Leather + Suede Overlay",
    weightGrams: 310,
    angles: [
      {
        index: 0,
        title: "Angle 1: Heritage Court Profile",
        subtitle: "Perpaduan kulit Sail Cream premium dan panel suede Varsity Crimson",
        badge: "SIDE PROFILE",
        hotspotX: 52,
        hotspotY: 45,
        calloutLabel: "Full-Grain Italian Nappa Leather (Anti-Crease)",
        accentHex: "#EF4444",
      },
      {
        index: 1,
        title: "Angle 2: Gum Cup-Sole & Air Capsule",
        subtitle: "Sol karet Raw Gum klasik dengan peredam kejut Air-Capsule di tumit",
        badge: "SOLE & TECH",
        hotspotX: 48,
        hotspotY: 71,
        calloutLabel: "Encapsulated Heel Air-Pocket + Raw Gum Pivot",
        accentHex: "#F59E0B",
      },
      {
        index: 2,
        title: "Angle 3: On-Feet Clean Aesthetic",
        subtitle: "Siluet timeless yang masuk ke celana chino, baggy jeans, maupun celana pendek",
        badge: "ON-FEET FIT",
        hotspotX: 50,
        hotspotY: 52,
        calloutLabel: "Memory-Cork Footbed + Vintage Woven Tongue Tag",
        accentHex: "#10B981",
      },
    ],
  },
];
