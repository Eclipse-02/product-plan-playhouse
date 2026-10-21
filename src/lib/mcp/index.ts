import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSamplePlaces from "./tools/list-sample-places";
import recommendPlaces from "./tools/recommend-places";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "product-plan-playhouse",
  title: "Product Plan Playhouse",
  version: "0.1.0",
  instructions: "KemanaAja planning tools. List sample places or recommend from explicitly supplied group preferences. These tools do not access saved rencana, member data, votes, owner controls, or device-local CSV imports. Use browser tools for the visible rencana view.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
    requireOAuthClientClaim: true,
  }),
  tools: [listSamplePlaces, recommendPlaces],
});