const VK_CLIENT_ID = process.env.VK_CLIENT_ID || ""
const VK_CLIENT_SECRET = process.env.VK_CLIENT_SECRET || ""
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ""
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ""
const CLIENT_URL = process.env.CLIENT_URL || ""

export interface OAuthUserInfo {
  id: string
  email: string
  username: string
  avatarUrl?: string
}

// VK OAuth
export function getVkAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: VK_CLIENT_ID,
    redirect_uri: `${CLIENT_URL}/api/auth/oauth/vk/callback`,
    display: "page",
    scope: "email",
    response_type: "code",
    state,
  })
  return `https://oauth.vk.com/authorize?${params}`
}

export async function getVkToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: VK_CLIENT_ID,
    client_secret: VK_CLIENT_SECRET,
    redirect_uri: `${CLIENT_URL}/api/auth/oauth/vk/callback`,
    code,
  })

  const res = await fetch(`https://oauth.vk.com/access_token?${params}`)
  const data = (await res.json()) as {
    access_token?: string
    email?: string
    error?: string
    user_id?: number
  }

  if (data.error || !data.access_token) {
    throw new Error("VK OAuth failed: " + (data.error || "no token"))
  }

  // Get user info
  const infoRes = await fetch(
    `https://api.vk.com/method/users.get?${new URLSearchParams({
      access_token: data.access_token,
      v: "5.131",
      fields: "photo_200",
    })}`,
  )
  const infoData = (await infoRes.json()) as {
    response?: Array<{
      id: number
      first_name: string
      last_name: string
      photo_200?: string
    }>
  }

  const userInfo = infoData.response?.[0]
  if (!userInfo) {
    throw new Error("VK API: user info not found")
  }

  return JSON.stringify({
    id: String(userInfo.id),
    email: data.email || "",
    username: `${userInfo.first_name} ${userInfo.last_name}`,
    avatarUrl: userInfo.photo_200,
  })
}

// Google OAuth
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${CLIENT_URL}/api/auth/oauth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function getGoogleToken(code: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${CLIENT_URL}/api/auth/oauth/google/callback`,
      grant_type: "authorization_code",
    }),
  })

  const tokenData = (await res.json()) as {
    access_token?: string
    error?: string
  }

  if (tokenData.error || !tokenData.access_token) {
    throw new Error("Google OAuth failed: " + (tokenData.error || "no token"))
  }

  const infoRes = await fetch(
    `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`,
  )
  const userInfo = (await infoRes.json()) as {
    id?: string
    email?: string
    name?: string
    picture?: string
  }

  if (!userInfo.id) {
    throw new Error("Google API: user info not found")
  }

  return JSON.stringify({
    id: userInfo.id,
    email: userInfo.email || "",
    username: userInfo.name || "",
    avatarUrl: userInfo.picture,
  })
}

export function parseOAuthUserData(raw: string): OAuthUserInfo {
  return JSON.parse(raw)
}
