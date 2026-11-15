import Foundation
import XCTest

@testable import SacredError

// The same JSON lib.rs's round-trip test asserts against, byte for byte. If
// Rust changes what it writes, this is what fails.
private let fromRust = #"""
    {"id":"err-test-1","severity":"error","context":{"surface":"rust-ffi","region":"deckbuilder","anchor":{"x":100.0,"y":50.0}},"title":"deck preset rejected","why":"preset[2].cards is empty","trace":["build_preset_decks"],"raw":"{\"id\":\"x\",\"cards\":[]}","at":"1234us"}
    """#

private func decoded(_ json: String) throws -> SacredError {
    try JSONDecoder().decode(SacredError.self, from: Data(json.utf8))
}

private func object(_ error: SacredError) throws -> [String: Any] {
    let data = try JSONEncoder().encode(error)
    return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
}

final class WhatRustWritesThisReads: XCTestCase {
    func testEveryFieldArrives() throws {
        let e = try decoded(fromRust)
        XCTAssertEqual(e.id, "err-test-1")
        XCTAssertEqual(e.severity, .error)
        XCTAssertEqual(e.context, Context(surface: "rust-ffi", region: "deckbuilder", anchor: Anchor(x: 100, y: 50)))
        XCTAssertEqual(e.title, "deck preset rejected")
        XCTAssertEqual(e.why, "preset[2].cards is empty")
        XCTAssertEqual(e.trace, ["build_preset_decks"])
        XCTAssertEqual(e.raw, #"{"id":"x","cards":[]}"#)
        XCTAssertEqual(e.at, "1234us")
        XCTAssertEqual(e.key, "err-test-1")
    }

    func testWhatItWritesRoundTrips() throws {
        let e = try decoded(fromRust)
        XCTAssertEqual(try JSONDecoder().decode(SacredError.self, from: JSONEncoder().encode(e)), e)
    }

    func testTheSourceFieldsKeepTheirSnakeCaseNames() throws {
        let e = SacredError(
            id: "err-panic-1", severity: .panic, context: Context(surface: "prompt"), title: "wasm trapped",
            why: "panicked at lib.rs:42:8", at: "9876us", source: "rust-panic", ffiCall: "tsot_apply_action",
            location: "src/lib.rs:42:8", rawStderr: "thread main panicked\n", requiresReload: true)
        let v = try object(e)
        XCTAssertEqual(v["source"] as? String, "rust-panic")
        XCTAssertEqual(v["ffi_call"] as? String, "tsot_apply_action")
        XCTAssertEqual(v["location"] as? String, "src/lib.rs:42:8")
        XCTAssertEqual(v["raw_stderr"] as? String, "thread main panicked\n")
        XCTAssertEqual(v["requires_reload"] as? Bool, true)
        XCTAssertNil(v["js_stack"], "an absent field is omitted")
    }

    func testWhatIsDefaultIsOmitted() throws {
        let v = try object(SacredError(id: "x", severity: .info, context: Context(surface: "test"), title: "t", why: "w", at: "0us"))
        for omitted in ["trace", "raw", "source", "ffi_call", "location", "js_stack", "raw_stderr", "requires_reload"] {
            XCTAssertNil(v[omitted], "\(omitted) should be omitted")
        }
        let context = try XCTUnwrap(v["context"] as? [String: Any])
        XCTAssertNil(context["region"])
        XCTAssertNil(context["anchor"])
    }
}

final class WhatItRefuses: XCTestCase {
    // The axiom: an unknown severity fails rather than quietly becoming info.
    // Rust refuses it, TypeScript refuses it, Elm refuses it, and so does this.
    func testAnUnknownSeverityFails() {
        XCTAssertThrowsError(try decoded(fromRust.replacingOccurrences(of: #""error""#, with: #""critical""#)))
    }

    func testAMissingContextFails() {
        XCTAssertThrowsError(try decoded(#"{"id":"x","severity":"info","title":"t","why":"w","at":"0us"}"#))
    }

    func testAnAnchorWithAStringCoordinateFails() {
        XCTAssertThrowsError(
            try decoded(#"{"id":"x","severity":"info","context":{"surface":"s","anchor":{"x":"100","y":50}},"title":"t","why":"w","at":"0us"}"#))
    }

    func testNullIsNotAnError() {
        XCTAssertThrowsError(try decoded("null"))
    }
}
