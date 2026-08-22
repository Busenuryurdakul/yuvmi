import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APP_LOGIN_PASSWORD_CHANGED_PATH,
  getLoginPasswordUpdatedBanner,
  LOGIN_PASSWORD_UPDATED_MESSAGE,
} from "./login-banners.ts";

describe("getLoginPasswordUpdatedBanner", () => {
  it("shows banner for passwordChanged=1", () => {
    const params = new URLSearchParams("passwordChanged=1");
    assert.equal(getLoginPasswordUpdatedBanner(params), LOGIN_PASSWORD_UPDATED_MESSAGE);
  });

  it("shows banner for reset=1 regression", () => {
    const params = new URLSearchParams("reset=1");
    assert.equal(getLoginPasswordUpdatedBanner(params), LOGIN_PASSWORD_UPDATED_MESSAGE);
  });

  it("returns null without success params", () => {
    const params = new URLSearchParams("");
    assert.equal(getLoginPasswordUpdatedBanner(params), null);
  });
});

describe("APP_LOGIN_PASSWORD_CHANGED_PATH", () => {
  it("uses passwordChanged query flag", () => {
    assert.equal(APP_LOGIN_PASSWORD_CHANGED_PATH, "/app/login?passwordChanged=1");
  });
});
