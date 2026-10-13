const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { MongoClient } = require("mongodb");

// Importing the app loads the same .env files as npm start, but does not listen.
const app = require("../server");
const pool = require("../config/mysql");

const ACCOUNTS = [
  { username: "bme_admin01", password: "BmeAdmin@123", role: "bme_admin" },
  { username: "bme_engineer01", password: "BmeEngineer@123", role: "bme_engineer" },
  { username: "bme_analyst01", password: "BmeAnalyst@123", role: "bme_analyst" }
];

test("integration: seeded MySQL and MongoDB", async (t) => {
  let sql;
  let mongo;
  try {
    sql = await mysql.createConnection({
      host: process.env.MYSQL_HOST || "localhost",
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "medtrack",
      connectTimeout: 2000
    });
    await sql.query("SELECT 1");
    mongo = new MongoClient(process.env.MONGO_URI || "mongodb://localhost:27017", {
      serverSelectionTimeoutMS: 2000
    });
    await mongo.connect();
    await mongo.db(process.env.MONGO_DB || "medtrack_nosql").command({ ping: 1 });
  } catch (error) {
    await Promise.allSettled([sql?.end(), mongo?.close()]);
    const reason = `MySQL or MongoDB unavailable: ${error.message}`;
    if (process.env.INTEGRATION_REQUIRED === "1") assert.fail(reason);
    t.skip(reason);
    return;
  }

  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await Promise.all([sql.end(), mongo.close(), pool.end()]);
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { token, ...options } = {}) {
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
    return { status: response.status, body: await response.json() };
  }

  const tokens = {};
  await t.test("all three seeded accounts can log in", async () => {
    for (const account of ACCOUNTS) {
      const result = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: account.username, password: account.password })
      });
      assert.equal(result.status, 200, `${account.username}: ${result.body.message}`);
      assert.equal(result.body.data.user.role, account.role);
      assert.ok(result.body.data.token);
      tokens[account.role] = result.body.data.token;
    }
  });

  await t.test("unauthenticated access is rejected", async () => {
    const result = await request("/api/devices");
    assert.equal(result.status, 401);
    assert.equal(result.body.success, false);
  });

  const code = `MT-TEST-${process.pid}-${Date.now()}`;
  const [types, manufacturers] = await Promise.all([
    request("/api/devices/device-types", { token: tokens.bme_admin }),
    request("/api/devices/manufacturers", { token: tokens.bme_admin })
  ]);
  assert.equal(types.status, 200);
  assert.equal(manufacturers.status, 200);
  assert.ok(types.body.data.length > 0);
  assert.ok(manufacturers.body.data.length > 0);
  const device = {
    device_code: code,
    device_type_id: types.body.data[0].device_type_id,
    manufacturer_id: manufacturers.body.data[0].manufacturer_id,
    model: "Automated test device"
  };

  await t.test("analyst cannot create an admin-only device", async () => {
    const result = await request("/api/devices", {
      token: tokens.bme_analyst,
      method: "POST",
      body: JSON.stringify(device)
    });
    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
  });

  await t.test("admin can create, read, update and delete a device", async () => {
    let id;
    try {
      const created = await request("/api/devices", {
        token: tokens.bme_admin,
        method: "POST",
        body: JSON.stringify(device)
      });
      assert.equal(created.status, 201, created.body.message);
      id = created.body.data.device_id;
      assert.equal(created.body.data.device_code, code);

      const read = await request(`/api/devices/${id}`, { token: tokens.bme_admin });
      assert.equal(read.status, 200);
      assert.equal(read.body.data.model, device.model);

      const updated = await request(`/api/devices/${id}`, {
        token: tokens.bme_admin,
        method: "PUT",
        body: JSON.stringify({ model: "Updated automated test device" })
      });
      assert.equal(updated.status, 200, updated.body.message);
      assert.equal(updated.body.data.model, "Updated automated test device");

      const deleted = await request(`/api/devices/${id}`, {
        token: tokens.bme_admin,
        method: "DELETE"
      });
      assert.equal(deleted.status, 200);
      const missing = await request(`/api/devices/${id}`, { token: tokens.bme_admin });
      assert.equal(missing.status, 404);
    } finally {
      // A failed assertion must not leave a test record in the developer's database.
      await sql.query("DELETE FROM devices WHERE device_code = ?", [code]);
    }
  });

  await t.test("OLAP summary returns loaded warehouse data", async () => {
    const result = await request("/api/olap/summary", { token: tokens.bme_analyst });
    assert.equal(result.status, 200, result.body.message);
    assert.ok(Number(result.body.data.warehouse_devices) > 0);
  });
});
