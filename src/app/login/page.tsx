"use client";

import { useActionState } from "react";
import { Marca } from "@/components/logo";
import { entrar, type EstadoLogin } from "./actions";

const FOLHAS = [
  { left: "8%", top: "18%", size: 120, delay: "0s", dur: "26s", rot: -20 },
  { left: "78%", top: "12%", size: 90, delay: "-8s", dur: "30s", rot: 35 },
  { left: "86%", top: "66%", size: 140, delay: "-14s", dur: "34s", rot: -50 },
  { left: "14%", top: "74%", size: 100, delay: "-5s", dur: "28s", rot: 60 },
  { left: "48%", top: "86%", size: 70, delay: "-19s", dur: "24s", rot: 10 },
  { left: "58%", top: "6%", size: 60, delay: "-11s", dur: "22s", rot: -75 },
];

function Folha({ left, top, size, delay, dur, rot }: (typeof FOLHAS)[number]) {
  return (
    <svg
      className="folha"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={{ left, top, animationDelay: delay, animationDuration: dur, ["--rot" as string]: `${rot}deg` }}
      aria-hidden
    >
      <path d="M8 40c0-16 10-26 32-28 0 18-10 28-28 30a4 4 0 0 1-4-2z" />
      <path d="M10 39C18 30 26 23 38 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".5" />
    </svg>
  );
}

export default function LoginPage() {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(entrar, {});

  return (
    <main className="login">
      <div className="login-fundo" aria-hidden>
        <span className="blob blob-1" />
        <span className="blob blob-2" />
        <span className="blob blob-3" />
        {FOLHAS.map((f, i) => (
          <Folha key={i} {...f} />
        ))}
      </div>
      <form action={acao} className="login-card">
        <div className="login-marca">
          <Marca tamanho={64} />
          <div className="login-nome">SrMATE</div>
        </div>
        <label className="field">
          E-mail
          <input type="email" name="email" autoComplete="email" placeholder="voce@srmate.com.br" required />
        </label>
        <label className="field">
          Senha
          <input type="password" name="senha" autoComplete="current-password" placeholder="••••••••" required />
        </label>
        {estado.erro && <div className="alert alert-critical">{estado.erro}</div>}
        <button className="btn btn-primary btn-block btn-lg" disabled={pendente}>
          {pendente ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
