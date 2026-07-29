"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validPassword } from "@/lib/validation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validPassword(password)) {
      setMessage("Use 12 caracteres, com letra, número e símbolo.");
      return;
    }
    if (password !== confirmation) {
      setMessage("As senhas não coincidem.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setMessage("Recuperação temporariamente indisponível.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage("O link expirou ou é inválido. Solicite um novo.");
      return;
    }
    setMessage("");
    setSuccess(true);
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Acesso seguro</p>
        <h1>Definir nova senha</h1>
        {success ? (
          <>
            <div className="form-message success">Senha alterada com segurança.</div>
            <Link className="button primary" href="/conta/entrar">Entrar</Link>
          </>
        ) : (
          <form onSubmit={submit}>
            {message ? <div className="form-message error">{message}</div> : null}
            <label>Nova senha<input type="password" value={password} autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} required /></label>
            <label>Confirmar senha<input type="password" value={confirmation} autoComplete="new-password" onChange={(event) => setConfirmation(event.target.value)} required /></label>
            <button className="button primary" disabled={loading}>{loading ? "Salvando..." : "Alterar senha"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
