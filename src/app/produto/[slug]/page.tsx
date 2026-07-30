import { notFound } from "next/navigation";
import { products } from "@/lib/catalog";
import { ProductExperience } from "@/components/ProductExperience";
import { getForbodyRetailStock } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  const stock = product.storefront === "forbody" ? await getForbodyRetailStock() : null;
  const availableStock = stock ? stock[product.slug] || {} : undefined;
  return <ProductExperience product={product} availableStock={availableStock} />;
}
