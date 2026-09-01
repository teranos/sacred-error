# The Sacred Error Axiom

## The axiom

**An Error is a first-class primitive — one typed value that crosses every
layer of the system unchanged.** It gets the architectural treatment any
entity gets: its own module, its own render path, its own CSS surface, its
own contract for how it crosses a boundary.

Errors are sacred. Never collapsed, dropped, swallowed or suppressed. They
land in front of the user, contextually, at the point of interaction.

## What the axiom forbids

1. **Silent drops.** No `Err _ -> (model, Cmd.none)`, no `.catch(() => {})`,
   no `let _ = result` on a `Result` that carries meaningful failure, no
   `unwrap_or_default` on a `Result`, no printing and continuing without the
   pipeline being told.
2. **Stringly-typed envelopes.** A failure crossing a layer boundary must be
   the `Error` type, not a free-form string. Strings rot; typed values
   type-check.
3. **Ad-hoc per-surface renders.** No bespoke "show this red" div in every
   component. The primitive's `view` is the one render path.
4. **Errors visible only in devtools.** Devtools are an admission of failure
   to surface.
5. **Errors without context.** An Error that does not say where it came from
   — which surface, which interaction, which payload — is unactionable.
   No `"decode failed"` without the field path and the raw input.

## What the axiom requires

1. **One type.** `src/lib.rs` and `src/Error.elm` in this repository are the
   same value in two languages, and the tests either side are what keep them
   agreeing. An unknown severity fails the decode rather than defaulting.
2. **One render path.** `Error.view` is canonical. The log uses it, inline
   surfaces use it, the panic banner uses it. A new component that wants to
   show a failure imports it rather than rolling a div.
3. **Routed at every boundary.** Every port decoder, every `Result`
   propagation, every catch, every place that would otherwise print and move
   on goes through the pipeline.
4. **Contextual placement.** An Error declares its context at construction,
   and the renderer places it there.
5. **Stable identity.** Each Error has an id, scoped to a session. The same
   Error shown in the log and inline at its surface is keyed to the same DOM
   node, so a re-render moves it rather than rebuilding it.

## Visual contract

The render is **not a side panel, not a drawer, not a log line somebody has
to scroll to find**. It is an overlay anchored where the failure happened,
styled as a terminal diagnostic block.

**Position — the primary case is the cursor.** The mental model is *I click
on something, it doesn't work, error right there where my cursor is.* The
overlay opens at the cursor's position at the moment the failing action
fired, not at the surface's bounding box. The Error carries an `Anchor` in
its context, captured from the DOM `MouseEvent.clientX/clientY`. It flips
corner if it would clip off-screen.

**Position — the fallback.** A failure with no click behind it — an async
payload that fails to decode, a panic envelope — has no cursor. It anchors
at the surface's bounding box via `surface` and `region`. This is the
minority case.

**Ground**: dark red, `#2a0c0c` filled, `#4a1414` border. Saturated enough to
be impossible to miss without being unreadable. The CSS lives in
`Error.styles`, with the primitive, not in the page.

**Typography**: monospace, pre-wrapped, so multi-line stack content reads
the way it was written.

**Colour inside the block**: a severity ribbon down the left edge — info
`#88f`, warn `#fc6`, error `#f66`, panic `#f0f`. Field labels muted at
`#888`, the title in the severity colour, the cause chain at `#ddd`, and the
trace dimmed to `#aaa` and indented one level so the eye can skip it.

**Content**, in this order:

1. `error:` the one-line title.
2. `why:` the cause chain. For a decode failure, the path plus expected
   versus got. For an FFI failure, which call and which argument.
3. `trace:` the chain leading up to it, drained at the moment of emission.
4. `dismiss [esc]`, small, bottom right.

**Dismissal** is a state transition, not a destroy. The same DOM element
stays, hidden, and the Error stays in the log — so it is recoverable.

This is the sole render for a live Error. A log view is a stripped
historical mirror, for tracing a session, not for attention.

## Consumers

The Rust half is a crate; the Elm half is a package. Each consumer keeps its
own buffer and its own id namespace — `err-rust`, `err-roam`, `err-csa` —
because the id prefix and the clock differ per binary, and a shared bus would
force them to agree on both. That leaves each consumer's own error module at
roughly fifty lines: a thread-local, and thin constructors over these types.
