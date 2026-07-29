import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { registerWholesale } from "../actions";

export const metadata = { title: "Cadastro Atacadista" };

export default function WholesaleSignupPage() {
  return (
    <main className="auth-page">
      <section className="auth-card wide">
        <p className="eyebrow">Atacado Lassali</p><h1>Cadastre sua empresa</h1>
        <p>Após a análise do CNPJ, sua conta receberá preços, grades e condições de atacado.</p>
        <AuthForm action={registerWholesale} submitLabel="Enviar para análise">
          <div className="form-grid">
            <label>Nome completo<input name="fullName" autoComplete="name" required /></label>
            <label>WhatsApp<input name="phone" inputMode="tel" autoComplete="tel" required /></label>
            <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
            <label>CNPJ<input name="cnpj" inputMode="numeric" required /></label>
            <label>Razão social<input name="legalName" required /></label>
            <label>Nome fantasia<input name="tradeName" required /></label>
            <label>Inscrição estadual<input name="stateRegistration" /></label>
            <label>Instagram da loja<input name="socialProfile" /></label>
            <label>Cidade<input name="city" required /></label>
            <label>UF<input name="state" maxLength={2} required /></label>
            <label>Compra mensal estimada
              <select name="expectedMonthlyVolume" required defaultValue="">
                <option value="" disabled>Selecione</option>
                <option value="ate-2k">Até R$ 2 mil</option>
                <option value="2k-5k">R$ 2 mil a R$ 5 mil</option>
                <option value="acima-5k">Acima de R$ 5 mil</option>
              </select>
            </label>
            <span />
            <label>Senha<input name="password" type="password" autoComplete="new-password" required /></label>
            <label>Confirmar senha<input name="confirmPassword" type="password" autoComplete="new-password" required /></label>
          </div>
        </AuthForm>
        <div className="auth-links"><Link href="/conta/entrar">Já tenho conta</Link><Link href="/conta/cadastro">Comprar no varejo</Link></div>
      </section>
    </main>
  );
}
