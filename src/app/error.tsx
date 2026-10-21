"use client";

import Link from "next/link";
import { Marca } from "@/components/logo";

export default function Erro({ reset }: { reset: () => void }) {
  return (
    <main className="login">
      <div className="login-card">
        <div className="login-marca">
          <Marca tamanho={64} />
          <div className="login-nome">Algo deu errado</div>
        </div>
        <button className="btn btn-primary btn-block btn-lg" onClick={reset}>
          Tentar de novo
        </button>
        <Link className="btn btn-block" href="/" style={{ marginTop: 10 }}>
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
