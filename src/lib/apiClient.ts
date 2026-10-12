export class ApiHttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
  }
}

export interface ApiEnvelope<T> {
  data?: T;
  success?: boolean;
  errors?: string | Record<string, string[]>;
  traceId?: string;
}

export function messageFromEnvelope(
  body: ApiEnvelope<unknown> | null | undefined,
  fallback: string,
): string {
  if (!body) return fallback;
  const { errors } = body;
  if (typeof errors === "string" && errors.trim()) return errors;
  if (errors && typeof errors === "object") {
    const lines = Object.values(errors)
      .flat()
      .filter((line): line is string => typeof line === "string" && line.trim().length > 0);
    if (lines.length > 0) return lines.join("\n");
  }
  return fallback;
}
