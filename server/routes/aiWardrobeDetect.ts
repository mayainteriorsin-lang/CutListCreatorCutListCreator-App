import { Router } from "express";
import { z } from "zod";

const bodySchema = z.object({
  imageBase64: z.string().min(1, "imageBase64 is required"),
  roomType: z.string().optional(),
});

const SYSTEM_PROMPT = `
You are an interior design vision assistant.
Analyze the photo and detect ONLY wardrobe structure.
Reply strictly in JSON.
Do not explain anything.
JSON format:
{
  detected: boolean,
  confidence: 'low'|'medium'|'high',
  wardrobe: {
    hasLoft: boolean,
    doors: number,
    zones: string[]
  }
}
`.trim();

export function aiWardrobeDetectRouter() {
  const router = Router();

  router.post("/wardrobe-detect", async (req, res) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.format() });
      }

      const { imageBase64, roomType } = parsed.data;
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const payload = {
        model: "gpt-4o-mini",
        max_tokens: 300,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: roomType ? `Room type: ${roomType}` : "Room type: unknown" },
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
        return res.status(502).json({ error: "AI detection failed" });
      }

      const data: any = await response.json();
      const content: string = data?.choices?.[0]?.message?.content?.trim?.() || "";
      let suggestion: any = null;

      try {
        suggestion = JSON.parse(content);
      } catch (err) {
        console.error("Failed to parse AI JSON:", err, content);
      }

      return res.json({
        suggestion,
        raw: content,
      });
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return res.status(504).json({ error: "AI request timed out" });
      }
      console.error("AI detection error:", error);
      return res.status(500).json({ error: "AI detection failed" });
    }
  });

  return router;
}

