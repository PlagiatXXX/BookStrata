const API_BASE = "http://localhost:8080/api";

/**
 * Make authenticated API call.
 */
export async function apiRequest(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Create a tier list via API.
 */
export async function createTierList(
  token: string,
  title: string,
  isPublic = true,
): Promise<{ id: number; slug: string }> {
  const response = await apiRequest("POST", "/tier-lists", token, {
    title,
    isPublic,
    templateId: null,
  });

  if (!response.ok) {
    throw new Error(`Failed to create tier list: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * Get tier list by slug.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTierList(slug: string, token?: string): Promise<any> {
  const response = await apiRequest("GET", `/tier-lists/${slug}`, token);
  if (!response.ok) {
    throw new Error(`Failed to get tier list: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data || data;
}

/**
 * Delete tier list (for cleanup).
 */
export async function deleteTierList(id: number, token: string): Promise<void> {
  await apiRequest("DELETE", `/tier-lists/${id}`, token);
}

/**
 * Get current user info.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCurrentUser(token: string): Promise<any> {
  const response = await apiRequest("GET", "/users/me", token);
  if (!response.ok) {
    throw new Error(`Failed to get current user: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data || data;
}
