import { Router } from "express";
import { z } from "zod";

const bodySchema = z.object({
  imageBase64: z.string().min(1, "imageBase64 is required"),
  roomType: z.string().optional(),
});

const boxSchema = z.object({
  xNorm: z.number().min(0).max(1),
  yNorm: z.number().min(0).max(1),
  wNorm: z.number().min(0).max(1),
  hNorm: z.number().min(0).max(1),
});

const suggestionSchema = z.object({
  wardrobeBox: boxSchema,
  loft: z.object({
    present: z.boolean(),
    heightRatio: z.number().min(0.12).max(0.35).optional(),
  }),
  suggestedShutters: z.number().int().min(2).max(6),
  baySplits: z.array(z.number().min(0).max(1)).optional(),
  confidence: z.number().min(0).max(1),
});

type AiWardrobeLayoutSuggestion = z.infer<typeof suggestionSchema>;

const SYSTEM_PROMPT = `
You are a wardrobe layout vision assistant.
Detect the OUTER wardrobe boundary box and any loft line.
Return the best shutter count based on typical shutter widths (avoid too narrow or too wide).
Also return bay splits as fractions across the wardrobe width (left to right) when helpful.
If you cannot detect a wardrobe, set wardrobeBox to zeros and confidence to 0.
All box coordinates are normalized 0..1 relative to the IMAGE width/height.
Loft heightRatio is the loft height as a fraction of wardrobe height (0.12..0.35) when present.
Return ONLY JSON that matches the schema exactly. No extra text.
`.trim();

const responseFormat = {
  type: "json_schema",
  json_schema: {
    name: "wardrobe_layout_detection",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["wardrobeBox", "loft", "suggestedShutters", "confidence"],
      properties: {
        wardrobeBox: {
          type: "object",
          additionalProperties: false,
          required: ["xNorm", "yNorm", "wNorm", "hNorm"],
          properties: {
            xNorm: { type: "number", minimum: 0, maximum: 1 },
            yNorm: { type: "number", minimum: 0, maximum: 1 },
            wNorm: { type: "number", minimum: 0, maximum: 1 },
            hNorm: { type: "number", minimum: 0, maximum: 1 },
          },
        },
        loft: {
          type: "object",
          additionalProperties: false,
          required: ["present"],
          properties: {
            present: { type: "boolean" },
            heightRatio: { type: "number", minimum: 0.12, maximum: 0.35 },
          },
        },
        suggestedShutters: { type: "integer", minimum: 2, maximum: 6 },
        baySplits: {
          type: "array",
          items: { type: "number", minimum: 0, maximum: 1 },
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
    },
  },
} as const;

async function detectWardrobeLayout(params: {
  imageBase64: string;
  roomType?: string;
}): Promise<{ suggestion: AiWardrobeLayoutSuggestion; raw: string }> {
  const { imageBase64, roomType } = params;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  const payload = {
    model: "gpt-4o-mini",
    max_tokens: 350,
    response_format: responseFormat,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: roomType ? `Room type: ${roomType}.` : "Room type: unknown.",
          },
          { type: "image_url", image_url: { url: imageBase64 } },
        ],
      },
    ],
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error("OpenAI wardrobe layout error:", response.status, errText);
    throw new Error("AI detection failed");
  }

  const data: any = await response.json();
  const content: string = data?.choices?.[0]?.message?.content?.trim?.() || "";
  if (!content) {
    throw new Error("Empty AI response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    console.error("Failed to parse AI JSON:", err, content);
    throw new Error("Invalid AI response");
  }

  const validated = suggestionSchema.safeParse(parsed);
  if (!validated.success) {
    console.error("AI wardrobe layout validation failed:", validated.error.format());
    throw new Error("Invalid AI response");
  }

  return { suggestion: validated.data, raw: content };
}

export function aiWardrobeLayoutRouter() {
  const router = Router();

  router.post("/wardrobe-layout", async (req, res) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ ok: false, error: "Invalid request", details: parsed.error.format() });
      }

      const { suggestion } = await detectWardrobeLayout(parsed.data);
      return res.json(suggestion);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return res.status(504).json({ ok: false, error: "AI request timed out" });
      }
      if (error?.message === "OpenAI API key not configured") {
        return res.status(500).json({ ok: false, error: "OpenAI API key not configured" });
      }
      if (error?.message === "Invalid AI response" || error?.message === "Empty AI response") {
        return res.json({ ok: false, error: "Invalid AI response" });
      }
      console.error("AI wardrobe layout error:", error);
      return res.status(500).json({ ok: false, error: "AI detection failed" });
    }
  });

  return router;
}
