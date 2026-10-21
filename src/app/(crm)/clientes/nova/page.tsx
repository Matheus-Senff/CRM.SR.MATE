import { AcaoForm, BotaoEnviar } from "@/components/acao-form";
import { criarEmpresa } from "../../actions";
import { CamposEmpresa } from "../campos-empresa";

export default function NovaEmpresa() {
  return (
    <>
      <h1 className="view-title">Nova empresa</h1>
      <p className="view-desc">A empresa entra na sua carteira, com uma primeira negociação em “Novo lead”.</p>
      <AcaoForm action={criarEmpresa} className="card">
        <CamposEmpresa />
        <hr className="sep" />
        <div className="form-grid">
          <label className="field">
            Nome do contato
            <input type="text" name="contato" />
          </label>
          <label className="field">
            Telefone / WhatsApp
            <input type="tel" name="telefone" />
          </label>
          <label className="field">
            E-mail
            <input type="email" name="email" />
          </label>
        </div>
        <hr className="sep" />
        <div className="form-grid">
          <label className="field">
            Título da negociação
            <input type="text" name="titulo" placeholder="Primeiro pedido" />
          </label>
          <label className="field">
            Valor estimado (R$)
            <input type="number" name="valor_estimado" min="0" step="0.01" />
          </label>
        </div>
        <BotaoEnviar>Salvar empresa</BotaoEnviar>
      </AcaoForm>
    </>
  );
}
