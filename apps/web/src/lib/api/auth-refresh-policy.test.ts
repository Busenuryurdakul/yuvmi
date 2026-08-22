import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldAttemptAuthRefresh } from "./auth-refresh-policy.ts";

describe("shouldAttemptAuthRefresh", () => {
  it("returns false for logout 401 when skipAuthRefresh is set", () => {
    assert.equal(
      shouldAttemptAuthRefresh(401, false, { skipAuthRefresh: true }, "refresh-token"),
      false,
    );
  });

  it("returns true for ordinary 401 when refresh token exists", () => {
    assert.equal(shouldAttemptAuthRefresh(401, false, {}, "refresh-token"), true);
  });

  it("returns false after a retry", () => {
    assert.equal(shouldAttemptAuthRefresh(401, true, {}, "refresh-token"), false);
  });
});
