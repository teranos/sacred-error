/**
 * `<sacred-error>` — the one render, as a custom element so Svelte, Elm and a
 * plain page all mount the same thing rather than each drawing their own.
 *
 * Set `.error` to a decoded `SacredError`. The block places itself at the
 * cursor the failure carries, and flips corner rather than leaving the
 * viewport. See ERROR.md § Visual contract.
 */

import type { SacredError, Severity } from "./error"

const RIBBON: Record<Severity, string> = {
  info: "#88f",
  warn: "#fc6",
  error: "#f66",
  panic: "#f0f",
}

/* From ERROR.md. Saturated enough to be impossible to miss without being
   unreadable, and it does not vary by product — this is a diagnostic
   surface, not a brand one. */
const SHEET = `
:host { position: fixed; z-index: 100000; display: block; }
:host([hidden]) { display: none; }

.block {
  background: #2a0c0c;
  border: 1px solid #4a1414;
  border-left-width: 3px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
  padding: 8px 10px;
  max-width: 46rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.k { color: #888; }
.title { color: inherit; }
.why { color: #ddd; }
.trace { color: #aaa; padding-left: 1.5em; }
.reload { color: #f88; }

.dismiss {
  display: block;
  margin-top: 6px;
  text-align: right;
  color: #6a4a4a;
  font: inherit;
  font-size: 10px;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.dismiss:hover { color: #b88; }
`

/* Kept off the viewport edge. The anchor is where the cursor was, so the box
   opens down-right of it unless that would run out of room. */
const MARGIN = 8

export class SacredErrorElement extends HTMLElement {
  #error: SacredError | null = null
  #root: ShadowRoot

  constructor() {
    super()
    this.#root = this.attachShadow({ mode: "open" })
  }

  set error(value: SacredError | null) {
    this.#error = value
    this.hidden = value === null
    this.#draw()
  }

  get error(): SacredError | null {
    return this.#error
  }

  connectedCallback() {
    document.addEventListener("keydown", this.#onKey)
    this.#draw()
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this.#onKey)
  }

  /* A bound field rather than a method, so the same reference is added and
     removed — and because a private method has no setter to bind onto. */
  #onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !this.hidden) this.#dismiss()
  }

  /* Hiding, not destroying. The same element comes back for the same id, so
     a failure that is dismissed is still recoverable from the log. */
  #dismiss() {
    this.hidden = true
    this.dispatchEvent(new CustomEvent("dismissed", { detail: this.#error }))
  }

  #draw() {
    const error = this.#error
    if (!error) {
      this.#root.replaceChildren()
      return
    }

    const style = document.createElement("style")
    style.textContent = SHEET

    const block = document.createElement("div")
    block.className = "block"
    block.style.color = RIBBON[error.severity]
    block.style.borderLeftColor = RIBBON[error.severity]

    block.append(line("error: ", error.title, "title"))
    block.append(line("why:   ", error.why, "why"))

    const where = [error.context.surface, error.context.region].filter(Boolean).join(" · ")
    if (where) block.append(line("where: ", where, "why"))
    if (error.location) block.append(line("at:    ", error.location, "why"))

    if (error.trace && error.trace.length > 0) {
      block.append(label("trace:"))
      for (const step of error.trace) {
        const row = document.createElement("div")
        row.className = "trace"
        row.textContent = step
        block.append(row)
      }
    }

    if (error.raw) block.append(line("raw:   ", error.raw, "trace"))

    if (error.requires_reload) {
      const row = document.createElement("div")
      row.className = "reload"
      row.textContent = "the module is dead — reload to continue"
      block.append(row)
    }

    const dismiss = document.createElement("button")
    dismiss.className = "dismiss"
    dismiss.textContent = "dismiss [esc]"
    dismiss.addEventListener("click", () => this.#dismiss())
    block.append(dismiss)

    this.#root.replaceChildren(style, block)
    this.#place(error)
  }

  /* The primary case is the cursor. Without one — an async payload that
     failed to decode, a panic envelope — there is nothing to anchor to, so
     the host places it. */
  #place(error: SacredError) {
    const at = error.context.anchor
    if (!at) return

    this.style.left = `${at.x}px`
    this.style.top = `${at.y}px`
    this.style.right = "auto"
    this.style.bottom = "auto"

    const box = this.getBoundingClientRect()
    if (at.x + box.width + MARGIN > window.innerWidth) {
      this.style.left = `${Math.max(MARGIN, at.x - box.width)}px`
    }
    if (at.y + box.height + MARGIN > window.innerHeight) {
      this.style.top = `${Math.max(MARGIN, at.y - box.height)}px`
    }
  }
}

function label(text: string): HTMLElement {
  const row = document.createElement("div")
  row.className = "k"
  row.textContent = text
  return row
}

function line(key: string, value: string, kind: string): HTMLElement {
  const row = document.createElement("div")
  const k = document.createElement("span")
  k.className = "k"
  k.textContent = key
  const v = document.createElement("span")
  v.className = kind
  v.textContent = value
  row.append(k, v)
  return row
}

/** Registers `<sacred-error>`. Calling it twice is a no-op, not a throw. */
export function define(name = "sacred-error"): void {
  if (!customElements.get(name)) customElements.define(name, SacredErrorElement)
}
