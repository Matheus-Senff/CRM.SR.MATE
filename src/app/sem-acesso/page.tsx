import { Marca } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { sair } from "../login/actions";

export default async function SemAcesso() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="login">
      <div className="login-card">
        <div className="login-marca">
          <Marca tamanho={64} />
          <div className="login-nome">SrMATE</div>
        </div>
        <div className="alert alert-warning">
          {user?.email ? `${user.email} ainda não tem perfil liberado.` : "Perfil não encontrado."}
        </div>
        <form action={sair}>
          <button className="btn btn-block btn-lg">Sair</button>
        </form>
      </div>
    </main>
  );
}
