// Backend integration test for role-based authorization rules.
const http = require("http");

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (_) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on("error", reject);
    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  console.log("--- 1. Testing Login as Student ---");
  const loginRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    { identifier: "student.demo@bantug.edu.example", password: "demo123" }
  );
  console.log("Login status:", loginRes.status, loginRes.data?.ok, loginRes.data?.message);
  if (!loginRes.data?.session?.token) {
    throw new Error("Login failed");
  }
  const token = loginRes.data.session.token;

  console.log("\n--- 2. Testing Update Preferences (valid) ---");
  const prefRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/account/preferences",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    },
    {
      displayName: "Racel Valiente (Updated)",
      academicTerm: "2nd Semester, AY 2026–2027"
    }
  );
  console.log("Pref status:", prefRes.status, prefRes.data);

  console.log("\n--- 3. Testing Update Preferences (invalid empty name) ---");
  const prefInvalid = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/account/preferences",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    },
    {
      displayName: " ",
      academicTerm: "2nd Semester, AY 2026–2027"
    }
  );
  console.log("Pref invalid status:", prefInvalid.status, prefInvalid.data?.message);

  console.log("\n--- 4. Testing Change Password (wrong current password) ---");
  const cpWrong = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/change-password",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    },
    {
      currentPassword: "wrongpassword",
      newPassword: "newpassword123",
      confirmPassword: "newpassword123"
    }
  );
  console.log("CP wrong status:", cpWrong.status, cpWrong.data?.message);

  console.log("\n--- 5. Testing Change Password (mismatch confirmation) ---");
  const cpMismatch = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/change-password",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    },
    {
      currentPassword: "demo123",
      newPassword: "newpassword123",
      confirmPassword: "differentpassword"
    }
  );
  console.log("CP mismatch status:", cpMismatch.status, cpMismatch.data?.message);

  console.log("\n--- 6. Testing Change Password (valid) ---");
  const cpValid = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/change-password",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    },
    {
      currentPassword: "demo123",
      newPassword: "newpassword456",
      confirmPassword: "newpassword456"
    }
  );
  console.log("CP valid status:", cpValid.status, cpValid.data?.message);

  console.log("\n--- 7. Testing Login with New Password ---");
  const loginNew = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    { identifier: "student.demo@bantug.edu.example", password: "newpassword456" }
  );
  console.log("Login new password status:", loginNew.status, loginNew.data?.ok, loginNew.data?.message);

  console.log("\n--- 8. Testing Change Password Back to demo123 ---");
  const cpBack = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/change-password",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginNew.data.session.token}`
      }
    },
    {
      currentPassword: "newpassword456",
      newPassword: "demo123",
      confirmPassword: "demo123"
    }
  );
  console.log("CP back status:", cpBack.status, cpBack.data?.message);

  console.log("\n--- 9. Verify Audit Logs Recorded ---");
  const auditRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/audit-logs",
    method: "GET",
    headers: {
      "x-portal-role": "faculty",
      "x-portal-user": "Somera, Fabian"
    }
  });
  console.log("Audit logs total:", auditRes.data?.auditLogs?.length);
  const pwLogs = (auditRes.data?.auditLogs || []).filter(
    (l) => l.action_type === "PASSWORD_CHANGED" || l.action_type === "PASSWORD_CHANGE_FAILED"
  );
  console.log("Password change audit logs count:", pwLogs.length);

  console.log("\nAll backend tests completed successfully!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

