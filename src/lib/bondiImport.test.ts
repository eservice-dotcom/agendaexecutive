import { describe, expect, it } from "vitest";
import { bondiIdentifiers, parseBondiPassengerText } from "./bondiImport";

describe("Bondi import mapping", () => {
  it("uses the reservation as O.S. and the full service as SHT", () => {
    expect(bondiIdentifiers("N11306", "N11306-1")).toEqual({ os: "N11306", sht: "N11306-1" });
    expect(bondiIdentifiers(undefined, "N11306-3")).toEqual({ os: "N11306", sht: "N11306-3" });
  });
  it("keeps sibling services distinct", () => {
    expect(bondiIdentifiers("N11306", "N11306-1").sht)
      .not.toBe(bondiIdentifiers("N11306", "N11306-3").sht);
  });
  it("reads the telephone next to the passenger name", () => {
    expect(parseBondiPassengerText("Passageiro Teste - +55 (61) 99999-0000", "LA 790"))
      .toEqual([{ nome: "Passageiro Teste", telefone: "+55 (61) 99999-0000", voo: "LA 790" }]);
  });
  it("preserves names without telephone", () => {
    expect(parseBondiPassengerText("Pessoa A\nPessoa B"))
      .toEqual([{ nome: "Pessoa A", telefone: "", voo: "" }, { nome: "Pessoa B", telefone: "", voo: "" }]);
  });
});