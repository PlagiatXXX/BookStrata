/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SMARTCAPTCHA_SITE_KEY: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_OPERATOR_NAME: string
  readonly VITE_OPERATOR_EMAIL: string
  readonly VITE_YM_COUNTER_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Флаг, устанавливаемый prerender-скриптом (Playwright) через page.addInitScript
interface Window {
  __PRERENDER__?: boolean;
}
