import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const browserFallbackText = (formData.get("fallbackText") as string) || "";
    const customGroqKey = req.headers.get("x-groq-key") || process.env.GROQ_API_KEY;

    if (!audioFile) {
      return NextResponse.json(
        {
          transcript: browserFallbackText || "",
          engine: "browser-web-speech-fallback",
          latencyMs: Date.now() - startedAt,
        },
        { status: 200 }
      );
    }

    // Mode A: Cloud Ultra-Fast Groq whisper-large-v3-turbo
    if (customGroqKey) {
      const groqForm = new FormData();
      groqForm.append("file", audioFile, audioFile.name || "speech.webm");
      groqForm.append("model", "whisper-large-v3-turbo");
      groqForm.append("language", "id");
      groqForm.append("response_format", "json");

      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${customGroqKey}`,
          },
          body: groqForm,
        }
      );

      if (groqRes.ok) {
        const data = (await groqRes.json()) as { text?: string };
        return NextResponse.json({
          transcript: (data.text || browserFallbackText || "").trim(),
          engine: "groq-whisper-large-v3-turbo",
          latencyMs: Date.now() - startedAt,
        });
      }
    }

    // Hybrid Fallback to synchronized Web Speech stream if GROQ_API_KEY is not set
    return NextResponse.json({
      transcript: browserFallbackText.trim(),
      engine: customGroqKey
        ? "hybrid-fallback-after-cloud"
        : "hybrid-web-speech-stream",
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    return NextResponse.json(
      {
        transcript: "",
        engine: "error-fallback",
        error: err instanceof Error ? err.message : "Transcribe error",
        latencyMs: Date.now() - startedAt,
      },
      { status: 200 }
    );
  }
}
