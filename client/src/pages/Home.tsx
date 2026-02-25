import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { RadioPlayerV2 } from "@/components/RadioPlayerV2";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900">
      {/* Navigation */}
      <nav className="bg-gray-900 border-b-4 border-yellow-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center font-bold text-gray-900">
              P
            </div>
            <span className="text-white font-bold text-lg">Rádio Social Plus</span>
          </div>
          <div className="hidden md:flex gap-6 text-white text-sm">
            <a href="#" className="hover:text-yellow-500 transition">AO VIVO</a>
            <a href="#" className="hover:text-yellow-500 transition">SOBRE</a>
            <a href="#" className="hover:text-yellow-500 transition">CONTATO</a>
            <Button 
              onClick={() => navigate("/dashboard")}
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-yellow-500 font-bold text-sm mb-4">OUÇA AO VIVO</p>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight text-white">
              É só apertar o Play.<br />É grátis!
            </h1>
            <p className="text-xl text-gray-200">
              Sinta, ouça e compartilhe. Sua rádio online onde e quando você quiser.
            </p>
          </div>

          {/* Player Card */}
          <Card className="bg-gray-900 border-4 border-yellow-500 p-12 shadow-2xl max-w-2xl mx-auto">
            <RadioPlayerV2 />
          </Card>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-4 bg-gray-900 mt-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">
            Sobre a Rádio Social Plus Brasil
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-purple-800 border-2 border-yellow-500 p-6">
              <h3 className="text-xl font-bold text-yellow-500 mb-3">🎵 Música Diversa</h3>
              <p className="text-gray-200">
                Ouça o melhor da música brasileira e internacional, selecionada especialmente para você.
              </p>
            </Card>
            <Card className="bg-purple-800 border-2 border-yellow-500 p-6">
              <h3 className="text-xl font-bold text-yellow-500 mb-3">📱 Sempre Conectado</h3>
              <p className="text-gray-200">
                Ouça em qualquer lugar, a qualquer hora. No celular, tablet ou computador.
              </p>
            </Card>
            <Card className="bg-purple-800 border-2 border-yellow-500 p-6">
              <h3 className="text-xl font-bold text-yellow-500 mb-3">❤️ Sua Opinião Importa</h3>
              <p className="text-gray-200">
                Vote nas suas músicas favoritas e ajude a moldar a programação da rádio.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 border-t-4 border-yellow-500 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-gray-400">
          <p className="mb-2">© 2026 Rádio Social Plus Brasil. Todos os direitos reservados.</p>
          <p className="text-sm">Desenvolvido com ❤️ para os fãs de música</p>
        </div>
      </footer>
    </div>
  );
}
