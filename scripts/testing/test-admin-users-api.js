// Integration test for administrative user management endpoints.
const http = require("http");

async function check() {
  const loginRes = await new Promise((resolve) => {
    const req = http.request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.write(JSON.stringify({ identifier: "admin", password: process.env.ADMIN_TEMP_PASSWORD || "admin2026" }));
    req.end();
  });

  const token = loginRes.session.sessionToken;

  const usersRes = await new Promise((resolve) => {
    const req = http.request("http://localhost:3000/api/admin/users", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.end();
  });

  console.log("Status:", usersRes.status);
  console.log("Body:", usersRes.data);
}

check();

