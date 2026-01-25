
import React, { useEffect, useState } from 'react';

// ВСТАВЬ СЮДА ПРЯМУЮ ССЫЛКУ НА ГИФКУ (должна заканчиваться на .gif)
// Например: https://i.imgur.com/YourUploadedFile.gif
const SPLASH_GIF = "https://i.imgur.com/rAAELv5.gif";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Тайминг под твою гифку (2.4 сек):
    // 2200ms (2.2 сек) — начинаем исчезновение (чуть раньше конца, чтобы не увидеть начало 2-го круга)
    // +600ms на плавное растворение

    const GIF_DURATION = 2200;
    const FADE_DURATION = 600;

    const fadeTimer = setTimeout(() => setIsFading(true), GIF_DURATION);
    const finishTimer = setTimeout(onFinish, GIF_DURATION + FADE_DURATION);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-700 ease-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>

      {SPLASH_GIF ? (
        // ВАРИАНТ С ГИФКОЙ
        <div className="flex flex-col items-center animate-pulse">
          <img
            src="/logo.png"
            alt="Anti-Doshirak"
            className="w-48 h-48 md:w-64 md:h-64 object-contain mb-8 filter drop-shadow-[0_0_30px_rgba(204,255,0,0.4)]"
          />
          <h1 className="text-4xl md:text-6xl font-black font-mono text-white tracking-tighter glitch-text">
            ANTI-DOSHIRAK
          </h1>
        </div>
      ) : (
        // ЗАГЛУШКА (ЕСЛИ ГИФКУ ЕЩЕ НЕ ВСТАВИЛИ)
        <div className="text-center">
          <div className="relative font-black font-mono text-4xl md:text-7xl text-white tracking-tighter select-none scale-100 md:scale-150 animate-pulse">
            <span className="text-cyber-neon">LOADING</span>
            <span className="text-cyber-alert">...</span>
          </div>
          <p className="text-xs text-gray-500 font-mono mt-4">INSERT GIF URL IN CODE</p>
        </div>
      )}

      <style>{`
        /* Делает пиксели четкими при растягивании (Anti-aliasing OFF) */
        .image-pixelated {
            image-rendering: pixelated; 
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
        }
      `}</style>

    </div>
  );
};

export default SplashScreen;
