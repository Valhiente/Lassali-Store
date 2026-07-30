"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AcceptAdminInvitePage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  useEffect(() => { createClient()?.auth.getSession().then(({ data }) => setReady(Boolean(data.session))); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) { setMessage("Use 12 caracteres, letra, número e símbolo."); return; }
    if (password !== confirmation) { setMessage("As senhas não coincidem."); return; }
    const supabase = createClient();
    const { error } = supabase ? await supabase.auth.updateUser({ password }) : { error: new Error() };
    if (error) { setMessage("Não foi possível criar a senha."); return; }
    await supabase?.auth.signOut(); setSuccess(true);
  }
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">Lassali Admin</p><h1>Criar acesso</h1>{success ? <><div className="form-message success">Senha criada.</div><Link className="button primary" href="/conta/entrar">Entrar</Link></> : ready ? <form onSubmit={submit}>{message && <div className="form-message error">{message}</div>}<label>Senha<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} /></label><label>Confirmar<input type="password" value={confirmation} onChange={(e)=>setConfirmation(e.target.value)} /></label><button className="button primary">Criar senha</button></form> : <div className="form-message error">Convite inválido ou expirado.</div>}</section></main>;
}
