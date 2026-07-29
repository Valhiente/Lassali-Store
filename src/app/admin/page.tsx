import { requireAdmin } from "@/lib/auth";
import { createSecretClient } from "@/lib/supabase/server";
import { AdminActionForm } from "@/components/AdminForms";
import { inviteForbodyUnit, reviewOrganization, updateAccountAccess } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administração" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const secret = createSecretClient();
  const [{ data: organizations }, { data: accounts }] = secret
    ? await Promise.all([
        secret.from("organizations").select("*").order("created_at", { ascending: false }).limit(100),
        secret.from("account_access").select("user_id, kind, status, admin_role, profiles(full_name, email)").order("created_at", { ascending: false }).limit(100),
      ])
    : [{ data: [] }, { data: [] }];
  return (
    <main className="admin-page">
      <header className="admin-header">
        <div><p className="eyebrow">Lassali Commerce</p><h1>Administração</h1><p>{admin.fullName} · {admin.adminRole}</p></div>
        <a className="button ghost" href="/conta">Minha conta</a>
      </header>

      <section className="admin-section">
        <h2>Convidar unidade Forbody</h2>
        <AdminActionForm action={inviteForbodyUnit} label="Criar unidade e enviar convite" className="admin-form-grid">
          <label>Responsável<input name="fullName" required /></label><label>E-mail<input name="email" type="email" required /></label>
          <label>WhatsApp<input name="phone" required /></label><label>CNPJ<input name="cnpj" required /></label>
          <label>Razão social<input name="legalName" required /></label><label>Nome da unidade<input name="tradeName" required /></label>
          <label>Slug da unidade<input name="unitSlug" placeholder="campo-belo" required /></label><label>Cidade<input name="city" required /></label>
          <label>UF<input name="state" maxLength={2} required /></label>
        </AdminActionForm>
      </section>

      <section className="admin-section">
        <h2>Empresas e unidades</h2>
        <div className="admin-list">
          {(organizations || []).map((organization) => (
            <article key={organization.id}>
              <div><strong>{organization.trade_name || organization.legal_name}</strong><span>{organization.kind} · {organization.cnpj} · {organization.status}</span></div>
              {organization.status === "pending" && (
                <AdminActionForm action={reviewOrganization} label="Aplicar">
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <select name="decision"><option value="approved">Aprovar</option><option value="rejected">Rejeitar</option></select>
                  <input name="reason" placeholder="Motivo, se rejeitado" />
                </AdminActionForm>
              )}
            </article>
          ))}
          {!organizations?.length && <p>Nenhum cadastro empresarial.</p>}
        </div>
      </section>

      <section className="admin-section">
        <h2>Contas e acessos</h2>
        <div className="admin-list">
          {(accounts || []).map((account) => {
            const profile = Array.isArray(account.profiles) ? account.profiles[0] : account.profiles;
            return (
              <article key={account.user_id}>
                <div><strong>{profile?.full_name || profile?.email || account.user_id}</strong><span>{account.kind} · {account.status} {account.admin_role ? `· ${account.admin_role}` : ""}</span></div>
                {admin.adminRole === "full_admin" && (
                  <AdminActionForm action={updateAccountAccess} label="Salvar">
                    <input type="hidden" name="userId" value={account.user_id} />
                    <select name="status" defaultValue={account.status}><option value="active">Ativo</option><option value="pending">Pendente</option><option value="blocked">Bloqueado</option><option value="rejected">Rejeitado</option></select>
                    {account.kind === "admin" && <select name="adminRole" defaultValue={account.admin_role || "viewer"}>{["full_admin","commercial","stock","marketing","finance","support","viewer"].map((role) => <option key={role}>{role}</option>)}</select>}
                    <input name="reason" placeholder="Motivo do bloqueio" />
                  </AdminActionForm>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
