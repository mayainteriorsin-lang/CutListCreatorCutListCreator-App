import { Router } from "express";
import { z } from "zod";
import { withCircuitBreaker } from "../services/circuitBreaker";

const unitTypeSchema = z.enum(["wardrobe", "kitchen", "tv_unit", "dresser", "other"]);

const bodySchema = z.object({
  imageBase64: z.string().min(1, "imageBase64 is required"),
  unitType: unitTypeSchema,
  roomType: z.string().optional(),
});

const legacyBodySchema = z.object({
  imageBase64: z.string().min(1, "imageBase64 is required"),
  roomType: z.string().optional(),
});

const boxSchema = z.object({
  xNorm: z.number(),
  yNorm: z.number(),
  wNorm: z.number(),
  hNorm: z.number(),
});

const componentSchema = z.object({
  type: z.enum([
    "loft",
    "door",
    "drawer_stack",
    "shelf_column",
    "hanging_zone",
    "base_cabinet_row",
    "wall_cabinet_row",
    "tall_unit",
    "tv_panel",
    "side_storage",
  ]),
  box: boxSchema,
  countHint: z.number().optional(),
  notes: z.string().optional(),
});

const suggestionSchema = z.object({
  detected: z.boolean(),
  confidence: z.enum(["low", "medium", "high"]),
  unitType: unitTypeSchema,
  primaryBox: boxSchema,
  components: z.array(componentSchema),
  suggestions: z
    .object({
      doors: z.number().optional(),
      hasLoft: z.boolean().optional(),
      layoutHint: z.string().optional(),
    })
    .optional(),
});

type UnitType = z.infer<typeof unitTypeSchema>;
type AiInteriorSuggestion = z.infer<typeof suggestionSchema>;

const SYSTEM_PROMPT = `
You are an interior unit vision assistant.
Ignore beds, curtains, floor, and unrelated furniture.
Focus ONLY on the requested unitType.
Wardrobe: detect boundary + doors + loft.
Kitchen: detect base cabinet row + wall cabinet row + tall unit if present.
TV unit: detect TV panel + base cabinet + side storage.
Dresser: detect mirror panel + drawer stack.
If not confident, set detected=false and confidence=low.
All boxes must be normalized 0..1 relative to the IMAGE width/height.
Return ONLY JSON that matches the schema exactly. No extra text.
`.trim();

const responseFormat = {
  type: "json_schema",
  json_schema: {
    name: "interior_unit_detection",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["detected", "confidence", "unitType", "primaryBox", "components", "suggestions"],
      properties: {
        detected: { type: "boolean" },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        unitType: { type: "string", enum: ["wardrobe", "kitchen", "tv_unit", "dresser", "other"] },
        primaryBox: {
          type: "object",
          additionalProperties: false,
          required: ["xNorm", "yNorm", "wNorm", "hNorm"],
          properties: {
            xNorm: { type: "number" },
            yNorm: { type: "number" },
            wNorm: { type: "number" },
            hNorm: { type: "number" },
          },
        },
        components: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["type", "box"],
            properties: {
              type: {
                type: "string",
                enum: [
                  "loft",
                  "door",
                  "drawer_stack",
                  "shelf_column",
                  "hanging_zone",
                  "base_cabinet_row",
                  "wall_cabinet_row",
                  "tall_unit",
                  "tv_panel",
                  "side_storage",
                ],
              },
              box: {
                type: "object",
                additionalProperties: false,
                required: ["xNorm", "yNorm", "wNorm", "hNorm"],
                properties: {
                  xNorm: { type: "number" },
                  yNorm: { type: "number" },
                  wNorm: { type: "number" },
                  hNorm: { type: "number" },
                },
              },
              countHint: { type: "number" },
              notes: { type: "string" },
            },
          },
        },
        suggestions: {
          type: "object",
          additionalProperties: false,
          properties: {
            doors: { type: "number" },
            hasLoft: { type: "boolean" },
            layoutHint: { type: "string" },
          },
        },
      },
    },
  },
} as const;

const emptySuggestion = (unitType: UnitType): AiInteriorSuggestion => ({
  detected: false,
  confidence: "low",
  unitType,
  primaryBox: { xNorm: 0, yNorm: 0, wNorm: 0, hNorm: 0 },
  components: [],
  suggestions: {},
});

/**
 * Call OpenAI API with circuit breaker protection
 * PHASE 16: Added circuit breaker for resilience
 */
async function detectInteriorUnit(params: {
  imageBase64: string;
  unitType: UnitType;
  roomType?: string;
}): Promise<{ suggestion: AiInteriorSuggestion; raw: string }> {
  const { imageBase64, unitType, roomType } = params;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  // Wrap OpenAI call with circuit breaker
  return withCircuitBreaker(
    'ai',
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const payload = {
        model: "gpt-4o-mini",
        max_tokens: 400,
        response_format: responseFormat,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Unit type: ${unitType}. Room type: ${roomType || "unknown"}.`,
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
        console.error("OpenAI vision error:", response.status, errText);
        throw new Error("AI detection failed");
      }

      const data: any = await response.json();
      const content: string = data?.choices?.[0]?.message?.content?.trim?.() || "";
      let suggestion = emptySuggestion(unitType);

      if (!content) {
        return { suggestion, raw: content };
      }

      try {
        const parsed = JSON.parse(content);
        const validated = suggestionSchema.safeParse(parsed);
        if (validated.success) {
          suggestion = {
            ...validated.data,
            unitType,
            suggestions: validated.data.suggestions ?? {},
          };
        } else {
          console.error("AI interior detect validation failed:", validated.error.format());
        }
      } catch (err) {
        console.error("Failed to parse AI JSON:", err, content);
      }

      return { suggestion, raw: content };
    },
    // Fallback when circuit is open
    () => ({ suggestion: emptySuggestion(unitType), raw: '' })
  );
}

export function aiInteriorDetectRouter() {
  const router = Router();

  router.post("/interior-detect", async (req, res) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.format() });
      }

      const { suggestion } = await detectInteriorUnit(parsed.data);
      return res.json(suggestion);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return res.status(504).json({ error: "AI request timed out" });
      }
      if (error?.message === "OpenAI API key not configured") {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }
      console.error("AI interior detect error:", error);
      return res.status(500).json({ error: "AI detection failed" });
    }
  });

  router.post("/wardrobe-detect", async (req, res) => {
    try {
      const parsed = legacyBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.format() });
      }

      const { suggestion, raw } = await detectInteriorUnit({
        imageBase64: parsed.data.imageBase64,
        unitType: "wardrobe",
        roomType: parsed.data.roomType,
      });

      const legacySuggestion = {
        detected: suggestion.detected,
        confidence: suggestion.confidence,
        wardrobe: {
          hasLoft: suggestion.suggestions?.hasLoft ?? false,
          doors: suggestion.suggestions?.doors ?? 3,
          zones: suggestion.components.map((component) => component.type),
        },
      };

      return res.json({
        suggestion: legacySuggestion,
        raw,
      });
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return res.status(504).json({ error: "AI request timed out" });
      }
      if (error?.message === "OpenAI API key not configured") {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }
      console.error("AI wardrobe alias error:", error);
      return res.status(500).json({ error: "AI detection failed" });
    }
  });

  return router;
}
