import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { registerRetail } from "../actions";

export const metadata = { title: "Criar conta" };

export default function RetailSignupPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Varejo Lassali</p>
        <h1>Crie sua conta</h1>
        <p>Acompanhe pedidos, salve seus dados e receba benefícios quando desejar.</p>
        <AuthForm action={registerRetail} submitLabel="Criar conta">
          <label>Nome completo<input name="fullName" autoComplete="name" required /></label>
          <label>WhatsApp<input name="phone" inputMode="tel" autoComplete="tel" required /></label>
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Senha<input name="password" type="password" autoComplete="new-password" required /></label>
          <label>Confirmar senha<input name="confirmPassword" type="password" autoComplete="new-password" required /></label>
          <small>Use pelo menos 12 caracteres, com letra, número e símbolo.</small>
        </AuthForm>
        <div className="auth-links"><Link href="/conta/entrar">Já tenho conta</Link><Link href="/conta/cadastro-atacado">Sou lojista</Link></div>
      </section>
    </main>
  );
}
