import Link from "next/link";
import { Heart, Search, UserRound } from "lucide-react";
import { CartButton } from "./CartButton";

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
          <button type="button" aria-label="Buscar"><Search size={20} /></button>
          <button type="button" aria-label="Favoritos"><Heart size={20} /></button>
          <Link href="/conta/entrar" aria-label="Minha conta"><UserRound size={20} /></Link>
          <CartButton />
        </div>
      </header>
    </>
  );
}
