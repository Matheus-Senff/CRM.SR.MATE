import { NextResponse, type NextRequest } from "next/server";
import { sincronizarProdutos } from "@/lib/bling";

export const maxDuration = 60;

// Chamado pelo cron da Vercel (vercel.json), que envia o CRON_SECRET.
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  try {
    const total = await sincronizarProdutos();
    return NextResponse.json({ produtos: total });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
