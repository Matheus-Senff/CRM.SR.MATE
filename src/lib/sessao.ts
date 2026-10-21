import { redirect } from "next/navigation";
import { cache } from "react";
import type { Papel } from "@/lib/dominio";
import { createClient } from "@/lib/supabase/server";

export type Perfil = { id: string; nome: string; papel: Papel };

// Usuário logado e seu perfil. Redireciona para /login se não houver sessão.
export const exigirUsuario = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("perfis").select("id, nome, papel").eq("id", user.id).single<Perfil>();
  if (!perfil) redirect("/login");

  return { supabase, user, perfil };
});

export async function exigirAdmin() {
  const sessao = await exigirUsuario();
  if (sessao.perfil.papel !== "admin") redirect("/");
  return sessao;
}
