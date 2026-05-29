import { createRequire } from "module"

const require = createRequire(import.meta.url)
const disposableDomains: string[] = require("disposable-email-domains")

const domainSet = new Set(disposableDomains.map((d: string) => d.toLowerCase()))

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) return false
  return domainSet.has(domain)
}
