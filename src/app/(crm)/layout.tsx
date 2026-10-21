import { Nav } from "@/components/nav";
import { ROTULO_PAPEL } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/sessao";
import { sair } from "../login/actions";

export default async function CrmLayout({ children }: LayoutProps<"/">) {
  const { supabase, perfil } = await exigirUsuario();
  const { count } = await supabase
    .from("propostas")
    .select("id", { count: "exact", head: true })
    .eq("status", "aguardando_aprovacao");

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">🧉</div>
          <div className="name">CRM SrMATE</div>
        </div>
        <Nav pendentes={count ?? 0} admin={perfil.papel === "admin"} />
        <div className="foot">
          <div>
            <b>{perfil.nome}</b>
          </div>
          <div>{ROTULO_PAPEL[perfil.papel]}</div>
          <form action={sair}>
            <button>Sair</button>
          </form>
        </div>
      </aside>
      <div className="main">
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
