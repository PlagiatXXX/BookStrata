import type { FullConfig } from "@playwright/test";

const API_BASE = "http://localhost:8080/api";

export default async function globalTeardown(_config: FullConfig) {
  console.log("[Teardown] Cleaning up test data...");

  try {
    // Get admin credentials from test data
    const adminCredentials = {
      username: "e2e_chief",
      password: "StrongPass1!",
    };

    // Login as admin
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(adminCredentials),
    });

    if (!loginResponse.ok) {
      console.warn("[Teardown] Could not login as admin for cleanup");
      return;
    }

    const loginData = await loginResponse.json();
    const adminToken = loginData.data?.accessToken;

    if (!adminToken) {
      console.warn("[Teardown] No admin token received");
      return;
    }

    // List of test users to clean up (created during tests)
    const testUserPatterns = [
      "e2e_newbie",
      "e2e_forker",
      "e2e_commenter",
      "test_user_",
    ];

    // Note: Actual cleanup would require admin API endpoints
    // For now, we log what would be cleaned up
    console.log("[Teardown] Test data cleanup patterns:", testUserPatterns);

    // If there were admin endpoints for user deletion, we'd use them here
    // await fetch(`${API_BASE}/admin/users/bulk-delete`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${adminToken}`,
    //   },
    //   body: JSON.stringify({ patterns: testUserPatterns }),
    // });

    console.log("[Teardown] Cleanup complete");
  } catch (error) {
    console.warn("[Teardown] Cleanup failed (non-critical):", error);
  }
}
