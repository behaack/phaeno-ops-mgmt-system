import assert from "node:assert/strict";
import test from "node:test";
import { websiteContactError } from "./websiteContactError.mjs";

test("duplicate signup is identified by its API code, not HTTP 400", async () => {
  const duplicate = await websiteContactError(new Response(JSON.stringify({ error: { code: "email_already_in_use" } }), { status: 400 }));
  assert.match(duplicate, /already have this email/);
  const validation = await websiteContactError(new Response(JSON.stringify({ error: { code: "validation_failed" } }), { status: 400 }));
  assert.match(validation, /check the information/);
  assert.doesNotMatch(validation, /already have/);
});

test("rate limiting and non-JSON server failures give actionable recovery", async () => {
  assert.match(await websiteContactError(new Response("Too many", { status: 429 })), /wait a few minutes/);
  assert.match(await websiteContactError(new Response("Unavailable", { status: 503 })), /entries have been kept/);
  assert.match(await websiteContactError(new Response(JSON.stringify({ error: { code: "recaptcha_rejected" } }), { status: 403 })), /reCAPTCHA/);
});
