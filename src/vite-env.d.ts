/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_HOME?: string;
  readonly VITE_FEATURE_TOURNAMENTS?: string;
  readonly VITE_FEATURE_RANKING?: string;
  readonly VITE_FEATURE_HISTORY?: string;
  readonly VITE_FEATURE_PROFILE?: string;
  readonly VITE_FEATURE_CLUB_DASHBOARD?: string;
  readonly VITE_FEATURE_CLIENTS?: string;
  readonly VITE_FEATURE_COURTS?: string;
  readonly VITE_FEATURE_SCHEDULE?: string;
  readonly VITE_FEATURE_CLUB_SETTINGS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
