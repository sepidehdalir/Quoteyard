/**
 * Discriminated-union result type for Server Actions.
 *
 * Server Actions never throw to the client. They return one of these:
 *  - { ok: true,  data }                — happy path
 *  - { ok: false, formError, fieldErrors? } — known failure modes
 *
 * Unknown errors are caught at the boundary, logged server-side, and
 * collapsed into a generic { ok: false } so internal details never
 * leak.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | {
      ok: false;
      formError: string;
      fieldErrors?: Record<string, string[]>;
    };
