const SMARTCAPTCHA_SECRET = process.env.SMARTCAPTCHA_SECRET_KEY || ""

export async function verifySmartCaptchaToken(token: string): Promise<boolean> {
  if (!SMARTCAPTCHA_SECRET) {
    return true
  }

  try {
    const res = await fetch(
      "https://smartcaptcha.yandexcloud.net/validate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: SMARTCAPTCHA_SECRET,
          token,
        }),
      },
    )

    const data = (await res.json()) as { status?: string }
    return data.status === "ok"
  } catch {
    return false
  }
}
