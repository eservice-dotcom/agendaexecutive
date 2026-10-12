import { afterEach, describe, expect, it, vi } from "vitest";
import { printContrato } from "./printUtils";

describe("representantes no contrato", () => {
  afterEach(() => vi.restoreAllMocks());

  const render = (fields: Record<string, string> = {}) => {
    const write = vi.fn();
    vi.spyOn(window, "open").mockReturnValue({
      document: { write, close: vi.fn() },
    } as unknown as Window);
    printContrato({ numero_contrato: 1, ...fields });
    return String(write.mock.calls[0]?.[0]);
  };

  it("inclui os dados dos representantes das duas partes", () => {
    const html = render({
      contratante_contato: "Representante Teste",
      contratante_representante_profissao: "Administradora",
      contratante_representante_cpf_rg: "RG: TESTE",
      contratante_representante_telefone: "Telefone Teste",
    });
    expect(html.match(/Representado neste ato por:/g)).toHaveLength(2);
    for (const text of ["Representante Teste", "Administradora", "RG: TESTE", "Telefone Teste", "Rafael Silva da Cunha", "Empresário", "CPF: 899.744.500-63", "(61) 98137-9966"]) {
      expect(html).toContain(text);
    }
  });

  it("mantém o nome existente e deixa os novos campos vazios em contratos antigos", () => {
    const html = render({ contratante_contato: "Contato existente" });
    expect(html).toContain("Contato existente");
    expect(html).toContain('<div class="label">Profissão</div><div class="value"></div>');
    expect(html).not.toContain("undefined");
  });
});