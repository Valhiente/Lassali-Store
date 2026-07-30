import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { createSecretClient } from "@/lib/supabase/server";
import { updatePreferences } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preferências de contato" };

export default async function PreferencesPage({ searchParams }: { searchParams: Promise<{ cancelado?: string }> }) {
  const account = await requireAccount();
  const secret = createSecretClient();
  const { data } = secret
    ? await secret.from("marketing_consents").select("channel, purpose, granted").eq("user_id", account.userId)
    : { data: [] };
  const enabled = (channel: string, purpose: string) => Boolean(data?.find((row) => row.channel === channel && row.purpose === purpose)?.granted);
  const params = await searchParams;
  return <main className="auth-page"><section className="auth-card wide">
    <p className="eyebrow">Privacidade</p><h1>Preferências de contato</h1>
    <p>Escolha exatamente quais mensagens deseja receber. Mensagens essenciais do pedido não dependem destas opções.</p>
    {params.cancelado && <div className="form-message success">Contato promocional cancelado.</div>}
    <form action={updatePreferences} className="preference-form">
      <fieldset><legend>E-mail</legend>
        <label className="check"><input type="checkbox" name="emailCart" defaultChecked={enabled("email","cart_recovery")} /> Lembrar carrinhos que eu não finalizei</label>
        <label className="check"><input type="checkbox" name="emailOffers" defaultChecked={enabled("email","offers")} /> Novidades e ofertas</label>
        <label className="check"><input type="checkbox" name="emailReorder" defaultChecked={enabled("email","reorder")} /> Sugestões de recompra e reposição</label>
      </fieldset>
      {account.phone && <fieldset><legend>WhatsApp</legend>
        <label className="check"><input type="checkbox" name="whatsappCart" defaultChecked={enabled("whatsapp","cart_recovery")} /> Lembretes de carrinho</label>
        <label className="check"><input type="checkbox" name="whatsappOffers" defaultChecked={enabled("whatsapp","offers")} /> Novidades e ofertas</label>
      </fieldset>}
      <button type="submit" className="button primary">Salvar preferências</button>
    </form>
    <Link href="/conta">Voltar à conta</Link>
  </section></main>;
}
