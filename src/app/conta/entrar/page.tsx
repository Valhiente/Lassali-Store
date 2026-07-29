import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { login } from "../actions";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Minha conta</p>
        <h1>Bem-vindo de volta</h1>
        <p>Clientes, atacadistas e unidades Forbody usam o mesmo acesso seguro.</p>
        <AuthForm action={login} submitLabel="Entrar">
          <label>E-mail<input type="email" name="email" autoComplete="email" required /></label>
          <label>Senha<input type="password" name="password" autoComplete="current-password" required /></label>
        </AuthForm>
        <div className="auth-links">
          <Link href="/conta/cadastro">Criar conta</Link>
          <Link href="/conta/cadastro-atacado">Cadastrar CNPJ</Link>
          <Link href="/conta/esqueci-senha">Esqueci a senha</Link>
        </div>
      </section>
    </main>
  );
}
