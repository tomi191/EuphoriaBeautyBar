import { describe, expect, it } from "vitest";
import { parseDecimalInput } from "./decimal";

describe("parseDecimalInput", () => {
  it("приема цяло число", () => {
    expect(parseDecimalInput("25")).toBe(25);
  });
  it("приема точка", () => {
    expect(parseDecimalInput("25.50")).toBe(25.5);
  });
  it("приема запетая (БГ клавиатура)", () => {
    expect(parseDecimalInput("25,50")).toBe(25.5);
  });
  it("търпи водещи/крайни интервали", () => {
    expect(parseDecimalInput(" 25,5 ")).toBe(25.5);
  });
  it("отказва празно", () => {
    expect(parseDecimalInput("")).toBeNull();
    expect(parseDecimalInput("   ")).toBeNull();
  });
  it("отказва нечислово и частично числово", () => {
    expect(parseDecimalInput("abc")).toBeNull();
    expect(parseDecimalInput("25лв")).toBeNull();
    expect(parseDecimalInput("25,")).toBeNull();
    expect(parseDecimalInput("-5")).toBeNull();
    expect(parseDecimalInput("1.2.3")).toBeNull();
  });
});
