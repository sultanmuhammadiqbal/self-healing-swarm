import { CloserProduct, PRESET_PRODUCTS } from "../types/closer";

export const MAX_VOICE_WORDS = 22;
export const MAX_VOICE_CHARS = 145;

export interface GuardedSpeechResult {
  text: string;
  wordCount: number;
  charCount: number;
  hardGuardPassed: boolean;
  wasTrimmed: boolean;
}

/**
 * Deterministically enforces:
 * 1. Single-product focus (removes references to other products in catalog)
 * 2. Exact Voice-Over boundary: <= 22 words AND <= 145 characters
 */
export function enforceVoiceHardGuard(
  rawText: string,
  activeProduct: CloserProduct
): GuardedSpeechResult {
  let cleaned = (rawText || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();

  // 1. Enforce Single Product Focus: ensure no other preset product names leak in
  for (const other of PRESET_PRODUCTS) {
    if (other.id !== activeProduct.id) {
      const regex = new RegExp(other.name, "gi");
      cleaned = cleaned.replace(regex, activeProduct.name);
    }
  }

  let wasTrimmed = false;

  // 2. Enforce <= 22 words
  let words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > MAX_VOICE_WORDS) {
    words = words.slice(0, MAX_VOICE_WORDS);
    cleaned = words.join(" ");
    wasTrimmed = true;
  }

  // 3. Enforce <= 145 characters without cutting a word in half
  if (cleaned.length > MAX_VOICE_CHARS) {
    wasTrimmed = true;
    const sliced = cleaned.slice(0, MAX_VOICE_CHARS - 1);
    const lastSpace = sliced.lastIndexOf(" ");
    if (lastSpace > 40) {
      cleaned = sliced.slice(0, lastSpace).replace(/[.,;:!?-]+$/, "") + "!";
    } else {
      cleaned = sliced.replace(/[.,;:!?-]+$/, "") + "!";
    }
  }

  // Ensure clean ending punctuation if trimmed
  if (wasTrimmed && !/[.!?]$/.test(cleaned)) {
    if (cleaned.length < MAX_VOICE_CHARS) {
      cleaned = cleaned.replace(/[,;:-]+$/, "") + "!";
    }
  }

  const finalWords = cleaned.split(/\s+/).filter(Boolean);

  return {
    text: cleaned,
    wordCount: finalWords.length,
    charCount: cleaned.length,
    hardGuardPassed:
      finalWords.length <= MAX_VOICE_WORDS && cleaned.length <= MAX_VOICE_CHARS,
    wasTrimmed,
  };
}

export function formatRupiah(amount: number): string {
  return "Rp " + Math.round(amount).toLocaleString("id-ID");
}
