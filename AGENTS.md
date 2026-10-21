<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Architecture rules

- Rooms ("rencana" in UI copy) live in the Cloud `rooms` table as JSON columns (members, votes) and sync via Supabase Realtime; owner-gated fields (decided, voting window) change only through security-definer RPCs (`start_voting`, `lock_decision`, `reopen_decision`) that verify a per-device owner token from `room_owners` — never update those columns directly, a trigger rejects it.
- User-facing copy says "rencana", never "room"; code identifiers keep using "room".
- The recommendation engine (`recommend` in src/lib/kemana.ts) stays pure and client-side so it is unit-testable; voting rule helpers (`votingOpen`, `topVoted`, `VOTE_LIMITS`) live there too.
- Places data and CSV import stay per-device (localStorage); only rooms and metric events are online.
