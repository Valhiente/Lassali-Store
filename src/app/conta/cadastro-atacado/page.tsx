export const metadata = { title: "Cadastro Atacadista" };

export default function WholesaleSignupPage() {
  return (
    <main className="auth-page">
      <section className="auth-card wide">
        <p className="eyebrow">Atacado Lassali</p><h1>Cadastre sua empresa</h1>
        <p>Após a análise do CNPJ, sua conta receberá acesso aos preços e condições de atacado.</p>
        <form className="form-grid">
          <label>Razão social<input name="legalName" required /></label>
          <label>Nome fantasia<input name="tradeName" required /></label>
          <label>CNPJ<input name="cnpj" inputMode="numeric" required /></label>
          <label>Inscrição estadual<input name="stateRegistration" /></label>
          <label>Responsável<input name="contactName" required /></label>
          <label>WhatsApp<input name="phone" inputMode="tel" required /></label>
          <label>E-mail<input name="email" type="email" required /></label>
          <label>Cidade/UF<input name="city" required /></label>
          <button className="button primary" type="submit">Enviar para análise</button>
        </form>
      </section>
    </main>
  );
}
