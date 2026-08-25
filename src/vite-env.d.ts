/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CUSTOM_DOMAIN?: string;
  readonly VITE_APP_DOMAIN?: string;
  readonly VITE_DOMAIN?: string;
  readonly VITE_SITE_ENABLED?: string;
  readonly VITE_ENABLED_PAGES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
