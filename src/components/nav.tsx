"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const ICONES = {
  visao: (
    <Icone>
      <rect x="3" y="3" width="7" height="9" rx="2" />
      <rect x="14" y="3" width="7" height="5" rx="2" />
      <rect x="14" y="12" width="7" height="9" rx="2" />
      <rect x="3" y="16" width="7" height="5" rx="2" />
    </Icone>
  ),
  clientes: (
    <Icone>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M17.5 14.5a6 6 0 0 1 4 5.5" />
    </Icone>
  ),
  funil: (
    <Icone>
      <path d="M4 5h16l-6 7.5V19l-4 2v-8.5z" />
    </Icone>
  ),
  propostas: (
    <Icone>
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </Icone>
  ),
  aprovacoes: (
    <Icone>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </Icone>
  ),
  relatorios: (
    <Icone>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 14 4-4 3 3 5-6" />
    </Icone>
  ),
  configuracoes: (
    <Icone>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Icone>
  ),
};

const ITENS = [
  { href: "/", rotulo: "Visão geral", icone: ICONES.visao },
  { href: "/clientes", rotulo: "Clientes", icone: ICONES.clientes },
  { href: "/funil", rotulo: "Funil de vendas", icone: ICONES.funil },
  { href: "/propostas", rotulo: "Propostas", icone: ICONES.propostas },
  { href: "/aprovacoes", rotulo: "Aprovações", icone: ICONES.aprovacoes },
  { href: "/relatorios", rotulo: "Relatórios", icone: ICONES.relatorios },
];

export function Nav({ pendentes, admin }: { pendentes: number; admin: boolean }) {
  const pathname = usePathname();
  const itens = admin ? [...ITENS, { href: "/configuracoes", rotulo: "Configurações", icone: ICONES.configuracoes }] : ITENS;

  return (
    <nav>
      {itens.map((item) => {
        const ativo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={ativo ? "active" : undefined}>
            {item.icone}
            <span>{item.rotulo}</span>
            {item.href === "/aprovacoes" && pendentes > 0 && <span className="count">{pendentes}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
