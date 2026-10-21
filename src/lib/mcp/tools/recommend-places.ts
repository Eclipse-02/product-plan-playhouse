import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { AREAS, CATS, TIMES, MIN_MEMBERS, SAMPLE_PLACES, recommend, rupiah } from "@/lib/kemana";

export default defineTool({
  name: "recommend_sample_places",
  title: "Rekomendasikan tempat kumpul",
  description: "Recommend up to five sample places from supplied group preferences, without reading or saving any rencana or individual budget.",
  inputSchema: {
    preferences: z.array(z.object({
      budget: z.number().finite().min(0).max(200000).multipleOf(5000).describe("Maximum budget per person in rupiah, matching the app slider."),
      area: z.enum(AREAS as [string, ...string[]]).describe("Nearest area."),
      times: z.array(z.enum(TIMES as [string, ...string[]])).min(1).describe("Selected available time slots."),
      cats: z.array(z.enum(CATS as [string, ...string[]])).describe("Selected activity categories; may be empty."),
    })).min(MIN_MEMBERS).max(100).describe("At least three group members' preferences; no names or identifiers required."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ preferences }) => {
    const results = recommend(preferences.map((p, i) => ({ ...p, id: String(i), name: "" })), SAMPLE_PLACES);
    return { content: [{ type: "text", text: results.map(p => `${p.id}: ${p.name} · ${p.area} · ${rupiah(p.price)} · ${p.time}`).join("\n") || "Belum ada tempat contoh yang cocok." }] };
  },
});