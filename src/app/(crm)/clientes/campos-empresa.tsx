import { CANAIS, ROTULO_CANAL, UFS, type Canal } from "@/lib/dominio";

export type DadosEmpresa = {
  nome: string;
  canal: Canal;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  compartilhada: boolean;
};

export function CamposEmpresa({ empresa }: { empresa?: DadosEmpresa }) {
  return (
    <>
      <div className="form-grid">
        <label className="field">
          Nome da empresa
          <input type="text" name="nome" required defaultValue={empresa?.nome} />
        </label>
        <label className="field">
          Canal (define a tabela de preço)
          <select name="canal" defaultValue={empresa?.canal ?? "distribuidor"}>
            {CANAIS.map((c) => (
              <option key={c} value={c}>
                {ROTULO_CANAL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          CNPJ / CPF
          <input type="text" name="cnpj" inputMode="numeric" defaultValue={empresa?.cnpj ?? ""} />
        </label>
        <label className="field">
          Cidade
          <input type="text" name="cidade" defaultValue={empresa?.cidade ?? ""} />
        </label>
        <label className="field">
          UF
          <select name="uf" defaultValue={empresa?.uf ?? ""}>
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="check">
        <input type="checkbox" name="compartilhada" defaultChecked={empresa?.compartilhada} />
        Compartilhar com toda a equipe (todos os gestores veem e podem trabalhar esta empresa)
      </label>
    </>
  );
}
