import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateChangePasswordInput } from "./change-password-validation.ts";

describe("validateChangePasswordInput", () => {
  it("rejects empty fields", () => {
    const result = validateChangePasswordInput({
      currentPassword: "",
      newPassword: "NewPassword1",
      confirmPassword: "NewPassword1",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /zorunlu/i);
  });

  it("rejects short new password", () => {
    const result = validateChangePasswordInput({
      currentPassword: "OldPassword1",
      newPassword: "short",
      confirmPassword: "short",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /8 karakter/i);
  });

  it("rejects confirm mismatch", () => {
    const result = validateChangePasswordInput({
      currentPassword: "OldPassword1",
      newPassword: "NewPassword1",
      confirmPassword: "OtherPassword1",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /eşleşmiyor/i);
  });

  it("rejects same password", () => {
    const result = validateChangePasswordInput({
      currentPassword: "SamePassword1",
      newPassword: "SamePassword1",
      confirmPassword: "SamePassword1",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /farklı/i);
  });

  it("accepts valid input", () => {
    const result = validateChangePasswordInput({
      currentPassword: "OldPassword1",
      newPassword: "NewPassword2",
      confirmPassword: "NewPassword2",
    });
    assert.equal(result.ok, true);
  });
});
