# sacred-error

One typed failure, in four languages, with one renderer.

`src/lib.rs` is a Rust crate, `src/error.ts` a TypeScript module,
`src/Error.elm` an Elm package, and `Sources/SacredError` a Swift package.
They are the same value: what serde writes, the other three read, down to
the spelling of a severity. The tests on each
side are the whole of the contract, and an unknown severity fails the decode
everywhere rather than defaulting to something survivable.

`src/element.ts` is the render, as a custom element. A `<sacred-error>` mounts
in Svelte, in Elm, and in a plain page, so a failure looks the same wherever
it surfaces — which is the half of the axiom that a shared type alone does
not buy.

[`ERROR.md`](ERROR.md) is the axiom — what it forbids, what it requires, and
what the render looks like, including where the overlay opens.

## Taking it

Rust:

    [dependencies.sacred-error]
    git = "https://github.com/teranos/sacred-error"
    rev = "..."

TypeScript:

    bun add github:teranos/sacred-error

Swift, in `Package.swift` or an XcodeGen `packages:` entry:

    .package(url: "https://github.com/teranos/sacred-error", revision: "...")

Elm:

    "dependencies": {
        "direct": { "teranos/sacred-error": "..." }
    }

## What belongs here, and what doesn't

Here: the shape, the decoder, the render path, the stylesheet the render
carries with it.

Not here: the buffer. Each consumer keeps its own, with its own id prefix —
`err-rust`, `err-roam`, `err-csa` — because a thread-local cannot be
parameterised at runtime and the clock differs per binary. That leaves each
consumer's error module at roughly fifty lines over these types.

Also not here: how a language carries failure internally. In Go that is
[`teranos/errors`](https://github.com/teranos/errors), which wraps
cockroachdb/errors for stacks and sentinels. That is how code holds a failure
on its way up; this is what it emits at the edge. They compose.

## Building

    nix develop

Then `cargo test`, `bun test`, `swift test`, and `elm make --docs=docs.json`. The last is
Elm's own package validator and it is stricter than the compiler: every
exposed value needs documentation, and the module needs to list all of them.
