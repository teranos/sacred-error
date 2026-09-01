/**
 * The Sacred Error, in TypeScript. `lib.rs` writes this shape and
 * `Error.elm` reads it; this is the third reader, and the tests beside it
 * pin the same contract the other two pin.
 */

/** A closed set of four. */
export type Severity = "info" | "warn" | "error" | "panic"

const SEVERITIES: readonly string[] = ["info", "warn", "error", "panic"]

/** Where the cursor was when the failing action fired, when a click fired it. */
export type Anchor = { x: number; y: number }

/** Where it happened, which is what decides where it is drawn. */
export type Context = {
  surface: string
  region?: string
  anchor?: Anchor
}

/** One failure, whole. */
export type SacredError = {
  id: string
  severity: Severity
  context: Context
  title: string
  why: string
  trace?: string[]
  raw?: string
  at: string
  source?: string
  ffi_call?: string
  location?: string
  js_stack?: string
  raw_stderr?: string
  requires_reload?: boolean
}

/** Thrown when a payload claiming to be an Error is not one. */
export class NotAnError extends Error {
  constructor(readonly why: string) {
    super(`not a sacred error: ${why}`)
  }
}

function str(from: Record<string, unknown>, field: string): string {
  const value = from[field]
  if (typeof value !== "string") throw new NotAnError(`${field} is ${typeof value}, want string`)
  return value
}

function optionalStr(from: Record<string, unknown>, field: string): string | undefined {
  const value = from[field]
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string") throw new NotAnError(`${field} is ${typeof value}, want string`)
  return value
}

function anchor(from: unknown): Anchor | undefined {
  if (from === undefined || from === null) return undefined
  const at = from as Record<string, unknown>
  if (typeof at.x !== "number" || typeof at.y !== "number") {
    throw new NotAnError("anchor needs numeric x and y")
  }
  return { x: at.x, y: at.y }
}

/**
 * Read one off the wire. An unknown severity throws rather than defaulting —
 * a failure that arrives mislabelled is worse than one that arrives loudly
 * broken, and Elm's decoder refuses the same way.
 */
export function decode(payload: unknown): SacredError {
  if (typeof payload !== "object" || payload === null) {
    throw new NotAnError(`payload is ${payload === null ? "null" : typeof payload}`)
  }
  const raw = payload as Record<string, unknown>

  const severity = str(raw, "severity")
  if (!SEVERITIES.includes(severity)) {
    throw new NotAnError(`severity "${severity}" is not one of ${SEVERITIES.join(", ")}`)
  }

  const context = raw.context
  if (typeof context !== "object" || context === null) {
    throw new NotAnError("context is missing")
  }
  const inside = context as Record<string, unknown>

  const trace = raw.trace
  if (trace !== undefined && !Array.isArray(trace)) {
    throw new NotAnError("trace is not an array")
  }

  return {
    id: str(raw, "id"),
    severity: severity as Severity,
    context: {
      surface: str(inside, "surface"),
      region: optionalStr(inside, "region"),
      anchor: anchor(inside.anchor),
    },
    title: str(raw, "title"),
    why: str(raw, "why"),
    trace: trace as string[] | undefined,
    raw: optionalStr(raw, "raw"),
    at: str(raw, "at"),
    source: optionalStr(raw, "source"),
    ffi_call: optionalStr(raw, "ffi_call"),
    location: optionalStr(raw, "location"),
    js_stack: optionalStr(raw, "js_stack"),
    raw_stderr: optionalStr(raw, "raw_stderr"),
    requires_reload: raw.requires_reload === true,
  }
}

/** Stable identity, so one failure is one element wherever it is drawn. */
export function key(error: SacredError): string {
  return error.id
}
