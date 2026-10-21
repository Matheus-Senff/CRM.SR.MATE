import { Logotipo } from "@/components/logo";
import { Nav } from "@/components/nav";
import { ROTULO_PAPEL } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/sessao";
import { sair } from "../login/actions";

export default async function CrmLayout({ children }: LayoutProps<"/">) {
  const { supabase, perfil } = await exigirUsuario();
  const nome = perfil.nome.includes("@") ? perfil.nome.split("@")[0] : perfil.nome;
  const { count } = await supabase
    .from("propostas")
    .select("id", { count: "exact", head: true })
    .eq("status", "aguardando_aprovacao");

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <Logotipo claro />
        </div>
        <Nav pendentes={count ?? 0} admin={perfil.papel === "admin"} />
        <div className="foot">
          <div className="avatar">{nome.trim().charAt(0).toUpperCase()}</div>
          <div className="quem">
            <b>{nome}</b>
            <span>{ROTULO_PAPEL[perfil.papel]}</span>
          </div>
          <form action={sair}>
            <button aria-label="Sair" title="Sair">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
                <path d="M15 8l5 4-5 4" />
                <path d="M20 12H9" />
              </svg>
            </button>
          </form>
        </div>
      </aside>
      <div className="main">
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
