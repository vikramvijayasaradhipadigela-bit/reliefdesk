// Smoke test: node test.js  (uses a temporary database)
process.env.DB_FILE = ":memory:";
process.env.ADMIN_PASS = "testpass";
process.env.JWT_SECRET = "test-secret";
const assert = require("assert");
const app = require("./server");
const srv = app.listen(0, async () => {
  const base = `http://localhost:${srv.address().port}/api`;
  const j = async (p, o = {}) => { const r = await fetch(base + p, { ...o, headers: { "Content-Type": "application/json", ...(o.headers || {}) }, body: o.body && JSON.stringify(o.body) }); return [r.status, await r.json()]; };
  try {
    let [s, b] = await j("/requests", { method: "POST", body: { name: "", phone: "1" } });
    assert.equal(s, 400);
    [s, b] = await j("/requests", { method: "POST", body: { name: "Test", phone: "9876543210", type: "Rescue", urgency: "Critical", people: 6, vuln: ["Elderly"], location: "Ward 12" } });
    assert.equal(s, 201); const id = b.id;
    [s, b] = await j("/track/" + id); assert.equal(s, 200); assert.equal(b.status, "New"); assert.ok(!b.phone);
    [s] = await j("/requests"); assert.equal(s, 401);
    [s, b] = await j("/login", { method: "POST", body: { username: "admin", password: "wrong" } }); assert.equal(s, 401);
    [s, b] = await j("/login", { method: "POST", body: { username: "admin", password: "testpass" } }); assert.equal(s, 200);
    const h = { Authorization: "Bearer " + b.token };
    [s, b] = await j("/requests", { headers: h }); assert.equal(b.length, 1); assert.equal(b[0].priority, "High");
    [s, b] = await j("/requests/" + id, { method: "PATCH", headers: h, body: { team: "Rescue Team B" } }); assert.equal(b.status, "Assigned");
    console.log("All tests passed"); srv.close(); process.exit(0);
  } catch (e) { console.error("FAILED:", e.message); srv.close(); process.exit(1); }
});
