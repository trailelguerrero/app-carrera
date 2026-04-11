import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ThemeToggle } from "../components/ui/ThemeToggle";

export default function Landing() {
  return (
    <>
      <style>{`@keyframes teg-fadein-scale{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}@keyframes teg-fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div className="min-h-[100dvh] bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[120px] rounded-full" />
      </div>

      {/* Top Header */}
      <header className="absolute top-0 left-0 w-full z-50 p-6 md:p-8 flex items-center justify-between">
        <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground/90 drop-shadow-md">
          Trail El Guerrero, Candeleda 2026
        </h1>
        <ThemeToggle size={34} />
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 mt-16 md:mt-0 w-full max-w-5xl mx-auto">
        
        {/* Main Circular Logo */}
        <div className="relative mb-12 lg:mb-16 flex justify-center" style={{animation:"teg-fadein-scale 0.8s ease-out"}}>
          <div className="w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] md:w-[450px] md:h-[450px] rounded-full overflow-hidden shadow-2xl flex items-center justify-center">
            <img 
              src="/logo.webp" 
              alt="Logo Trail El Guerrero" 
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.src.endsWith('/logo.jpg')) {
                  target.src = '/logo.jpg';
                } else {
                  target.style.display = 'none';
                }
              }}
            />
          </div>
        </div>

        {/* 3 Distance Logos */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 w-full mb-16" style={{animation:"teg-fadein 0.8s ease-out 0.2s both"}}>
          {['TG7.webp', 'TG13.webp', 'TG25.webp'].map((img, i) => (
            <div key={img} className="flex flex-col items-center justify-center w-48 sm:w-56 md:w-64 hover:-translate-y-2 transition-transform duration-300">
              <img 
                src={`/${img}`} 
                alt={`Distancia ${img.replace('.png', '')}`} 
                className="w-full h-auto drop-shadow-2xl"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          ))}
        </div>

        {/* CTA Button to Panel */}
        <div className="mt-auto md:mt-0" style={{animation:"teg-fadein 0.8s ease-out 0.4s both"}}>
          <Link 
            to="/panel" 
            className="group flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95 backdrop-blur-md shadow-2xl"
          >
            <span className="text-lg md:text-xl font-bold tracking-wide">Panel de Gestión</span>
            <div className="bg-primary text-primary-foreground p-1.5 rounded-full group-hover:translate-x-1 transition-transform">
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </Link>
        </div>

      </main>
    </div>
    </>
  );
}
