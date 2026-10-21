"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", rotulo: "Visão geral", icone: "📊" },
  { href: "/clientes", rotulo: "Clientes", icone: "👥" },
  { href: "/funil", rotulo: "Funil de vendas", icone: "🧭" },
  { href: "/propostas", rotulo: "Propostas", icone: "🧾" },
  { href: "/aprovacoes", rotulo: "Aprovações", icone: "✅" },
  { href: "/relatorios", rotulo: "Relatórios", icone: "📈" },
];

export function Nav({ pendentes, admin }: { pendentes: number; admin: boolean }) {
  const pathname = usePathname();
  const itens = admin ? [...ITENS, { href: "/configuracoes", rotulo: "Configurações", icone: "⚙️" }] : ITENS;

  return (
    <nav>
      {itens.map((item) => {
        const ativo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={ativo ? "active" : undefined}>
            <span aria-hidden>{item.icone}</span> {item.rotulo}
            {item.href === "/aprovacoes" && pendentes > 0 && <span className="count">{pendentes}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
