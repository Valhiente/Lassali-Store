import "server-only";

type OrderRow = {
  created_at: string;
  order_items: Array<{ category: string | null; quantity: number }>;
};

export function calculateReplenishment(orders: OrderRow[]) {
  const categories = new Map<string, { quantity: number; orders: number; latest: number }>();
  for (const order of orders) {
    const created = new Date(order.created_at).getTime();
    const seen = new Set<string>();
    for (const item of order.order_items || []) {
      const category = item.category || "Outros";
      const current = categories.get(category) || { quantity: 0, orders: 0, latest: 0 };
      current.quantity += Number(item.quantity) || 0;
      current.latest = Math.max(current.latest, created);
      if (!seen.has(category)) { current.orders += 1; seen.add(category); }
      categories.set(category, current);
    }
  }
  const now = Date.now();
  return [...categories.entries()].map(([category, values]) => {
    const daysSinceLastOrder = values.latest ? Math.floor((now - values.latest) / 86_400_000) : null;
    const averagePerOrder = values.orders ? Math.ceil(values.quantity / values.orders) : 0;
    const urgency = daysSinceLastOrder === null ? "new" : daysSinceLastOrder >= 60 ? "high" : daysSinceLastOrder >= 30 ? "medium" : "low";
    return { category, ...values, daysSinceLastOrder, averagePerOrder, suggestedQuantity: urgency === "high" ? averagePerOrder : urgency === "medium" ? Math.ceil(averagePerOrder / 2) : 0, urgency };
  }).sort((a, b) => b.suggestedQuantity - a.suggestedQuantity || b.quantity - a.quantity);
}
