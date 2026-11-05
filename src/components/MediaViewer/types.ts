export type MediaViewerFileKind = "image" | "pdf" | "other";

/** Generic viewer item; not tied to a specific upload field. */
export interface MediaViewerItem {
  id: string;
  /** Display and download name. */
  name?: string;
  /** Optional caption shown below the media when present. */
  description?: string;
  /** Remote or relative URL. */
  url?: string;
  /** Local file not yet persisted. */
  file?: File;
  /** MIME hint; inferred from extension or `File` when missing. */
  mimeType?: string;
  /** Explicit kind; skips inference when known. */
  kind?: MediaViewerFileKind;
  /** Custom authenticated download; wins over remote URL. */
  onDownload?: () => Promise<void>;
}
