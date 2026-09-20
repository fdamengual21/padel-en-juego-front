/**
 * Comprobaciones puras de permisos contra `scopedPermissions` de `/me`.
 * Write (u otra mutacion del mismo recurso) es superior a read.
 */

export interface HasAccessOptions {
  /** Con varios permisos requeridos: exigir todos (default) o al menos uno. */
  mode?: "all" | "any";
}

export interface AccessSessionContext {
  /** Permisos efectivos del scope activo (plataforma o club). */
  scopedPermissions: readonly string[];
  /** Root de plataforma; bypass solo si el caller lo pide. */
  isRootPlatformAdmin: boolean;
}

const READ_SUFFIX = ".read";

/** True si `granted` cubre `required`. Pedir read pasa si hay write/update/invite/… del mismo recurso. */
export function grantsPermission(
  granted: ReadonlySet<string>,
  required: string,
): boolean {
  if (granted.has(required)) return true;
  if (!required.endsWith(READ_SUFFIX)) return false;
  const prefix = `${required.slice(0, -READ_SUFFIX.length)}.`;
  for (const code of granted) {
    if (code.startsWith(prefix) && code !== required) return true;
  }
  return false;
}

export function hasAccess(
  granted: readonly string[] | ReadonlySet<string>,
  required: string | readonly string[],
  options?: HasAccessOptions,
): boolean {
  const set = granted instanceof Set ? granted : new Set(granted);
  const list = typeof required === "string" ? [required] : [...required];
  if (list.length === 0) return true;
  const mode = options?.mode ?? "all";
  if (mode === "any") {
    return list.some((code) => grantsPermission(set, code));
  }
  return list.every((code) => grantsPermission(set, code));
}

export interface EvaluateSessionAccessInput {
  session: AccessSessionContext;
  treatRootPlatformAdminAsFullAccess: boolean;
  permission: string | readonly string[];
  mode?: "all" | "any";
}

export function evaluateSessionAccess(
  input: EvaluateSessionAccessInput,
): boolean {
  if (
    input.treatRootPlatformAdminAsFullAccess &&
    input.session.isRootPlatformAdmin
  ) {
    return true;
  }
  return hasAccess(input.session.scopedPermissions, input.permission, {
    mode: input.mode,
  });
}

export function getGrantedPermissions(
  scopedPermissions: readonly string[] | null | undefined,
): string[] {
  if (!scopedPermissions || !Array.isArray(scopedPermissions)) return [];
  return scopedPermissions.filter(
    (item): item is string => typeof item === "string",
  );
}
