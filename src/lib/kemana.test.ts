import { describe, it, expect } from "vitest";
import { recommend, topVoted, votingOpen, VOTE_LIMITS, MIN_MEMBERS, SAMPLE_PLACES, fmtDate, type Member } from "./kemana";

const m = (id: string, budget: number, area: string, times: string[], cats: string[] = []): Member => ({ id, name: id, budget, area, times, cats });

describe("recommend", () => {
  it("minimum members is 3", () => expect(MIN_MEMBERS).toBe(3));

  it("never exceeds the lowest budget of a 3-member group", () => {
    const recs = recommend([m("a", 200000, "Jakarta Selatan", ["Sore"]), m("b", 40000, "Jakarta Selatan", ["Sore"]), m("c", 90000, "Jakarta Pusat", ["Sore"])], SAMPLE_PLACES);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((p) => p.price <= 40000)).toBe(true);
  });

  it("excludes places outside members' areas (no Tangerang Selatan for Jakarta group)", () => {
    const recs = recommend([m("a", 200000, "Jakarta Selatan", ["Sore"]), m("b", 200000, "Jakarta Pusat", ["Sore"]), m("c", 200000, "Jakarta Selatan", ["Sore"])], SAMPLE_PLACES);
    expect(recs.some((p) => p.area === "Tangerang Selatan")).toBe(false);
  });

  it("excludes places closed at the chosen time", () => {
    const recs = recommend([m("a", 200000, "Jakarta Pusat", ["Siang"]), m("b", 200000, "Jakarta Pusat", ["Siang"]), m("c", 200000, "Jakarta Pusat", ["Siang"])], SAMPLE_PLACES);
    expect(recs.some((p) => p.name === "Sate Taichan Bendungan")).toBe(false); // opens 18:00
  });

  it("formats dates the Indonesian way", () => expect(fmtDate("2026-10-20")).toBe("Sel, 20 Okt 2026"));
});
