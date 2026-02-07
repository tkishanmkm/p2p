import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function AdPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <Header />
      <main className="flex-grow py-8 md:py-12">
        <div className="container mx-auto px-4 md:px-6">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
