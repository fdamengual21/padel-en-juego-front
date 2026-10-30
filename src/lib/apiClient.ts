export class ApiHttpError extends Error {
  readonly status: number;
  readonly errors: Record<string, string[]> | null;

  constructor(
    message: string,
    status: number,
    errors: Record<string, string[]> | null = null,
  ) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.errors = errors;
  }
}

export interface ApiEnvelope<T> {
  data?: T;
  success?: boolean;
  errors?: string | Record<string, string[]>;
  traceId?: string;
}

export function fieldErrorsFromEnvelope(
  body: ApiEnvelope<unknown> | null | undefined,
): Record<string, string[]> | null {
  const errors = body?.errors;
  if (!errors || typeof errors === "string") return null;
  return errors;
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
