import Link from "next/link";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Minha conta</p>
        <h1>Bem-vindo de volta</h1>
        <p>O destino após o login será definido pelo perfil aprovado.</p>
        <form>
          <label>E-mail<input type="email" name="email" required /></label>
          <label>Senha<input type="password" name="password" required /></label>
          <button className="button primary" type="submit">Entrar</button>
        </form>
        <div className="auth-links"><Link href="/conta/cadastro-atacado">Cadastrar CNPJ</Link><Link href="/">Esqueci minha senha</Link></div>
      </section>
    </main>
  );
}
