export function Marca({ tamanho = 40 }: { tamanho?: number }) {
  return (
    <svg className="logo" viewBox="0 0 48 48" width={tamanho} height={tamanho} aria-hidden>
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3f8a4e" />
          <stop offset="1" stopColor="#1d4a26" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="15" fill="url(#logo-bg)" />
      <path
        d="M14 33c0-10 7-17 19-18 0 11-6 18-16 19a3 3 0 0 1-3-1z"
        fill="#eef6ea"
      />
      <path d="M15.5 32.5C20 27 25 22.5 31.5 17.5" stroke="#2f6d3c" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M19 15c0-2 1.2-3 1.2-4.6S19 8 19 6.5" stroke="#eef6ea" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".8" />
      <path d="M24 13c0-2 1.2-3 1.2-4.6S24 6 24 4.5" stroke="#eef6ea" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".55" />
    </svg>
  );
}

export function Logotipo({ tamanho = 40, claro = false }: { tamanho?: number; claro?: boolean }) {
  return (
    <div className={`logotipo${claro ? " logotipo-claro" : ""}`}>
      <Marca tamanho={tamanho} />
      <div className="logotipo-texto">
        <span className="logotipo-nome">SrMATE</span>
        <span className="logotipo-sub">CRM</span>
      </div>
    </div>
  );
}
