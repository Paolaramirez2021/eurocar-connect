import { useEffect, useState } from 'react';

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [carPosition, setCarPosition] = useState(-20);

  useEffect(() => {
    const duration = 2500; // 2.5 segundos
    const interval = 20; // actualizar cada 20ms
    const steps = duration / interval;
    const progressIncrement = 100 / steps;
    const carIncrement = 120 / steps; // el carro se mueve 120% (de -20% a 100%)

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + progressIncrement;
        if (newProgress >= 100) {
          clearInterval(timer);
          setTimeout(() => onFinish(), 300);
          return 100;
        }
        return newProgress;
      });

      setCarPosition((prev) => {
        const newPosition = prev + carIncrement;
        return Math.min(newPosition, 100);
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#1e40af] overflow-hidden">
      {/* Título EuroCar Connect */}
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-white tracking-wider drop-shadow-2xl">
          EUROCAR
        </h1>
        <p className="text-xl text-[#22c55e] text-center mt-2 tracking-widest">
          CONNECT
        </p>
      </div>

      {/* Loading Bar Container */}
      <div className="w-80 max-w-[90vw] relative">
        {/* Track de la barra */}
        <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-gray-700/30">
          {/* Progreso de fondo */}
          <div 
            className="h-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] transition-all duration-75 ease-linear relative"
            style={{ width: `${progress}%` }}
          >
            {/* Efecto de brillo */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>

        {/* Carro AMG animado */}
        <div 
          className="absolute -top-8 transition-all duration-75 ease-linear"
          style={{ left: `${carPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="relative w-16 h-16">
            {/* SVG del carro deportivo estilo AMG */}
            <svg 
              viewBox="0 0 100 60" 
              className="w-full h-full drop-shadow-2xl"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Sombra del carro */}
              <ellipse cx="50" cy="55" rx="35" ry="3" fill="rgba(0,0,0,0.3)" />
              
              {/* Cuerpo principal - estilo deportivo bajo */}
              <path 
                d="M 15 35 L 20 25 L 35 20 L 65 20 L 80 25 L 85 35 L 85 45 L 15 45 Z" 
                fill="#1a1a1a"
                stroke="#2a2a2a"
                strokeWidth="0.5"
              />
              
              {/* Techo deportivo */}
              <path 
                d="M 35 20 L 40 12 L 60 12 L 65 20 Z" 
                fill="#0a0a0a"
                stroke="#1a1a1a"
                strokeWidth="0.5"
              />
              
              {/* Ventanas */}
              <path 
                d="M 37 18 L 41 13 L 50 13 L 50 18 Z" 
                fill="#4a5568"
                opacity="0.6"
              />
              <path 
                d="M 52 18 L 52 13 L 59 13 L 63 18 Z" 
                fill="#4a5568"
                opacity="0.6"
              />
              
              {/* Parrilla delantera AMG */}
              <rect x="82" y="28" width="3" height="10" fill="#2a2a2a" />
              <line x1="82" y1="30" x2="85" y2="30" stroke="#16a34a" strokeWidth="0.5" />
              <line x1="82" y1="32" x2="85" y2="32" stroke="#16a34a" strokeWidth="0.5" />
              <line x1="82" y1="34" x2="85" y2="34" stroke="#16a34a" strokeWidth="0.5" />
              <line x1="82" y1="36" x2="85" y2="36" stroke="#16a34a" strokeWidth="0.5" />
              
              {/* Luces LED delanteras */}
              <rect x="80" y="27" width="2" height="2" fill="#ffffff" opacity="0.9" />
              <rect x="80" y="39" width="2" height="2" fill="#ffffff" opacity="0.9" />
              
              {/* Detalle spoiler */}
              <path d="M 15 35 L 12 37 L 15 38 Z" fill="#1a1a1a" />
              
              {/* Ruedas deportivas */}
              <circle cx="25" cy="45" r="7" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />
              <circle cx="25" cy="45" r="4" fill="#2a2a2a" />
              <circle cx="25" cy="45" r="2" fill="#16a34a" />
              
              <circle cx="75" cy="45" r="7" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />
              <circle cx="75" cy="45" r="4" fill="#2a2a2a" />
              <circle cx="75" cy="45" r="2" fill="#16a34a" />
              
              {/* Detalles de velocidad (líneas de movimiento) */}
              {carPosition > 10 && (
                <>
                  <line x1="10" y1="30" x2="5" y2="30" stroke="#16a34a" strokeWidth="1" opacity="0.5" />
                  <line x1="12" y1="35" x2="7" y2="35" stroke="#16a34a" strokeWidth="1" opacity="0.5" />
                  <line x1="10" y1="40" x2="5" y2="40" stroke="#16a34a" strokeWidth="1" opacity="0.5" />
                </>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Texto de carga */}
      <div className="mt-16 text-center">
        <p className="text-white/80 text-sm font-light tracking-wider">
          Cargando EuroCar Connect...
        </p>
        <p className="text-[#22c55e] text-xs font-medium mt-2">
          {Math.round(progress)}%
        </p>
      </div>

      {/* Partículas de fondo (opcional, efecto premium) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
