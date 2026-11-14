"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const handler = require("../api/world-bike.js");

async function invoke(url) {
  const headers = {};
  const res = {
    statusCode: 200,
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    end(payload) { this.payload = JSON.parse(payload); }
  };
  await handler({ method: "GET", url }, res);
  return res;
}

test("world API rejects blank and whitespace GPS coordinates before calling upstream", async () => {
  for (const url of [
    "/api/world-bike?lat=&lng=2.17",
    "/api/world-bike?lat=41.38&lng=",
    "/api/world-bike?lat=%20%20&lng=2.17",
    "/api/world-bike?lat=41.38&lng=%20"
  ]) {
    const res = await invoke(url);
    assert.equal(res.statusCode, 400, url);
    assert.equal(res.payload.code, "INVALID_COORDS", url);
  }
});

test("world API rejects missing and invalid GPS coordinates", async () => {
  for (const url of [
    "/api/world-bike?lng=2.17",
    "/api/world-bike?lat=41.38",
    "/api/world-bike?lat=91&lng=2.17",
    "/api/world-bike?lat=NaN&lng=2.17"
  ]) {
    const res = await invoke(url);
    assert.equal(res.statusCode, 400, url);
    assert.equal(res.payload.code, "INVALID_COORDS", url);
  }
});
