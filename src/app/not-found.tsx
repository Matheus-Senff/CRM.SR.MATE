import Link from "next/link";
import { Marca } from "@/components/logo";

export default function NaoEncontrado() {
  return (
    <main className="login">
      <div className="login-card">
        <div className="login-marca">
          <Marca tamanho={64} />
          <div className="login-nome">Página não encontrada</div>
        </div>
        <Link className="btn btn-primary btn-block btn-lg" href="/">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
