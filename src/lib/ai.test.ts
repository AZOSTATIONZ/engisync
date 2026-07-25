import { describe, it, expect } from "vitest";
import { extractJson } from "./ai";

describe("extractJson", () => {
  it("parses a fenced json code block", () => {
    const text = 'Here you go:\n```json\n[{"title":"A","priority":"HIGH"}]\n```';
    const out = extractJson<{ title: string }[]>(text);
    expect(out).toEqual([{ title: "A", priority: "HIGH" }]);
  });

  it("parses a raw json array with surrounding prose", () => {
    const text = 'Sure! [{"title":"Task 1"}] hope that helps';
    const out = extractJson<{ title: string }[]>(text);
    expect(out?.[0].title).toBe("Task 1");
  });

  it("parses a json object", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("returns null when there is no json", () => {
    expect(extractJson("no json here")).toBeNull();
  });
});
