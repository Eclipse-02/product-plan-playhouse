# KemanaAja

**Stop saying "terserah". Decide where to hang out, together, in under 10 minutes.**

KemanaAja is a group-planning web app prototype for young people in Indonesia. One person creates a plan and shares a link; everyone fills in their preferences privately; the app recommends 3–5 places that fit **everyone's** budget; the group votes and gets a shareable Decision Card.

- **Live prototype:** https://product-plan-playhouse.lovable.app
- **E2E tests and QA findings:** [`e2e-testing` branch](https://github.com/Eclipse-02/product-plan-playhouse/tree/e2e-testing)

Built as a case study for the **Product Management class, Study Club Veterantech (UPN Veteran Jakarta)**.

---

## The problem

Group hangouts often get cancelled because nobody can agree on a place. Budgets differ, people live in different areas, and nobody wants to be the one who says a place is too expensive. Existing apps (TikTok, Google Maps, review directories) help *individuals* discover places, but none help a *group* decide.

## How it works

1. **Create a plan.** Give it a name; the date is optional.
2. **Invite friends.** Share one link to the group chat. No app download needed.
3. **Fill in preferences.** Budget (kept private), nearest area, time, and activity type.
4. **Get recommendations.** Once at least 3 members have filled in, the app shows 3–5 places that fit the lowest budget in the group.
5. **Vote and decide.** Each member has one vote and can change it. The owner locks the decision and gets a Decision Card to share on WhatsApp.

## Product decisions

| Decision | Why |
|---|---|
| Budget is private | Talking about money is awkward; people skip plans rather than admit a place is too expensive. |
| Lowest budget is a hard limit | Every recommendation must be affordable for everyone in the group. |
| Only 3–5 options | Too many choices slow down group decisions. |
| Web link, no install | Members who only want to vote shouldn't have to download an app. |
| Rule-based recommendations | Fast to build and easy to explain for an MVP; ML is out of scope. |

Full reasoning (problem analysis, personas, RICE prioritization, MVP scope, sprint plan) is in the Product Planning Document.

## Tech stack

- TanStack Start + React, Tailwind CSS
- Supabase (database and RPC functions)
- Built with [Lovable](https://lovable.dev); this branch stays in sync with the Lovable editor

## Running locally

```sh
npm install
npm run dev
```

## Testing

- **Unit tests (Vitest):** `npm test`
- **End-to-end tests (Playwright):** on the [`e2e-testing` branch](https://github.com/Eclipse-02/product-plan-playhouse/tree/e2e-testing), along with a requirement traceability table and the QA findings from testing this prototype.

## Status

This is an MVP prototype for a class case study, not a production app. Known issues are documented on the `e2e-testing` branch.