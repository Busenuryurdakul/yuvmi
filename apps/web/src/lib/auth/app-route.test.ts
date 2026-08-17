import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAppDestination } from "./app-route.ts";

describe("resolveAppDestination — smoke routing", () => {
  it("landing Giriş (/app) without session goes to login", () => {
    assert.equal(
      resolveAppDestination("/app", { isLoading: false, user: null }),
      "/app/login",
    );
  });

  it("protected /app/* without session goes to login", () => {
    for (const path of ["/app/future-self", "/app/progress", "/app/onboarding"]) {
      assert.equal(
        resolveAppDestination(path, { isLoading: false, user: null }),
        "/app/login",
        path,
      );
    }
  });

  it("login page without session stays", () => {
    assert.equal(
      resolveAppDestination("/app/login", { isLoading: false, user: null }),
      null,
    );
  });

  it("new user opening /app before onboarding goes to /app/onboarding", () => {
    assert.equal(
      resolveAppDestination("/app", {
        isLoading: false,
        user: { onboardingComplete: false },
      }),
      "/app/onboarding",
    );
  });

  it("incomplete onboarding cannot open future-self or progress", () => {
    const user = { onboardingComplete: false };
    assert.equal(
      resolveAppDestination("/app/future-self", { isLoading: false, user }),
      "/app/onboarding",
    );
    assert.equal(
      resolveAppDestination("/app/progress", { isLoading: false, user }),
      "/app/onboarding",
    );
  });

  it("onboarding page is allowed until complete", () => {
    assert.equal(
      resolveAppDestination("/app/onboarding", {
        isLoading: false,
        user: { onboardingComplete: false },
      }),
      null,
    );
  });

  it("after onboarding, /app/onboarding and /app/login open /app", () => {
    const user = { onboardingComplete: true };
    assert.equal(
      resolveAppDestination("/app/onboarding", { isLoading: false, user }),
      "/app",
    );
    assert.equal(
      resolveAppDestination("/app/login", { isLoading: false, user }),
      "/app",
    );
  });

  it("after onboarding, /app and product pages stay", () => {
    const user = { onboardingComplete: true };
    assert.equal(resolveAppDestination("/app", { isLoading: false, user }), null);
    assert.equal(
      resolveAppDestination("/app/future-self", { isLoading: false, user }),
      null,
    );
    assert.equal(
      resolveAppDestination("/app/progress", { isLoading: false, user }),
      null,
    );
  });

  it("after logout, protected pages are unreachable", () => {
    assert.equal(
      resolveAppDestination("/app", { isLoading: false, user: null }),
      "/app/login",
    );
    assert.equal(
      resolveAppDestination("/app/future-self", { isLoading: false, user: null }),
      "/app/login",
    );
    assert.equal(
      resolveAppDestination("/app/progress", { isLoading: false, user: null }),
      "/app/login",
    );
  });

  it("does not redirect while session is hydrating", () => {
    assert.equal(
      resolveAppDestination("/app", { isLoading: true, user: null }),
      null,
    );
  });
});
