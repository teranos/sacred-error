// The Sacred Error, in Swift. `src/lib.rs` writes this shape, and `error.ts`
// and `Error.elm` read it; this reads and writes it too, and the tests beside
// it pin the same contract the other three pin. ERROR.md is the axiom.

import Foundation

/// A closed set of four. An unknown label fails the decode, as it does in
/// Rust, TypeScript and Elm: a failure that arrives mislabelled is worse than
/// one that arrives loudly broken.
public enum Severity: String, Codable, Sendable, CaseIterable {
    case info, warn, error, panic
}

/// Where the cursor was when the failing action fired, when a touch fired it.
public struct Anchor: Codable, Equatable, Sendable {
    public var x: Double
    public var y: Double

    public init(x: Double, y: Double) {
        self.x = x
        self.y = y
    }
}

/// Where it happened, which is what decides where it is drawn.
public struct Context: Codable, Equatable, Sendable {
    public var surface: String
    public var region: String?
    public var anchor: Anchor?

    public init(surface: String, region: String? = nil, anchor: Anchor? = nil) {
        self.surface = surface
        self.region = region
        self.anchor = anchor
    }
}

/// One failure, whole. It is an `Error` in Swift's sense too, so it is what
/// is thrown: what crosses a boundary is this value, never its words.
public struct SacredError: Error, Codable, Equatable, Sendable {
    public var id: String
    public var severity: Severity
    public var context: Context
    public var title: String
    public var why: String
    public var trace: [String]
    public var raw: String?
    public var at: String
    public var source: String?
    public var ffiCall: String?
    public var location: String?
    public var jsStack: String?
    public var rawStderr: String?
    public var requiresReload: Bool

    public init(
        id: String, severity: Severity, context: Context, title: String, why: String,
        trace: [String] = [], raw: String? = nil, at: String, source: String? = nil,
        ffiCall: String? = nil, location: String? = nil, jsStack: String? = nil,
        rawStderr: String? = nil, requiresReload: Bool = false
    ) {
        self.id = id
        self.severity = severity
        self.context = context
        self.title = title
        self.why = why
        self.trace = trace
        self.raw = raw
        self.at = at
        self.source = source
        self.ffiCall = ffiCall
        self.location = location
        self.jsStack = jsStack
        self.rawStderr = rawStderr
        self.requiresReload = requiresReload
    }

    // The wire's own spelling, which is serde's: snake_case, as lib.rs writes it.
    enum CodingKeys: String, CodingKey {
        case id, severity, context, title, why, trace, raw, at, source, location
        case ffiCall = "ffi_call"
        case jsStack = "js_stack"
        case rawStderr = "raw_stderr"
        case requiresReload = "requires_reload"
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        severity = try c.decode(Severity.self, forKey: .severity)
        context = try c.decode(Context.self, forKey: .context)
        title = try c.decode(String.self, forKey: .title)
        why = try c.decode(String.self, forKey: .why)
        trace = try c.decodeIfPresent([String].self, forKey: .trace) ?? []
        raw = try c.decodeIfPresent(String.self, forKey: .raw)
        at = try c.decode(String.self, forKey: .at)
        source = try c.decodeIfPresent(String.self, forKey: .source)
        ffiCall = try c.decodeIfPresent(String.self, forKey: .ffiCall)
        location = try c.decodeIfPresent(String.self, forKey: .location)
        jsStack = try c.decodeIfPresent(String.self, forKey: .jsStack)
        rawStderr = try c.decodeIfPresent(String.self, forKey: .rawStderr)
        requiresReload = try c.decodeIfPresent(Bool.self, forKey: .requiresReload) ?? false
    }

    // What lib.rs omits, this omits: an empty trace, an absent field, a false reload.
    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(severity, forKey: .severity)
        try c.encode(context, forKey: .context)
        try c.encode(title, forKey: .title)
        try c.encode(why, forKey: .why)
        if !trace.isEmpty { try c.encode(trace, forKey: .trace) }
        try c.encodeIfPresent(raw, forKey: .raw)
        try c.encode(at, forKey: .at)
        try c.encodeIfPresent(source, forKey: .source)
        try c.encodeIfPresent(ffiCall, forKey: .ffiCall)
        try c.encodeIfPresent(location, forKey: .location)
        try c.encodeIfPresent(jsStack, forKey: .jsStack)
        try c.encodeIfPresent(rawStderr, forKey: .rawStderr)
        if requiresReload { try c.encode(requiresReload, forKey: .requiresReload) }
    }

    /// Stable identity, so one failure is one element wherever it is drawn.
    public var key: String { id }
}

extension SacredError: LocalizedError {
    public var errorDescription: String? { title + ": " + why }
}
