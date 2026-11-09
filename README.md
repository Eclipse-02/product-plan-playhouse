# KemanaAja — E2E Testing

End-to-end test suite for **KemanaAja**, a group-planning web app prototype that helps friends agree on where to hang out: create a room, invite friends, fill in preferences (budget is private), get 3–5 recommendations that fit everyone's budget, vote, and lock a decision.

Built as part of the **Product Management class, Study Club Veterantech (UPN Veteran Jakarta)**. I wrote the Product Planning Document (problem analysis, personas, RICE prioritization, MVP scope), then tested the prototype against its requirements.

- **Live prototype:** https://product-plan-playhouse.lovable.app
- **App stack:** TanStack Start, React, Supabase (built with Lovable)
- **Test stack:** Playwright, TypeScript

> This branch (`e2e-testing`) contains the test suite and one app fix found during automation (see F-3). `main` is synced with Lovable.

---

## Test approach

- **Requirement-based:** every check is tagged with a requirement ID from the Product Planning Document.
- **Multi-user:** owner and members each run in a separate browser context, simulating real people joining via the invite link.
- **UI + API:** key actions (start voting, cast vote, lock decision) are verified on the Supabase response, not only on the screen.
- **Negative cases:** checks that things that must *not* happen don't happen: hidden budgets, hidden vote results, members cannot lock the decision.

## Requirement traceability

| ID | Requirement (from planning doc) | Test | Checked at |
|---|---|---|---|
| R-01 | Recommendations unlock only after ≥ 3 members fill in preferences | Both tests | UI |
| R-02 | 3–5 recommendations, all ≤ the lowest member budget | Group test | UI |
| R-03 | A member's budget is private | Group test | UI only — **API leaks it, see F-1** |
| R-07 | During voting only the number of voters is visible | Group test | UI only — **API leaks it, see F-1** |
| R-12 | One vote per member, can be changed before lock | Group test | UI + API |
| — | Only the owner can lock the decision | Group test | UI + API |
| R-17 | Light authentication (magic link / OTP) | Basic test | Logged only, not asserted — see F-6 |
| R-19 | Date is optional and not shown in ISO format | Both tests | UI |

## Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| F-1 | **Budgets and votes are exposed through the API.** The `rooms` table allows anonymous `SELECT` on every row (`USING (true)`), and each room's `members` column contains every member's budget; `votes` is in the same row. The UI hides them, but anyone can read them in the network response, including rooms they aren't part of. Breaks R-03 and R-07. | High | Reported |
| F-2 | **Any visitor can modify any room.** Anonymous `UPDATE` is allowed on all rooms (`USING (true)`), so a visitor could overwrite other members' preferences or votes. Owner-only fields are protected by a trigger, but `members` and `votes` are not. | High | Reported |
| F-3 | **Race condition on "Buat Rencana".** Automated tests clicked the button before the page finished hydrating, so room creation failed intermittently with no message to the user. | Medium | **Fixed in this branch:** button disabled until hydrated, plus an error message on failure |
| F-4 | **Contradiction in the spec.** §4.2 says only the voter count is visible during voting; §4.6 says interim results ("Hasil sementara") are shown. Tests follow §4.2. | Medium | Needs PM decision |
| F-5 | **Tie-vote rule is undefined** ("Aturan suara seri belum diputuskan"). Untestable until decided. | Low | Open question |
| F-6 | **Auth differs from spec.** The spec asks for magic link / OTP; the app has email/password and OAuth. | Low | Open question |

## Running the tests

```sh
npm install
npx playwright install chromium

# terminal 1: start the app on port 8080
npm run dev -- --port 8080

# terminal 2: run the tests
npx playwright test --project=chromium
npx playwright show-report
```

The tests create real rooms in the prototype's Supabase project.

## Known limitations of the suite

- Not yet covered: time/opening-hours filter, category filter accuracy, Decision Card contents (cost, Maps link, share button), "Ubah keputusan".
- The price check scans the whole page instead of only the recommendation cards.
- Each scenario is one long test; splitting it with `test.step` per requirement would give clearer reports.
- Some locators depend on seeded place names.