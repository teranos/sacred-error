import { describe, expect, test } from "bun:test"
import { decode, key, NotAnError } from "./error"

/* The same JSON `lib.rs`'s round-trip test asserts against, byte for byte.
   If Rust changes what it writes, this is what fails. */
const fromRust = {
  id: "err-test-1",
  severity: "error",
  context: {
    surface: "rust-ffi",
    region: "deckbuilder",
    anchor: { x: 100.0, y: 50.0 },
  },
  title: "deck preset rejected",
  why: "preset[2].cards is empty",
  trace: ["build_preset_decks"],
  raw: '{"id":"x","cards":[]}',
  at: "1234us",
}

describe("what Rust writes, this reads", () => {
  test("every field arrives", () => {
    const e = decode(fromRust)
    expect(e.id).toBe("err-test-1")
    expect(e.severity).toBe("error")
    expect(e.context.surface).toBe("rust-ffi")
    expect(e.context.region).toBe("deckbuilder")
    expect(e.context.anchor).toEqual({ x: 100, y: 50 })
    expect(e.title).toBe("deck preset rejected")
    expect(e.why).toBe("preset[2].cards is empty")
    expect(e.trace).toEqual(["build_preset_decks"])
    expect(e.at).toBe("1234us")
  })

  test("the omitted fields stay omitted rather than becoming empty", () => {
    const e = decode({
      id: "x",
      severity: "info",
      context: { surface: "test" },
      title: "t",
      why: "w",
      at: "0us",
    })
    expect(e.context.region).toBeUndefined()
    expect(e.context.anchor).toBeUndefined()
    expect(e.trace).toBeUndefined()
    expect(e.raw).toBeUndefined()
    expect(e.requires_reload).toBe(false)
  })

  test("identity is the id, so one failure is one element", () => {
    expect(key(decode(fromRust))).toBe("err-test-1")
  })
})

describe("what it refuses", () => {
  /* The axiom: an unknown severity fails rather than quietly becoming Info.
     Rust refuses it, Elm refuses it, and so does this. */
  test("an unknown severity throws", () => {
    expect(() => decode({ ...fromRust, severity: "critical" })).toThrow(NotAnError)
  })

  test("a missing context throws", () => {
    const { context, ...without } = fromRust
    expect(() => decode(without)).toThrow(NotAnError)
  })

  test("an anchor with a string coordinate throws", () => {
    const bad = { ...fromRust, context: { surface: "s", anchor: { x: "100", y: 50 } } }
    expect(() => decode(bad)).toThrow(NotAnError)
  })

  test("null is not an error", () => {
    expect(() => decode(null)).toThrow(NotAnError)
  })
})
