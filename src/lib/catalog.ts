export type Storefront = "lassali" | "forbody";

export type ProductMedia = {
  src?: string;
  alt: string;
  label: string;
  color?: string;
};

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
  gallery?: ProductMedia[];
  composition?: string;
  benefits?: string[];
  rating?: number;
  reviewCount?: number;
  soldCount?: number;
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
    imageAlt: "Modelo Lassali usando conjunto fitness rosa em frente à loja",
    gallery: [
      { src: "/images/lassali/lassali-02.jpg", alt: "Conjunto fitness Lassali em uso", label: "No corpo" },
      { src: "/images/lassali/lassali-04.jpg", alt: "Look fitness Lassali em ambiente externo", label: "Inspiração" },
      { src: "/images/lassali/lassali-01.jpg", alt: "Detalhe de roupa fitness Lassali durante treino", label: "Movimento" }
    ],
    composition: "Tecido de alta elasticidade, toque macio e secagem rápida.",
    benefits: ["Cós alto e firme", "Alta sustentação", "Conforto para treino e uso urbano"],
    rating: 0,
    reviewCount: 0,
    soldCount: 0
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
    imageAlt: "Modelo usando camiseta preta e legging fitness estampada",
    gallery: [
      { src: "/images/lassali/lassali-03.jpg", alt: "Legging Motion estampada em uso", label: "Frente" },
      { src: "/images/lassali/lassali-01.jpg", alt: "Legging fitness Lassali durante treino", label: "Treino" },
      { src: "/images/lassali/lassali-04.jpg", alt: "Look completo Lassali", label: "Look" }
    ],
    composition: "Malha encorpada com elasticidade multidirecional.",
    benefits: ["Zero transparência", "Modelagem anatômica", "Liberdade de movimento"],
    rating: 0,
    reviewCount: 0,
    soldCount: 0
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
    imageAlt: "Modelo treinando com camiseta rosa e legging roxa",
    gallery: [
      { src: "/images/lassali/lassali-01.jpg", alt: "Roupa fitness Lassali durante treino", label: "Treino" },
      { src: "/images/lassali/lassali-02.jpg", alt: "Conjunto fitness Lassali rosa", label: "No corpo" }
    ],
    composition: "Tecido respirável com compressão confortável.",
    benefits: ["Cós firme", "Comprimento seguro", "Secagem rápida"],
    rating: 0,
    reviewCount: 0,
    soldCount: 0
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
    tone: "red",
    gallery: [
      { alt: "Camiseta Forbody Performance preta", label: "Preto", color: "Preto" },
      { alt: "Camiseta Forbody Performance branca", label: "Branco", color: "Branco" },
      { alt: "Camiseta Forbody Performance vermelha", label: "Vermelho", color: "Vermelho" }
    ],
    composition: "Dry fit leve e respirável, desenvolvido para treinos intensos.",
    benefits: ["Secagem rápida", "Toque leve", "Produto oficial Forbody"],
    rating: 0,
    reviewCount: 0,
    soldCount: 0
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
    tone: "black",
    gallery: [{ alt: "Boné oficial Forbody Classic preto", label: "Produto", color: "Preto" }],
    composition: "Estrutura firme, aba curva e ajuste traseiro.",
    benefits: ["Tamanho ajustável", "Estrutura reforçada", "Produto oficial Forbody"],
    rating: 0,
    reviewCount: 0,
    soldCount: 0
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
    tone: "red",
    gallery: [
      { alt: "Galão Forbody 2L preto", label: "Preto", color: "Preto" },
      { alt: "Galão Forbody 2L vermelho", label: "Vermelho", color: "Vermelho" }
    ],
    composition: "Recipiente de dois litros com alça ergonômica e tampa rosqueável.",
    benefits: ["Capacidade de 2 litros", "Alça ergonômica", "Produto oficial Forbody"],
    rating: 0,
    reviewCount: 0,
    soldCount: 0
  }
];

export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
