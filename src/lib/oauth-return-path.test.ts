import { describe, expect, it } from "vitest";
import { oauthReturnPath } from "./oauth-return-path";

describe("OAuth return paths", () => {
  it("keeps the authorization id, query parameters, and fragment", () => {
    expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=test&x=1#approve")).toBe("/.lovable/oauth/consent?authorization_id=test&x=1#approve");
  });
  it("rejects external, network, backslash and control-character redirects", () => {
    for (const path of ["https://outside.invalid", "//outside.invalid", "/\\outside.invalid", "/x\n", null]) expect(oauthReturnPath(path)).toBe("/");
  });
});