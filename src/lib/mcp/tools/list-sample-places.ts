import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { AREAS, CATS, SAMPLE_PLACES, rupiah } from "@/lib/kemana";

export default defineTool({
  name: "list_sample_places",
  title: "Lihat tempat contoh",
  description: "List KemanaAja's sample places, optionally filtered by area or category; excludes device-local CSV imports.",
  inputSchema: {
    area: z.enum(AREAS as [string, ...string[]]).optional().describe("Optional area from the supported area list."),
    category: z.enum(CATS as [string, ...string[]]).optional().describe("Optional activity category."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ area, category }) => ({ content: [{ type: "text", text:
    SAMPLE_PLACES.filter(p => (!area || p.area === area) && (!category || p.cat === category))
      .map(p => `${p.id}: ${p.name} · ${p.cat} · ${p.area} · ${rupiah(p.price)}`).join("\n") || "Tidak ada tempat contoh yang cocok.",
  }] }),
});