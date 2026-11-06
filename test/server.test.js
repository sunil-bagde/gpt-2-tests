import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters";
const tempDir = await mkdtemp(join(tmpdir(), "node-auth-test-"));
process.env.DB_PATH = join(tempDir, "test.db");

const { app } = await import("../server.js");
let server;
let baseUrl;
const credentials = { email: "  TEST@example.com ", password: "correct-horse" };

async function postJson(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await rm(tempDir, { recursive: true, force: true });
});

test("GET /health returns a successful health response", async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("responses include Helmet security headers", async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
});

test("JSON request bodies larger than 10kb are rejected", async () => {
  const response = await postJson("/auth/login", {
    email: "a@example.com",
    password: "x".repeat(11_000),
  });

  assert.equal(response.status, 413);
});

test("signup validates email and password", async () => {
  const invalidEmail = await postJson("/auth/signup", {
    email: "not-an-email",
    password: "long-enough",
  });
  assert.equal(invalidEmail.status, 400);
  assert.deepEqual(await invalidEmail.json(), { error: "Invalid email" });

  for (const password of ["short", "x".repeat(73)]) {
    const invalidPassword = await postJson("/auth/signup", {
      email: "validation@example.com",
      password,
    });
    assert.equal(invalidPassword.status, 400);
    assert.deepEqual(await invalidPassword.json(), {
      error: "Password must be 8-72 characters",
    });
  }
});

test("signup normalizes email, returns a token, and rejects duplicate accounts", async () => {
  const response = await postJson("/auth/signup", credentials);
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.deepEqual(result.user, { id: 1, email: "test@example.com" });
  assert.equal(typeof result.token, "string");

  const duplicate = await postJson("/auth/signup", {
    email: "test@example.com",
    password: credentials.password,
  });
  assert.equal(duplicate.status, 409);
  assert.deepEqual(await duplicate.json(), { error: "Email already registered" });
});

test("login accepts valid credentials and rejects invalid credentials", async () => {
  const response = await postJson("/auth/login", {
    email: "TEST@example.com",
    password: credentials.password,
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result.user, { id: 1, email: "test@example.com" });
  assert.equal(typeof result.token, "string");

  for (const invalidCredentials of [
    { email: "test@example.com", password: "wrong-password" },
    { email: "unknown@example.com", password: credentials.password },
  ]) {
    const invalid = await postJson("/auth/login", invalidCredentials);
    assert.equal(invalid.status, 401);
    assert.deepEqual(await invalid.json(), { error: "Invalid email or password" });
  }
});

test("GET /auth/me requires a valid token and returns the authenticated user", async () => {
  const missingToken = await fetch(`${baseUrl}/auth/me`);
  assert.equal(missingToken.status, 401);
  assert.deepEqual(await missingToken.json(), { error: "Missing token" });

  const invalidToken = await fetch(`${baseUrl}/auth/me`, {
    headers: { authorization: "Bearer invalid-token" },
  });
  assert.equal(invalidToken.status, 401);
  assert.deepEqual(await invalidToken.json(), { error: "Invalid or expired token" });

  const login = await postJson("/auth/login", {
    email: "test@example.com",
    password: credentials.password,
  });
  const { token } = await login.json();
  const authenticated = await fetch(`${baseUrl}/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(authenticated.status, 200);
  assert.deepEqual(await authenticated.json(), {
    user: { id: 1, email: "test@example.com" },
  });
});
