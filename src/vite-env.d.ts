/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SMARTCAPTCHA_SITE_KEY: string
  readonly VITE_OPERATOR_NAME: string
  readonly VITE_OPERATOR_EMAIL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
