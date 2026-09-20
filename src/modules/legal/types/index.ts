export type LegalDocumentType = "privacy" | "terms";

export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  version: string;
  title: string;
  body: string;
  contentType: string;
  publishedAt: string;
}

export interface CurrentLegalDocuments {
  privacy: LegalDocument;
  terms: LegalDocument;
}
