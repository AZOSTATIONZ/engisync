import { describe, it, expect } from "vitest";
import { buildStorageKey } from "@/lib/storage";
import { fileLocation } from "@/lib/file-bytes";

/**
 * `fileLocation` decides where every download reads from. Getting it wrong
 * does not throw — it silently serves the wrong thing, or refuses a perfectly
 * good file with a message about links. Both happened in review while wiring
 * this up, which is why the precedence is pinned here.
 */
describe("fileLocation", () => {
  it("prefers object storage over a leftover database copy", () => {
    // THE MIGRATION-WINDOW CASE. The backfill writes the object, verifies it,
    // and only then clears `data`. A row with both is legitimate and must be
    // served from its new home, so the copy is exercised BEFORE anything is
    // deleted.
    expect(
      fileLocation({ storageKey: "evidence/w1/abc.pdf", data: Buffer.from("x") }),
    ).toBe("object-storage");
  });

  it("reads legacy rows from the database", () => {
    expect(fileLocation({ data: Buffer.from("x") })).toBe("database");
  });

  it("treats a URL with no bytes as a link", () => {
    expect(fileLocation({ externalUrl: "https://github.com/a/b" })).toBe("link");
  });

  it("does NOT call a stored file a link just because the blob column is empty", () => {
    // The bug this exists to prevent. "No bytes in Postgres" used to be a
    // synonym for "is a link"; once uploads live in object storage that
    // synonym breaks, and sharing every new upload would have been refused
    // with a baffling message about URLs.
    expect(fileLocation({ storageKey: "evidence/w1/abc.pdf", data: null })).not.toBe("link");
  });

  it("reports missing when there is nothing at all", () => {
    expect(fileLocation({})).toBe("missing");
    expect(fileLocation({ data: null, storageKey: null, externalUrl: null })).toBe("missing");
  });
});

describe("buildStorageKey", () => {
  it("never collides for the same filename in the same project", () => {
    const keys = new Set(
      Array.from({ length: 200 }, () => buildStorageKey("ws_1", "report.pdf")),
    );
    expect(keys.size).toBe(200);
  });

  it("keeps the extension so downloads carry the right type", () => {
    expect(buildStorageKey("ws_1", "final report.PDF")).toMatch(/\.pdf$/);
    expect(buildStorageKey("ws_1", "schematic.kicad_pcb")).toMatch(/\.kicad_pcb$/);
  });

  it("falls back to .bin rather than inventing an extension", () => {
    expect(buildStorageKey("ws_1", "Makefile")).toMatch(/\.bin$/);
  });

  it("cannot be steered out of its prefix by a hostile name or workspace", () => {
    // The key is built from ids and randomness, never from the raw filename,
    // so path traversal has nothing to work with. Pinned so a future "nicer
    // keys use the original name" change has to fail a test first.
    const key = buildStorageKey("../../etc", "../../../etc/passwd");
    expect(key.startsWith("evidence/")).toBe(true);
    expect(key).not.toContain("..");
    expect(key).not.toContain("passwd");
  });
});
