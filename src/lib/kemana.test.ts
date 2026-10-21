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

describe("voting rules", () => {
  const base = { votingStartedAt: 1000, votingEndsAt: null, decided: undefined };

  it("voting is closed before the owner starts it", () => {
    expect(votingOpen({ votingStartedAt: undefined, votingEndsAt: null, decided: undefined })).toBe(false);
  });

  it("voting is open after start with no time limit", () => {
    expect(votingOpen(base, 5000)).toBe(true);
  });

  it("voting closes when the deadline passes", () => {
    const r = { votingStartedAt: 1000, votingEndsAt: 2000, decided: undefined };
    expect(votingOpen(r, 1500)).toBe(true);
    expect(votingOpen(r, 2500)).toBe(false);
  });

  it("voting closes once locked, even before the deadline", () => {
    expect(votingOpen({ votingStartedAt: 1000, votingEndsAt: 9999, decided: "p1" }, 1500)).toBe(false);
  });

  it("offers 15 minutes, 1 hour, 24 hours, and no limit", () => {
    expect(VOTE_LIMITS.map((l) => l.minutes)).toEqual([15, 60, 1440, null]);
  });

  it("one member = one vote; changing a vote replaces it", () => {
    const votes: Record<string, string> = { a: "p1" };
    votes["a"] = "p2"; // re-vote overwrites
    expect(Object.keys(votes)).toHaveLength(1);
    expect(topVoted(votes)).toEqual(["p2"]);
  });

  it("detects a tie so the owner can pick the winner", () => {
    expect(topVoted({ a: "p1", b: "p2", c: "p1", d: "p2" }).sort()).toEqual(["p1", "p2"]);
  });

  it("a clear winner is not a tie", () => {
    expect(topVoted({ a: "p1", b: "p2", c: "p1" })).toEqual(["p1"]);
  });

  it("no votes means no winner", () => {
    expect(topVoted({})).toEqual([]);
  });
});
