import Link from "next/link";
import { Heart, Search, ShoppingBag, UserRound } from "lucide-react";

export function Header() {
  return (
    <>
      <div className="announcement">
        <span>Fabricação própria</span>
        <span>Atacado e varejo</span>
        <span>Envios para todo o Brasil</span>
      </div>
      <header className="header">
        <Link href="/" className="brand" aria-label="Lassali Store">
          LASSALI <strong>STORE</strong>
        </Link>
        <nav className="nav" aria-label="Navegação principal">
          <Link href="/#novidades">Novidades</Link>
          <Link href="/#catalogo">Fitness</Link>
          <Link href="/atacado">Atacado</Link>
          <Link href="/forbody">Forbody</Link>
          <Link href="/unidades-forbody">Portal Unidades</Link>
        </nav>
        <div className="header-actions">
          <button aria-label="Buscar"><Search size={20} /></button>
          <button aria-label="Favoritos"><Heart size={20} /></button>
          <Link href="/conta/entrar" aria-label="Minha conta"><UserRound size={20} /></Link>
          <button aria-label="Sacola"><ShoppingBag size={20} /></button>
        </div>
      </header>
    </>
  );
}
