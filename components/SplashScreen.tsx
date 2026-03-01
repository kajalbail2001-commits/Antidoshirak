import React, { useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden">
      <video 
        src="/splash.mp4" 
        autoPlay 
        muted 
        playsInline
        onEnded={onFinish}
        onError={onFinish}
        className="splash-video"
        style={{
          transform: `scale(0.97) translateY(28px)`
        }}
      />
      
      <style>{`
        .splash-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        @media (min-width: 768px) {
          .splash-video {
            object-fit: contain;
            transform: scale(1) translateY(0) !important; /* Reset on desktop */
          }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;