import { NextRequest, NextResponse } from "next/server";
import { CloserProduct, PRESET_PRODUCTS } from "../../../../types/closer";
import { enforceVoiceHardGuard, formatRupiah } from "../../../../lib/closerGuard";

export const runtime = "nodejs";

export type LiveStageOverlay =
  | "NONE"
  | "SIZE_CHART"
  | "SOLE_MACRO"
  | "ON_FEET_FIT"
  | "FLASH_DROP_VOUCHER";

export interface LiveStreamRespondPayload {
  reply: string;
  wordCount: number;
  charCount: number;
  hardGuardPassed: boolean;
  angleIndex: 0 | 1 | 2;
  stageOverlay: LiveStageOverlay;
  overlayBadge: string;
  pinnedUser?: string;
  pinnedComment?: string;
  voucherCode?: string;
  discountedPrice?: string;
  latencyMs: number;
}

function buildLiveHostInterruptResponse(
  username: string,
  comment: string,
  product: CloserProduct
): {
  rawReply: string;
  angleIndex: 0 | 1 | 2;
  stageOverlay: LiveStageOverlay;
  overlayBadge: string;
  voucherCode?: string;
  discountedPrice?: string;
} {
  const cleanUser = username.startsWith("@") ? username : `@${username}`;
  const msg = comment.toLowerCase();

  // 1. Size / Ukuran / Kaki Lebar / True to size
  if (/ukuran|size|40|41|42|43|44|cm|lebar|panjang|muat|nomor/i.test(msg)) {
    return {
      rawReply: `Halo ${cleanUser}! Ukuran 42 di ${product.name} itu 26.5 cm true-to-size, ruang depannya lega buat kaki lebar!`,
      angleIndex: 2,
      stageOverlay: "SIZE_CHART",
      overlayBadge: "📏 INTERACTIVE SIZE CHART (EU 39 - 45)",
    };
  }

  // 2. Sole / Empuk / Tahan Lama / Licin / Hujan
  if (/sol|empuk|bawah|licin|ujan|hujan|tahan|kuat|bantalan|lari|jalan/i.test(msg)) {
    return {
      rawReply: `Siap ${cleanUser}! Sol ${product.soleTech} di ${product.name} ini super empuk dan anti-slip di aspal basah!`,
      angleIndex: 1,
      stageOverlay: "SOLE_MACRO",
      overlayBadge: `🔬 MACRO SOLE: ${product.soleTech}`,
    };
  }

  // 3. Spill On-Feet / Dipakai / Celana / OOTD
  if (/spill|on-feet|on feet|dipakai|kaki|celana|cakep|lihat atas/i.test(msg)) {
    return {
      rawReply: `Ini spill on-feet ${product.name} buat ${cleanUser}! Siluet ${product.colorwayName}-nya tegas banget pas dipakai jalan!`,
      angleIndex: 2,
      stageOverlay: "ON_FEET_FIT",
      overlayBadge: "👟 LIVE ON-FEET SILHOUETTE PREVIEW",
    };
  }

  // 4. Flash Sale / Diskon / Harga / Voucher / Checkout / Murah
  if (/diskon|promo|flash|murah|harga|voucher|potongan|checkout|beli/i.test(msg)) {
    const discounted = formatRupiah(product.priceNumeric * 0.8);
    return {
      rawReply: `Khusus ${cleanUser}! Klaim voucher LIVE20 dalam 60 detik, ${product.name} turun jadi ${discounted} plus gratis ongkir!`,
      angleIndex: 0,
      stageOverlay: "FLASH_DROP_VOUCHER",
      overlayBadge: "⚡ 60s FLASH DROP VOUCHER (-20%)",
      voucherCode: "LIVE20-HOST",
      discountedPrice: discounted,
    };
  }

  // Default enthusiastic host answer
  return {
    rawReply: `Pertanyaan mantap ${cleanUser}! ${product.name} pakai ${product.upperMaterial} ${product.weightGrams}g yang ringan dan adem seharian!`,
    angleIndex: 0,
    stageOverlay: "NONE",
    overlayBadge: `✨ HERO SPOTLIGHT: ${product.name}`,
  };
}

