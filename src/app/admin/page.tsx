import { requireAdmin } from "@/lib/auth";
import { createSecretClient } from "@/lib/supabase/server";
import { AdminActionForm } from "@/components/AdminForms";
import { getMercadoPagoCheckoutConfig } from "@/lib/checkout-config";
import { inviteForbodyUnit, receiveInventory, reviewOrganization, reviewUnitStockOrder, saveMercadoPagoCheckout, updateAccountAccess, updateInventoryPolicy, verifyMercadoPagoCheckout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administração" };

type InventoryRow = {
  id: string;
  sku: string;
  color: string | null;
  size: string | null;
  stock: number;
  reserved_stock: number;
  retail_safety_stock: number;
  unit_safety_stock: number;
  low_stock_threshold: number;
  products: { name: string; storefront: string } | { name: string; storefront: string }[];
};

export default async function AdminPage() {
  const admin = await requireAdmin();
  const secret = createSecretClient();
  const [{ data: organizations }, { data: accounts }, { data: variants }, { data: unitOrders }] = secret
    ? await Promise.all([
        secret.from("organizations").select("*").order("created_at", { ascending: false }).limit(100),
        secret.from("account_access").select("user_id, kind, status, admin_role, profiles(full_name, email)").order("created_at", { ascending: false }).limit(100),
        secret.from("product_variants").select("id, sku, color, size, stock, reserved_stock, retail_safety_stock, unit_safety_stock, low_stock_threshold, products!inner(name, storefront)").order("sku"),
        secret.from("orders").select("id, created_at, status, organization_id, organizations(trade_name, legal_name), order_items(product_name, sku, quantity)").eq("channel", "forbody_unit").eq("status", "draft").order("created_at", { ascending: true }).limit(100),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const inventory = (variants || []) as unknown as InventoryRow[];
  const canStock = admin.adminRole === "full_admin" || admin.adminRole === "stock";
  const canManagePayments = admin.adminRole === "full_admin" || admin.adminRole === "finance";
  const paymentConfig = await getMercadoPagoCheckoutConfig();
  const paymentReady = paymentConfig.enabled && Boolean(paymentConfig.accessToken && paymentConfig.webhookSecret && paymentConfig.flatShipping !== null);

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div><p className="eyebrow">Lassali Commerce</p><h1>Administração</h1><p>{admin.fullName} · {admin.adminRole}</p></div>
        <a className="button ghost" href="/conta">Minha conta</a>
      </header>

      <section className="admin-section payment-settings">
        <div className="admin-section-title">
          <div><p className="eyebrow">Pagamento integrado</p><h2>Checkout Mercado Pago</h2></div>
          <span className={paymentReady ? "integration-status ready" : "integration-status pending"}>{paymentReady ? "Ativo" : "Configuração pendente"}</span>
        </div>
        <p>Configure o Checkout Pro real sem colocar credenciais no código. Os segredos ficam criptografados e nunca voltam a aparecer na tela.</p>
        <div className="integration-summary">
          <span><strong>Ambiente</strong>{paymentConfig.environment === "production" ? "Produção" : "Teste"}</span>
          <span><strong>Frete fixo</strong>{paymentConfig.flatShipping === null ? "Não definido" : paymentConfig.flatShipping.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          <span><strong>Access Token</strong>{paymentConfig.accessToken ? "Configurado" : "Pendente"}</span>
          <span><strong>Webhook</strong>{paymentConfig.webhookSecret ? "Configurado" : "Pendente"}</span>
        </div>
        {canManagePayments ? <>
          <AdminActionForm action={saveMercadoPagoCheckout} label="Validar e salvar configuração" className="admin-form-grid payment-form">
            <label>Ambiente<select name="environment" defaultValue={paymentConfig.environment}><option value="test">Teste</option><option value="production">Produção real</option></select></label>
            <label>Frete fixo (R$)<input name="flatShipping" inputMode="decimal" defaultValue={paymentConfig.flatShipping ?? 24.9} required /></label>
            <label>Access Token<input name="accessToken" type="password" autoComplete="new-password" placeholder={paymentConfig.accessToken ? "Configurado — deixe vazio para manter" : "TEST-... ou APP_USR-..."} /></label>
            <label>Assinatura secreta do webhook<input name="webhookSecret" type="password" autoComplete="new-password" placeholder={paymentConfig.webhookSecret ? "Configurada — deixe vazio para manter" : "Cole a assinatura secreta"} /></label>
            <label className="check payment-toggle"><input name="enabled" type="checkbox" defaultChecked={paymentConfig.enabled} /> Ativar checkout após validar</label>
            <small>Webhook: <code>{`${process.env.NEXT_PUBLIC_SITE_URL || "https://lassali-store.vercel.app"}/api/webhooks/mercado-pago`}</code></small>
          </AdminActionForm>
          <AdminActionForm action={verifyMercadoPagoCheckout} label="Verificar conexão real" className="verify-payment-form" />
        </> : <p>Somente os perfis administrador geral e financeiro podem alterar pagamentos.</p>}
      </section>

      <section className="admin-section">
        <h2>Estoque central Lassali e Forbody</h2>
        <p>Todos os produtos vendidos possuem saldo por SKU. Na linha Forbody, o mesmo estoque abastece varejo e unidades sem duplicação.</p>
        <div className="admin-list">
          {inventory.map((variant) => {
            const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
            const totalAvailable = Math.max(variant.stock - variant.reserved_stock, 0);
            const retailAvailable = Math.max(totalAvailable - variant.unit_safety_stock, 0);
            const unitAvailable = Math.max(totalAvailable - variant.retail_safety_stock, 0);
            return <article key={variant.id}>
              <div>
                <strong>{product?.name || variant.sku} · {variant.color || "Padrão"} · {variant.size || "Único"} · {product?.storefront || "loja"}</strong>
                <span>Físico: {variant.stock} · Reservado: {variant.reserved_stock} · Varejo: {retailAvailable} · Unidades: {unitAvailable}</span>
                <span>SKU: {variant.sku}{totalAvailable <= variant.low_stock_threshold ? " · ESTOQUE BAIXO" : ""}</span>
              </div>
              {canStock ? <div>
                <AdminActionForm action={receiveInventory} label="Registrar entrada">
                  <input type="hidden" name="variantId" value={variant.id} />
                  <input name="quantity" type="number" min={1} max={100000} placeholder="Quantidade recebida" required />
                  <input name="reason" placeholder="Compra, fornecedor ou documento" />
                </AdminActionForm>
                <AdminActionForm action={updateInventoryPolicy} label="Salvar limites">
                  <input type="hidden" name="variantId" value={variant.id} />
                  <label>Reserva varejo<input name="retailSafety" type="number" min={0} defaultValue={variant.retail_safety_stock} required /></label>
                  <label>Reserva unidades<input name="unitSafety" type="number" min={0} defaultValue={variant.unit_safety_stock} required /></label>
                  <label>Alerta baixo<input name="lowStock" type="number" min={0} defaultValue={variant.low_stock_threshold} required /></label>
                </AdminActionForm>
              </div> : null}
            </article>;
          })}
          {!inventory.length ? <p>Execute a migration de estoque para carregar os SKUs Forbody.</p> : null}
        </div>
      </section>

      <section className="admin-section">
        <h2>Pedidos de reposição aguardando aprovação</h2>
        <div className="admin-list">
          {(unitOrders || []).map((order) => {
            const organization = Array.isArray(order.organizations) ? order.organizations[0] : order.organizations;
            const items = order.order_items || [];
            const amount = items.reduce((sum, item) => sum + item.quantity, 0);
            return <article key={order.id}>
              <div><strong>{organization?.trade_name || organization?.legal_name || "Unidade Forbody"}</strong><span>Pedido {order.id.slice(0, 8)} · {amount} item(ns) · {new Date(order.created_at).toLocaleDateString("pt-BR")}</span>{items.map((item) => <span key={item.sku}>{item.product_name} · {item.sku} · {item.quantity}</span>)}</div>
              {canStock ? <AdminActionForm action={reviewUnitStockOrder} label="Aplicar">
                <input type="hidden" name="orderId" value={order.id} />
                <select name="decision"><option value="approve">Aprovar e baixar estoque</option><option value="cancel">Cancelar e liberar reserva</option></select>
              </AdminActionForm> : null}
            </article>;
          })}
          {!unitOrders?.length ? <p>Nenhum pedido aguardando aprovação.</p> : null}
        </div>
      </section>

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
