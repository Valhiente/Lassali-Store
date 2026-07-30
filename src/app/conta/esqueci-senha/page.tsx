import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { requestPasswordReset } from "../actions";

export const metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Acesso seguro</p>
        <h1>Recuperar senha</h1>
        <p>Enviaremos um link temporário para o e-mail da sua conta.</p>
        <AuthForm action={requestPasswordReset} submitLabel="Enviar link">
          <label>E-mail<input type="email" name="email" autoComplete="email" required /></label>
        </AuthForm>
        <div className="auth-links"><Link href="/conta/entrar">Voltar para entrar</Link></div>
      </section>
    </main>
  );
}
