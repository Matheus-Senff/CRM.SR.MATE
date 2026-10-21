"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "./actions";

export default function LoginPage() {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(entrar, {});

  return (
    <main className="login">
      <form action={acao} className="card login-card">
        <div className="login-marca">
          <span className="mark">🧉</span>
          <div>
            <div className="login-nome">CRM SrMATE</div>
            <div className="muted">Acesso da equipe comercial</div>
          </div>
        </div>
        <label className="field">
          E-mail
          <input type="email" name="email" autoComplete="email" required />
        </label>
        <label className="field">
          Senha
          <input type="password" name="senha" autoComplete="current-password" required />
        </label>
        {estado.erro && <div className="alert alert-critical">{estado.erro}</div>}
        <button className="btn btn-primary btn-block" disabled={pendente}>
          {pendente ? "Entrando…" : "Entrar"}
        </button>
        <p className="muted pequeno">Os acessos são criados pela diretoria no Supabase.</p>
      </form>
    </main>
  );
}
