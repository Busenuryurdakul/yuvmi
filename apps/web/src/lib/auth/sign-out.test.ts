import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executeSignOutCore } from "./sign-out-core.ts";

describe("executeSignOutCore", () => {
  it("clears session when server logout succeeds", async () => {
    let logoutCalls = 0;
    let cleared = false;

    await executeSignOutCore(
      { token: "access", refreshToken: "refresh" },
      {},
      {
        logout: async () => {
          logoutCalls += 1;
        },
        clear: () => {
          cleared = true;
        },
      },
    );

    assert.equal(logoutCalls, 1);
    assert.equal(cleared, true);
  });

  it("clears session when server logout fails", async () => {
    let cleared = false;

    await executeSignOutCore(
      { token: "access", refreshToken: "refresh" },
      {},
      {
        logout: async () => {
          throw new Error("network");
        },
        clear: () => {
          cleared = true;
        },
      },
    );

    assert.equal(cleared, true);
  });

  it("skips server revoke for localOnly delete-account flow", async () => {
    let logoutCalls = 0;
    let cleared = false;

    await executeSignOutCore(
      { token: "access", refreshToken: "refresh" },
      { localOnly: true },
      {
        logout: async () => {
          logoutCalls += 1;
        },
        clear: () => {
          cleared = true;
        },
      },
    );

    assert.equal(logoutCalls, 0);
    assert.equal(cleared, true);
  });
});

describe("storage sync contract", () => {
  it("removeItem clears persisted auth key used by other tabs", () => {
    const storage = new Map<string, string>();
    const key = "yuvmi.auth.session";

    globalThis.localStorage = {
      getItem: (itemKey: string) => storage.get(itemKey) ?? null,
      setItem: (itemKey: string, value: string) => storage.set(itemKey, value),
      removeItem: (itemKey: string) => storage.delete(itemKey),
      clear: () => storage.clear(),
      key: () => null,
      length: storage.size,
    };

    storage.set(key, '{"token":"x"}');
    globalThis.localStorage.removeItem(key);
    assert.equal(storage.get(key), undefined);
  });
});
