export type Storefront = "lassali" | "forbody";

export type Product = {
  slug: string;
  name: string;
  category: string;
  storefront: Storefront;
  retailPrice: number;
  colors: string[];
  sizes: string[];
  badge?: string;
  description: string;
  tone: string;
  image?: string;
  imageAlt?: string;
};

export const products: Product[] = [
  {
    slug: "conjunto-power-preto",
    name: "Conjunto Power",
    category: "Conjuntos",
    storefront: "lassali",
    retailPrice: 139.9,
    colors: ["Preto", "Café", "Vinho"],
    sizes: ["P", "M", "G", "GG"],
    badge: "Mais vendido",
    description: "Top de alta sustentação e legging de cós alto com toque macio.",
    tone: "graphite",
    image: "/images/lassali/lassali-02.jpg",
    imageAlt: "Modelo Lassali usando conjunto fitness rosa em frente à loja"
  },
  {
    slug: "legging-motion",
    name: "Legging Motion",
    category: "Leggings",
    storefront: "lassali",
    retailPrice: 89.9,
    colors: ["Preto", "Azul profundo"],
    sizes: ["P", "M", "G", "GG"],
    badge: "Zero transparência",
    description: "Modelagem anatômica para treino e uso urbano.",
    tone: "wine",
    image: "/images/lassali/lassali-03.jpg",
    imageAlt: "Modelo usando camiseta preta e legging fitness estampada"
  },
  {
    slug: "short-essencial",
    name: "Short Essencial",
    category: "Shorts",
    storefront: "lassali",
    retailPrice: 59.9,
    colors: ["Preto", "Verde oliva", "Rosa"],
    sizes: ["P", "M", "G"],
    description: "Cós firme, comprimento seguro e liberdade de movimento.",
    tone: "olive",
    image: "/images/lassali/lassali-01.jpg",
    imageAlt: "Modelo treinando com camiseta rosa e legging roxa"
  },
  {
    slug: "camiseta-forbody-performance",
    name: "Camiseta Forbody Performance",
    category: "Camisetas",
    storefront: "forbody",
    retailPrice: 69.9,
    colors: ["Preto", "Branco", "Vermelho"],
    sizes: ["P", "M", "G", "GG", "XG"],
    badge: "Forbody oficial",
    description: "Camiseta dry fit oficial para treino e equipe.",
    tone: "red"
  },
  {
    slug: "bone-forbody-classic",
    name: "Boné Forbody Classic",
    category: "Bonés",
    storefront: "forbody",
    retailPrice: 59.9,
    colors: ["Preto"],
    sizes: ["Único"],
    description: "Boné estruturado com identidade oficial Forbody.",
    tone: "black"
  },
  {
    slug: "galao-forbody-2l",
    name: "Galão Forbody 2L",
    category: "Acessórios",
    storefront: "forbody",
    retailPrice: 49.9,
    colors: ["Preto", "Vermelho"],
    sizes: ["2L"],
    description: "Hidratação para o treino inteiro com alça ergonômica.",
    tone: "red"
  }
];

export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
