import type { Metadata } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Lassali Store | Moda Fitness", template: "%s | Lassali Store" },
  description: "Moda fitness com fabricação própria. Atacado, varejo e produtos oficiais Forbody.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <Header />
        {children}
        <footer className="footer">
          <div><strong>LASSALI STORE</strong><p>Vida saudável com estilo.</p></div>
          <div><strong>Atendimento</strong><p>Ribeirão Preto · SP</p><p>@lassalistore</p></div>
          <div><strong>Compra segura</strong><p>Trocas, privacidade e entrega transparente.</p></div>
        </footer>
      </body>
    </html>
  );
}
