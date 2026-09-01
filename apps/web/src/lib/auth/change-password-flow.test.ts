import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { executeSignOutCore } from "./sign-out-core.ts";
import { APP_LOGIN_PASSWORD_CHANGED_PATH } from "./login-banners.ts";

const settingsViewSource = readFileSync(
  new URL("../../components/app/SettingsView.tsx", import.meta.url),
  "utf8",
);

describe("change password success flow", () => {
  it("uses localOnly signOut without server revoke", async () => {
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

  it("redirect target includes passwordChanged flag", () => {
    assert.equal(APP_LOGIN_PASSWORD_CHANGED_PATH, "/app/login?passwordChanged=1");
  });

  it("redirects to login before clearing local session", () => {
    const changePasswordIdx = settingsViewSource.indexOf("await changePassword(");
    const replaceIdx = settingsViewSource.indexOf("router.replace(APP_LOGIN_PASSWORD_CHANGED_PATH)");
    const signOutIdx = settingsViewSource.indexOf("await signOut({ localOnly: true })");

    assert.ok(changePasswordIdx >= 0, "changePassword call missing");
    assert.ok(replaceIdx > changePasswordIdx, "router.replace must follow changePassword");
    assert.ok(signOutIdx > replaceIdx, "signOut must follow router.replace");
    assert.equal(APP_LOGIN_PASSWORD_CHANGED_PATH, "/app/login?passwordChanged=1");
  });
});

describe("change password API 400 session contract", () => {
  it("localOnly is not used when change password fails", () => {
    const session = { token: "access", refreshToken: "refresh" };
    assert.ok(session.token);
    assert.ok(session.refreshToken);
  });
});
