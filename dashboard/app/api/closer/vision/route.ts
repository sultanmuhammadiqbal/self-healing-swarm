import { NextRequest, NextResponse } from "next/server";
import {
  CloserProduct,
  PRESET_PRODUCTS,
  VisionAnalysisResponse,
} from "../../../../types/closer";
import { enforceVoiceHardGuard } from "../../../../lib/closerGuard";

export const runtime = "nodejs";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const transform = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * transform(rgb.r) +
    0.7152 * transform(rgb.g) +
    0.0722 * transform(rgb.b)
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product: CloserProduct = body.product || PRESET_PRODUCTS[0];
    const palette: { hex: string; name: string; ratio: number }[] =
      body.extractedPalette?.length > 0
        ? body.extractedPalette
        : [
            { hex: "#1E293B", name: "Charcoal Denim", ratio: 52 },
            { hex: "#06B6D4", name: "Cyber Teal Accent", ratio: 28 },
            { hex: "#F8FAFC", name: "Crisp White Tee", ratio: 20 },
          ];

    const primaryOutfit = palette[0];
    const primaryProduct = product.dominantColors[1] || product.dominantColors[0];

    const lum1 = relativeLuminance(hexToRgb(primaryOutfit.hex));
    const lum2 = relativeLuminance(hexToRgb(primaryProduct.hex));
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    const contrastVal = ((brightest + 0.05) / (darkest + 0.05)).toFixed(2);

    // Compute dynamic harmony score 91-98%
    const numericContrast = parseFloat(contrastVal);
    const harmonyScore = Math.min(
      98,
      Math.max(91, Math.round(90 + (numericContrast % 8)))
    );

    const rawPitch = `Warna ${primaryOutfit.name} di outfit lo masuk ${harmonyScore}% sama aksen ${primaryProduct.name} di ${product.name}! Auto keren parah pas dipakai jalan!`;
    const guarded = enforceVoiceHardGuard(rawPitch, product);

    const response: VisionAnalysisResponse = {
      harmonyScore,
      verdictBadge: `${harmonyScore}% OOTD HARMONY MATCH 🔥`,
      dominantOutfitColors: palette,
      contrastRatio: `${contrastVal}:1 Complementary Pop`,
      styleNotes: `Kontras ${contrastVal}:1 antara ${primaryOutfit.name} (${primaryOutfit.hex}) dan aksen ${primaryProduct.name} (${primaryProduct.hex}) menciptakan efek visual spotlight di bagian kaki.`,
      salesPitch: guarded.text,
      wordCount: guarded.wordCount,
      charCount: guarded.charCount,
      ui_action: {
        action: "SWITCH_ANGLE",
        angleIndex: 2,
        calloutText: `OOTD Match ${harmonyScore}% • ${primaryOutfit.name} x ${product.colorwayName}`,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    const fallbackProduct = PRESET_PRODUCTS[0];
    const guarded = enforceVoiceHardGuard(
      `Outfit lo masuk 95% sama warna ${fallbackProduct.colorwayName} di ${fallbackProduct.name}! Kontrasnya pas banget buat gaya harian lo!`,
      fallbackProduct
    );
    return NextResponse.json({
      harmonyScore: 95,
      verdictBadge: "95% OOTD HARMONY MATCH 🔥",
      dominantOutfitColors: [
        { hex: "#1E293B", name: "Slate Streetwear", ratio: 60 },
        { hex: "#06B6D4", name: "Volt Accent", ratio: 40 },
      ],
      contrastRatio: "4.85:1 Complementary Pop",
      styleNotes: "Palet warna outfit selaras dengan siluet on-feet produk.",
      salesPitch: guarded.text,
      wordCount: guarded.wordCount,
      charCount: guarded.charCount,
      error: err instanceof Error ? err.message : undefined,
      ui_action: {
        action: "SWITCH_ANGLE",
        angleIndex: 2,
      },
    });
  }
}
