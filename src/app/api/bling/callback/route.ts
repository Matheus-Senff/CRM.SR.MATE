import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { trocarCodigoPorToken } from "@/lib/bling";
import { exigirAdmin } from "@/lib/sessao";

export async function GET(request: NextRequest) {
  await exigirAdmin();
  const destino = new URL("/configuracoes", request.url);
  const codigo = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const jar = await cookies();
  const esperado = jar.get("bling_oauth_state")?.value;
  jar.delete({ name: "bling_oauth_state", path: "/api/bling" });

  if (!codigo || !state || state !== esperado) {
    destino.searchParams.set("bling_erro", "resposta inválida do Bling; tente conectar de novo.");
    return NextResponse.redirect(destino);
  }

  try {
    await trocarCodigoPorToken(codigo);
    destino.searchParams.set("bling", "ok");
  } catch (e) {
    destino.searchParams.set("bling_erro", (e as Error).message.slice(0, 300));
  }
  return NextResponse.redirect(destino);
}
