import React, { useState } from 'react';

interface ShareModalProps {
  url: string;
  code: string;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ url, code, onClose }) => {
  const [copiedType, setCopiedType] = useState<'url' | 'code' | null>(null);

  // Универсальная функция копирования (работает и в Chrome, и в Telegram WebView)
  const copyToClipboard = async (text: string, type: 'url' | 'code') => {
    try {
      // Попытка 1: Современный API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopiedType(type);
        setTimeout(() => setCopiedType(null), 2000);
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch (err) {
      // Попытка 2: Fallback с select() и execCommand
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Android WebView Workaround: 
        // Элемент должен быть видимым и в фокусе, иначе copy может не сработать.
        textArea.style.position = "fixed";
        textArea.style.left = "0";
        textArea.style.bottom = "0";
        textArea.style.opacity = "0.01"; // Почти невидимый, но "видимый" для DOM
        textArea.style.pointerEvents = "none";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          setCopiedType(type);
          setTimeout(() => setCopiedType(null), 2000);
        } else {
          throw new Error("Fallback failed");
        }
      } catch (fallbackErr) {
        console.error("Copy failed:", fallbackErr);
        // Крайний случай: просто показываем текст пользователю
        alert(`Не удалось скопировать автоматически. Пожалуйста, выделите и скопируйте вручную:\n\n${text}`);
      }
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Anti-Doshirak Estimate',
          text: 'Вам отправлена смета на согласование.',
          url: url
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
        // If share fails (e.g. desktop support partial), fallback to copy
        copyToClipboard(url, 'url');
      }
    } else {
      // Fallback to copy URL
      copyToClipboard(url, 'url');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-cyber-black border border-cyber-neon w-full max-w-lg p-6 relative shadow-[0_0_50px_rgba(204,255,0,0.2)]">

        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-xl font-mono text-cyber-neon font-bold tracking-widest uppercase">PROTOCOL UPLINK</h3>
            <p className="text-[10px] text-gray-500 font-mono">Сгенерирован доступ для заказчика</p>
          </div>
          <button onClick={onClose} className="text-cyber-alert font-mono hover:text-white">[ЗАКРЫТЬ]</button>
        </div>

        <div className="space-y-6">

          {/* Option 1: Direct Link */}
          <div className="space-y-2">
            <label className="text-xs text-cyber-tech font-mono uppercase font-bold">1. Прямая ссылка (Fast Track)</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                className="flex-1 bg-zinc-900 border border-zinc-700 text-gray-300 p-3 font-mono text-xs outline-none focus:border-cyber-tech text-ellipsis"
              />
              {/* Native Share Button (Mobile Friendly) */}
              {navigator.share && (
                <button
                  onClick={handleNativeShare}
                  className="px-3 bg-zinc-800 text-white border border-zinc-600 hover:border-cyber-neon hover:text-cyber-neon transition-all"
                  title="Отправить..."
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </button>
              )}
              <button
                onClick={() => copyToClipboard(url, 'url')}
                className={`px-4 font-mono text-xs font-bold uppercase transition-all ${copiedType === 'url'
                  ? 'bg-cyber-neon text-black border border-cyber-neon'
                  : 'bg-black text-cyber-tech border border-cyber-tech hover:bg-cyber-tech hover:text-black'
                  }`}
              >
                {copiedType === 'url' ? 'COPIED!' : 'COPY LINK'}
              </button>
            </div>
            <p className="text-[10px] text-gray-500 font-mono">
              Отправь ссылку клиенту. Если кнопка COPY не работает, используйте кнопку Share (стрелочка).
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="h-px bg-zinc-800 flex-1"></div>
            <span className="text-[10px] text-gray-600 font-mono uppercase">ИЛИ</span>
            <div className="h-px bg-zinc-800 flex-1"></div>
          </div>

          {/* Option 2: Code */}
          <div className="space-y-2">
            <label className="text-xs text-cyber-tech font-mono uppercase font-bold">2. Код доступа (Secure Key)</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-zinc-900 border border-zinc-700 p-3 overflow-hidden relative group">
                <div className="font-mono text-xs text-gray-400 break-all line-clamp-2">
                  {code}
                </div>
                <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-zinc-900 to-transparent"></div>
              </div>
              <button
                onClick={() => copyToClipboard(code, 'code')}
                className={`px-4 font-mono text-xs font-bold uppercase transition-all ${copiedType === 'code'
                  ? 'bg-cyber-neon text-black border border-cyber-neon'
                  : 'bg-black text-cyber-tech border border-cyber-tech hover:bg-cyber-tech hover:text-black'
                  }`}
              >
                {copiedType === 'code' ? 'COPIED!' : 'COPY CODE'}
              </button>
            </div>
            <p className="text-[10px] text-gray-500 font-mono">
              Клиент может ввести этот код на главной в разделе "Я ЗАКАЗЧИК".
            </p>
          </div>

        </div>

        <div className="mt-8 pt-4 border-t border-zinc-800 text-center">
          <p className="text-[10px] text-cyber-dim font-mono animate-pulse">
            WAITING FOR CONNECTION...
          </p>
        </div>

      </div>
    </div>
  );
};

export default ShareModal;
