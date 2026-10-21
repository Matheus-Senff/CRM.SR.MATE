import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BLING_AUTHORIZE_URL, blingClientId } from "@/lib/bling";
import { exigirAdmin } from "@/lib/sessao";

// Inicia o OAuth do Bling. O Bling volta para /api/bling/callback, a URL
// cadastrada no aplicativo.
export async function GET() {
  await exigirAdmin();
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("bling_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/bling",
  });

  const url = new URL(BLING_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", blingClientId());
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
