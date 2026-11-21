import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

interface PiiDetection {
  label: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
  partialMask?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image file" }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, or WebP images are supported for PII masking" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large for scan (max 4 MB)" }, { status: 413 });
    }

    const base64Data = Buffer.from(await file.arrayBuffer()).toString("base64");

    const prompt = `Detect all sensitive personal identification numbers in this Indian document/ID image:
- Aadhaar number (12 digits, e.g. XXXX XXXX XXXX) -> set partialMask: true
- Virtual ID / VID (16 digits) -> set partialMask: true
- PAN card number (10 alphanumeric chars like ABCDE1234F) -> set partialMask: false
- Bank account number, debit/credit card number, CVV, phone number -> set partialMask: false

Return ONLY valid JSON matching this schema:
{"detections":[{"label":"Aadhaar Number","box_2d":[ymin,xmin,ymax,xmax],"partialMask":true}]}
Coordinates in box_2d must be integers normalized to 0-1000 relative to image height/width.
If no sensitive ID numbers are visible, return {"detections":[]}. Do NOT echo or transcribe the actual numbers.`;

    const isVertexExpressKey = apiKey.startsWith("AQ.");
    const endpoint = isVertexExpressKey
      ? `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
      : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inline_data: { mime_type: file.type, data: base64Data } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      return NextResponse.json(
        { error: `Gemini scan failed (${geminiRes.status})` },
        { status: 502 }
      );
    }

    const payload = await geminiRes.json();
    const rawText: string = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '{"detections":[]}';

    let detections: PiiDetection[] = [];
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed?.detections)) {
        detections = parsed.detections.filter(
          (d: any) =>
            d &&
            typeof d.label === "string" &&
            Array.isArray(d.box_2d) &&
            d.box_2d.length === 4 &&
            d.box_2d.every((n: any) => typeof n === "number" && n >= 0 && n <= 1000)
        );
      }
    } catch {
      detections = [];
    }

    return NextResponse.json(
      { detections },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch {
    return NextResponse.json({ error: "PII scan failed" }, { status: 500 });
  }
}

