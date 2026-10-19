import { describe, it, expect } from "vitest";
import { recommend } from "./kemana";

describe("recommend", () => {
  it("only returns places within the lowest member budget", () => {
    const recs = recommend([
      { id: "a", name: "A", budget: 200000, area: "Jakarta Selatan", time: "Sore", cats: ["Aktivitas"] },
      { id: "b", name: "B", budget: 40000, area: "Jakarta Selatan", time: "Sore", cats: ["Kopi"] },
    ]);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((p) => p.price <= 40000)).toBe(true);
  });
});
