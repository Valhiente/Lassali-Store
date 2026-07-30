"use client";

import Image from "next/image";
import { Expand, X } from "lucide-react";
import { useState } from "react";
import type { Product, ProductMedia } from "@/lib/catalog";

function mediaFor(product: Product, selectedColor: string): ProductMedia[] {
  const gallery = product.gallery?.length
    ? product.gallery
    : [{ src: product.image, alt: product.imageAlt || product.name, label: "Produto" }];
  const matching = gallery.filter((media) => !media.color || media.color === selectedColor);
  return matching.length ? matching : gallery;
}

function ProductVisual({ product, media, priority = false }: { product: Product; media: ProductMedia; priority?: boolean }) {
  return media.src ? (
    <Image
      src={media.src}
      alt={media.alt}
      fill
      priority={priority}
      sizes="(max-width: 760px) 100vw, (max-width: 1100px) 60vw, 52vw"
      className="product-detail-photo"
    />
  ) : (
    <div className={`product-placeholder ${product.tone}`} role="img" aria-label={media.alt}>
      <span>{product.storefront === "forbody" ? "FB" : "LS"}</span>
      <strong>{product.name}</strong>
      <small>{media.label}</small>
    </div>
  );
}

export function ProductGallery({ product, selectedColor }: { product: Product; selectedColor: string }) {
  const media = mediaFor(product, selectedColor);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const selected = media[Math.min(selectedIndex, media.length - 1)];

  return (
    <section className="commerce-gallery" aria-label="Galeria do produto">
      <div className="gallery-thumbnails" role="list">
        {media.map((item, index) => (
          <button
            key={`${item.label}-${index}`}
            type="button"
            className={selectedIndex === index ? "active" : ""}
            aria-label={`Ver ${item.label}`}
            aria-pressed={selectedIndex === index}
            onClick={() => setSelectedIndex(index)}
          >
            {item.src ? <Image src={item.src} alt="" fill sizes="72px" /> : <span>{index + 1}</span>}
          </button>
        ))}
      </div>
      <button className="gallery-main" type="button" onClick={() => setExpanded(true)} aria-label="Ampliar imagem">
        <ProductVisual product={product} media={selected} priority />
        <span className="gallery-expand"><Expand size={16} /> Ampliar</span>
      </button>
      {expanded ? (
        <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Imagem ampliada">
          <button type="button" className="lightbox-close" onClick={() => setExpanded(false)} aria-label="Fechar imagem"><X /></button>
          <div className="lightbox-image"><ProductVisual product={product} media={selected} /></div>
        </div>
      ) : null}
    </section>
  );
}
