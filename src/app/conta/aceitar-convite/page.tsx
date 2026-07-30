"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { completeUnitInvite } from "./actions";

export default function AcceptInvitePage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    createClient()?.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setMessage("Use 12 caracteres, letra, número e símbolo."); return;
    }
    if (password !== confirmation) { setMessage("As senhas não coincidem."); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = supabase ? await supabase.auth.updateUser({ password }) : { error: new Error() };
    if (error) { setMessage("Não foi possível criar a senha."); setLoading(false); return; }
    const result = await completeUnitInvite();
    if (result.error) { setMessage(result.error); setLoading(false); return; }
    await supabase?.auth.signOut();
    setSuccess(true); setLoading(false);
  }
  return (
    <main className="auth-page"><section className="auth-card">
      <p className="eyebrow">Portal Forbody</p><h1>Ativar acesso da unidade</h1>
      {success ? <><div className="form-message success">Acesso ativado com segurança.</div><Link className="button primary" href="/conta/entrar">Entrar</Link></>
      : ready ? <form onSubmit={submit}>{message && <div className="form-message error">{message}</div>}<label>Nova senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><label>Confirmar senha<input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></label><button className="button primary" disabled={loading}>{loading ? "Ativando..." : "Ativar unidade"}</button></form>
      : <div className="form-message error">Convite inválido, expirado ou já utilizado.</div>}
    </section></main>
  );
}
