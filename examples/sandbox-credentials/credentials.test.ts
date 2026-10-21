import { test } from "node:test";
import assert from "node:assert/strict";
import { issueCredentials, assertEnvironment, type Requester } from "./credentials.ts";

const newDeveloper: Requester = { email: "dev@example.com", emailVerified: true, kybApproved: false };

test("a verified developer gets sandbox credentials with no business verification", () => {
  const result = issueCredentials(newDeveloper, "sandbox");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.match(result.bundle.clientId, /^sbx_/);
    assert.equal(result.bundle.secretRetrievable, true);
  }
});

test("an unverified email is refused with an actionable next step", () => {
  const result = issueCredentials({ ...newDeveloper, emailVerified: false }, "sandbox");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.nextStep, /verification link/);
});

test("production stays gated on business verification", () => {
  const result = issueCredentials(newDeveloper, "production");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.nextStep, /sandbox/);
});

test("production secrets are one-time reveal; sandbox secrets are not", () => {
  const approved = { ...newDeveloper, kybApproved: true };
  const prod = issueCredentials(approved, "production");
  const sandbox = issueCredentials(approved, "sandbox");
  assert.ok(prod.ok && sandbox.ok);
  if (prod.ok && sandbox.ok) {
    assert.equal(prod.bundle.secretRetrievable, false);
    assert.equal(sandbox.bundle.secretRetrievable, true);
  }
});

test("a sandbox key cannot be used against production", () => {
  const result = issueCredentials(newDeveloper, "sandbox");
  assert.ok(result.ok);
  if (result.ok) {
    assert.throws(() => assertEnvironment(result.bundle.clientId, "production"), /sandbox credential/);
    assert.doesNotThrow(() => assertEnvironment(result.bundle.clientId, "sandbox"));
  }
});
