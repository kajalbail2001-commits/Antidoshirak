import React, { useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isFading, setIsFading] = useState(false);

  const handleVideoEnd = () => {
    setIsFading(true);
    setTimeout(onFinish, 600); // 600ms fade duration
  };

  return (
    <div className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-700 ease-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      <video 
        src="/splash.mp4" 
        autoPlay 
        muted 
        playsInline
        onEnded={handleVideoEnd}
        onError={handleVideoEnd}
        className="splash-video"
      />
      <style>{`
        .splash-video {
          width: 100%;
          height: 100%;
          object-fit: cover; /* Заполняет экран на мобилке */
        }
        @media (min-width: 768px) {
          .splash-video {
            object-fit: contain; /* На компе будет по центру с черными полями, без обрезки */
            background-color: #050505;
          }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
