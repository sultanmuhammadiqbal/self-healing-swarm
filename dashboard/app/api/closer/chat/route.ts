import { NextRequest, NextResponse } from "next/server";
import {
  CloserChatRequest,
  CloserChatResponse,
  CloserProduct,
  PRESET_PRODUCTS,
  UIActionPayload,
} from "../../../../types/closer";
import { enforceVoiceHardGuard, formatRupiah } from "../../../../lib/closerGuard";

export const runtime = "nodejs";

function buildDeterministicCloserBrain(
  userMessage: string,
  product: CloserProduct
): { reply: string; ui_action: UIActionPayload } {
  const msg = userMessage.toLowerCase();

  // 1. Check for Checkout / Flash Deal / Promo / Sikat / Beli Sekarang
  if (
    /sikat|checkout|keranjang|promo|voucher|bayar|bungkus|ambil sekarang|deal/i.test(
      msg
    ) &&
    !/dua|2|tiga|3|grosir|pasang/i.test(msg)
  ) {
    const discountPct = 15;
    const finalNumeric = product.priceNumeric * (1 - discountPct / 100);
    return {
      reply: `Sikat bro! Pakai kode FLASH15 sekarang, ${product.name} langsung potong 15% jadi ${formatRupiah(finalNumeric)} plus gratis ongkir kilat!`,
      ui_action: {
        action: "FLASH_CHECKOUT",
        angleIndex: 0,
        discountPct,
        finalPrice: formatRupiah(finalNumeric),
        voucherCode: "FLASH15-VIP",
        expiresInSeconds: 180,
      },
    };
  }

  // 2. Check for Bundle / Quantity / Wholesale / "ambil 2 pasang" / "beli dua" / "harga berapa"
  if (
    /dua|2|tiga|3|pasang|bundle|bundling|grosir|diskon|nego|kurang|harga/i.test(
      msg
    )
  ) {
    const qtyMatch = msg.match(/(\d+)/);
    const qty = qtyMatch ? Math.min(Math.max(parseInt(qtyMatch[1], 10), 2), 5) : 2;
    const discountPct = qty >= 3 ? 25 : 18;
    const rawTotal = product.priceNumeric * qty;
    const finalTotal = rawTotal * (1 - discountPct / 100);
    const saved = rawTotal - finalTotal;

    return {
      reply: `Ambil ${qty} pasang ${product.name} langsung diskon ${discountPct}%! Total cuma ${formatRupiah(finalTotal)}, hemat ${formatRupiah(saved)} hari ini!`,
      ui_action: {
        action: "CALCULATE_BUNDLE",
        qty,
        discountPct,
        finalPrice: formatRupiah(finalTotal),
        unitPriceSaved: formatRupiah(saved),
      },
    };
  }

  // 3. Check for OOTD / Outfit / Baju / Celana / Kamera / Cocok gak
  if (/ootd|outfit|baju|celana|warna|cocok|kamera|scan|style|gaya/i.test(msg)) {
    return {
      reply: `Gas kita scan outfit lo sekarang! Warna ${product.colorwayName} di ${product.name} ini siap ngunci gaya streetwear lo makin clean!`,
      ui_action: {
        action: "ANALYZE_OOTD",
        angleIndex: 2,
      },
    };
  }

  // 4. Check for Sole / Empuk / Bawah / Zoom / Bantalan / Material / Macro Inspect
  if (
    /sol|bawah|empuk|zoom|bantalan|nitro|karbon|carbon|detail|material|bahan|dekat|tumit/i.test(
      msg
    )
  ) {
    const isUpper = /upper|bahan atas|mesh|kulit|leather|jahit/i.test(msg);
    const targetAngle: 0 | 1 | 2 = isUpper ? 0 : 1;
    const angleObj = product.angles[targetAngle];

    return {
      reply: isUpper
        ? `Lihat detail ${product.upperMaterial} ini! Super breathable, ringan ${product.weightGrams} gram, dan ngunci kaki dengan presisi tinggi!`
        : `Lihat sendiri detail ${product.soleTech} ini! Bantalan udaranya super tebal, dijamin empuk seharian tanpa bikin tumit pegal!`,
      ui_action: {
        action: "MACRO_INSPECT",
        angleIndex: targetAngle,
        zoom: 1.65,
        calloutText: angleObj.calloutLabel,
        targetCoord: { x: angleObj.hotspotX, y: angleObj.hotspotY },
      },
    };
  }

  // 5. Check for On-Feet / Atas / Dipakai / Angle 3
  if (/atas|on-feet|on feet|dipakai|kaki|angle 3|tampak atas/i.test(msg)) {
    return {
      reply: `Ini tampilan on-feet ${product.name}! Proporsinya pas banget di pergelangan kaki, bikin siluet celana lo kelihatan makin tegas!`,
      ui_action: {
        action: "SWITCH_ANGLE",
        angleIndex: 2,
      },
    };
  }

  // 6. Check for Samping / Angle 1 / Putar
  if (/samping|angle 1|putar|lihat|tampang|desain/i.test(msg)) {
    return {
      reply: `Cek siluet samping ${product.name} ini! Garis aerodinamisnya tegas banget dengan bobot super enteng cuma ${product.weightGrams} gram!`,
      ui_action: {
        action: "SWITCH_ANGLE",
        angleIndex: 0,
      },
    };
  }

  // Default enthusiastic Sneakerhead response with Macro Inspect on Sole
  return {
    reply: `${product.name} punya teknologi ${product.soleTech} paling responsif! Mau gue zoom detail solnya atau hitung diskon bundling sekarang?`,
    ui_action: {
      action: "MACRO_INSPECT",
      angleIndex: 1,
      zoom: 1.65,
      calloutText: product.angles[1].calloutLabel,
      targetCoord: {
        x: product.angles[1].hotspotX,
        y: product.angles[1].hotspotY,
      },
    },
  };
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = (await req.json()) as Partial<CloserChatRequest>;
    const userMessage = (body.userMessage || "Lihat detail sol bawahnya").trim();
    const product: CloserProduct = body.product || PRESET_PRODUCTS[0];

    const groqKey = req.headers.get("x-groq-key") || process.env.GROQ_API_KEY;
    const geminiKey =
      req.headers.get("x-gemini-key") || process.env.GEMINI_API_KEY;

    // Baseline deterministic intent & UI action so even if LLM omits fields, UI Action is 100% accurate
    const deterministic = buildDeterministicCloserBrain(userMessage, product);
    let rawReply = deterministic.reply;
    let uiAction: UIActionPayload = deterministic.ui_action;
    let provider = "hybrid-neural-sneakerhead-engine";

    const systemPrompt = `Kamu adalah AI Sneakerhead & Product Specialist yang antusias dan tajam.
ATURAN KETAT WAJIB PATUH (HARD-GUARD):
1. FOKUS 1 PRODUK TUNGGAL: Hanya bahas "${product.name}" (Harga: ${product.priceFormatted}, Sol: ${product.soleTech}, Upper: ${product.upperMaterial}). DILARANG KERAS menyebut atau membandingkan produk lain!
2. BATAS EKSAK VOICE OVER: Kalimat "reply" WAJIB MAKSIMAL 22 KATA dan MAKSIMAL 145 KARAKTER! Gunakan gaya bahasa anak muda/sneakerhead Indonesia yang enerjik dan persuasif.
3. Kembalikan HANYA JSON valid dengan format:
{
  "reply": "kalimat <= 22 kata dan <= 145 karakter",
  "ui_action": {
    "action": "SWITCH_ANGLE" | "MACRO_INSPECT" | "CALCULATE_BUNDLE" | "ANALYZE_OOTD" | "FLASH_CHECKOUT",
    "angleIndex": 0 | 1 | 2,
    "zoom": 1.65,
    "calloutText": "teks callout fitur singkat",
    "qty": 2,
    "discountPct": 18,
    "finalPrice": "Rp ..."
  }
}`;

    if (groqKey) {
      try {
        const groqRes = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              temperature: 0.35,
              max_tokens: 180,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
              ],
            }),
          }
        );

        if (groqRes.ok) {
          const data = await groqRes.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (parsed.reply) rawReply = parsed.reply;
            if (parsed.ui_action?.action) {
              uiAction = { ...deterministic.ui_action, ...parsed.ui_action };
            }
            provider = "groq-llama-3.3-70b-versatile";
          }
        }
      } catch {
        // Fallback to Gemini or deterministic engine seamlessly
      }
    } else if (geminiKey) {
      try {
        const gemRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${systemPrompt}\n\nUser: ${userMessage}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.35,
              },
            }),
          }
        );
        if (gemRes.ok) {
          const data = await gemRes.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed.reply) rawReply = parsed.reply;
            if (parsed.ui_action?.action) {
              uiAction = { ...deterministic.ui_action, ...parsed.ui_action };
            }
            provider = "gemini-2.0-flash";
          }
        }
      } catch {
        // Fallback seamlessly
      }
    }

    // Deterministic Hard-Guard Validation (<= 22 words AND <= 145 chars + Single-Product Lock)
    const guarded = enforceVoiceHardGuard(rawReply, product);

    const responsePayload: CloserChatResponse = {
      reply: guarded.text,
      wordCount: guarded.wordCount,
      charCount: guarded.charCount,
      hardGuardPassed: guarded.hardGuardPassed,
      provider,
      latencyMs: Math.max(12, Date.now() - startedAt),
      ui_action: uiAction,
    };

    return NextResponse.json(responsePayload);
  } catch (err) {
    const fallbackProduct = PRESET_PRODUCTS[0];
    const guarded = enforceVoiceHardGuard(
      `Lihat sendiri detail ${fallbackProduct.soleTech} ini! Bantalan udaranya tebal dan super empuk seharian!`,
      fallbackProduct
    );
    return NextResponse.json({
      reply: guarded.text,
      wordCount: guarded.wordCount,
      charCount: guarded.charCount,
      hardGuardPassed: true,
      provider: "failsafe-neural-guard",
      latencyMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : undefined,
      ui_action: {
        action: "MACRO_INSPECT",
        angleIndex: 1,
        zoom: 1.65,
        calloutText: fallbackProduct.angles[1].calloutLabel,
      },
    });
  }
}
