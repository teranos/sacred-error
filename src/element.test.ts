import { beforeAll, describe, expect, test } from "bun:test"
import { Window } from "happy-dom"
import { decode } from "./error"

/* The element touches HTMLElement, customElements and getBoundingClientRect,
   so it needs a document. Loaded into one rather than stubbed, because a
   hand-written browser is the class of thing this element exists inside. */
let define: (name?: string) => void

beforeAll(async () => {
  const window = new Window({ url: "https://example.com", width: 1024, height: 768 })
  const globals = globalThis as unknown as Record<string, unknown>
  globals.window = window
  globals.document = window.document
  globals.HTMLElement = window.HTMLElement
  globals.customElements = window.customElements
  globals.CustomEvent = window.CustomEvent
  globals.ShadowRoot = window.ShadowRoot
  define = (await import("./element")).define
  define()
})

const failure = decode({
  id: "err-csa-1",
  severity: "error",
  context: { surface: "painter", region: "POST /partition", anchor: { x: 40, y: 60 } },
  title: "the partition was not written",
  why: "a buurt claimed by two areas",
  trace: ["csa::check"],
  at: "",
})

function mounted() {
  const element = document.createElement("sacred-error") as HTMLElement & {
    error: unknown
  }
  document.body.append(element)
  element.error = failure
  return element
}

describe("Tim clicks something and it fails", () => {
  test("the title and the reason are both on screen", () => {
    const text = mounted().shadowRoot!.textContent!
    expect(text).toContain("the partition was not written")
    expect(text).toContain("a buurt claimed by two areas")
  })

  test("it says where, so the failure is not anonymous", () => {
    expect(mounted().shadowRoot!.textContent).toContain("painter · POST /partition")
  })

  test("it opens at the cursor rather than at a corner", () => {
    const element = mounted()
    expect(element.style.left).toBe("40px")
    expect(element.style.top).toBe("60px")
  })
})

describe("Spike dismisses it and looks for the wreckage", () => {
  test("dismissing hides the element and does not destroy it", () => {
    const element = mounted()
    const button = element.shadowRoot!.querySelector("button") as HTMLElement
    button.click()
    expect(element.hidden).toBe(true)
    expect(element.error).toBe(failure)
    expect(element.shadowRoot!.textContent).toContain("the partition was not written")
  })

  test("a severity nobody defined never reaches the element", () => {
    expect(() => decode({ ...failure, severity: "critical" })).toThrow()
  })
})
