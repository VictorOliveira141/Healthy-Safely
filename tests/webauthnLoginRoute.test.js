const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const router = require("../app/routes/principalRoutes");

test("login biométrico não é redirecionado pelo middleware de sessão", async (t) => {
  const app = express();
  app.use((req, res, next) => {
    req.session = {};
    next();
  });
  app.use(router);

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => server.close());

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/webauthn/login/options`,
    { method: "POST", redirect: "manual" },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.equal(typeof (await response.json()).challenge, "string");

  const statusResponse = await fetch(
    `http://127.0.0.1:${server.address().port}/webauthn/status`,
    { redirect: "manual" },
  );

  assert.equal(statusResponse.status, 302);
  assert.equal(statusResponse.headers.get("location"), "/login");
});