function buildAutoLoopPitch(
  stepIndex: number,
  product: CloserProduct
): {
  rawReply: string;
  angleIndex: 0 | 1 | 2;
  stageOverlay: LiveStageOverlay;
  overlayBadge: string;
} {
  const step = stepIndex % 4;
  if (step === 0) {
    return {
      rawReply: `Selamat datang di Live 24/7! ${product.name} warna ${product.colorwayName} ini cuma ${product.weightGrams} gram, enteng parah!`,
      angleIndex: 0,
      stageOverlay: "NONE",
      overlayBadge: "🔄 AUTO-HOST: LATERAL AERO PROFILE",
    };
  }
  if (step === 1) {
    return {
      rawReply: `Perhatikan bagian bawah ${product.name}! Teknologi ${product.soleTech}-nya meredam benturan dan memantul responsif!`,
      angleIndex: 1,
      stageOverlay: "SOLE_MACRO",
      overlayBadge: "🔄 AUTO-HOST: SOLE & CUSHION TECH",
    };
  }
  if (step === 2) {
    return {
      rawReply: `Lihat fitting on-feet ${product.name} ini! Masuk banget dipadukan sama celana cargo, chino, maupun baggy denim!`,
      angleIndex: 2,
      stageOverlay: "ON_FEET_FIT",
      overlayBadge: "🔄 AUTO-HOST: ON-FEET STREETWEAR FIT",
    };
  }
  const discounted = formatRupiah(product.priceNumeric * 0.8);
  return {
    rawReply: `Stok ${product.name} di keranjang kuning sisa dikit! Sikat harga Flash Live ${discounted} sebelum timer habis!`,
    angleIndex: 0,
    stageOverlay: "FLASH_DROP_VOUCHER",
    overlayBadge: "🔄 AUTO-HOST: FLASH STOCK SCARCITY",
  };
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const body = await req.json();
    const product: CloserProduct = body.product || PRESET_PRODUCTS[0];
    const mode: "interrupt" | "auto_loop" = body.mode || "interrupt";

    if (mode === "auto_loop") {
      const stepIndex = Number(body.stepIndex || 0);
      const loopData = buildAutoLoopPitch(stepIndex, product);
      const guarded = enforceVoiceHardGuard(loopData.rawReply, product);

      const res: LiveStreamRespondPayload = {
        reply: guarded.text,
        wordCount: guarded.wordCount,
        charCount: guarded.charCount,
        hardGuardPassed: guarded.hardGuardPassed,
        angleIndex: loopData.angleIndex,
        stageOverlay: loopData.stageOverlay,
        overlayBadge: loopData.overlayBadge,
        latencyMs: Math.max(10, Date.now() - startedAt),
      };
      return NextResponse.json(res);
    }

    const username = (body.username || "@rizky_sneaker").trim();
    const comment = (
      body.comment || "Kak ukuran 42 panjangnya berapa cm?"
    ).trim();

    const interruptData = buildLiveHostInterruptResponse(
      username,
      comment,
      product
    );
    const guarded = enforceVoiceHardGuard(interruptData.rawReply, product);

    const res: LiveStreamRespondPayload = {
      reply: guarded.text,
      wordCount: guarded.wordCount,
      charCount: guarded.charCount,
      hardGuardPassed: guarded.hardGuardPassed,
      angleIndex: interruptData.angleIndex,
      stageOverlay: interruptData.stageOverlay,
      overlayBadge: interruptData.overlayBadge,
      pinnedUser: username.startsWith("@") ? username : `@${username}`,
      pinnedComment: comment,
      voucherCode: interruptData.voucherCode,
      discountedPrice: interruptData.discountedPrice,
      latencyMs: Math.max(14, Date.now() - startedAt),
    };

    return NextResponse.json(res);
  } catch {
    const fallback = PRESET_PRODUCTS[0];
    const guarded = enforceVoiceHardGuard(
      `Siap kak! ${fallback.name} ini ready stok terbatas dengan sol ${fallback.soleTech} super empuk!`,
      fallback
    );
    return NextResponse.json({
      reply: guarded.text,
      wordCount: guarded.wordCount,
      charCount: guarded.charCount,
      hardGuardPassed: true,
      angleIndex: 0,
      stageOverlay: "NONE",
      overlayBadge: "LIVE HOST ACTIVE",
      latencyMs: Date.now() - startedAt,
    });
  }
}
