
import React, { useState } from 'react';

interface ShareModalProps {
  url: string;
  code: string;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ url, code, onClose }) => {
  const [copiedType, setCopiedType] = useState<'url' | 'code' | null>(null);

  const copyToClipboard = (text: string, type: 'url' | 'code') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
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
                    <button 
                        onClick={() => copyToClipboard(url, 'url')}
                        className={`px-4 font-mono text-xs font-bold uppercase transition-all ${
                            copiedType === 'url' 
                            ? 'bg-cyber-neon text-black border border-cyber-neon' 
                            : 'bg-black text-cyber-tech border border-cyber-tech hover:bg-cyber-tech hover:text-black'
                        }`}
                    >
                        {copiedType === 'url' ? 'COPIED!' : 'COPY LINK'}
                    </button>
                </div>
                <p className="text-[10px] text-gray-500 font-mono">
                    Отправь эту ссылку клиенту. Смета откроется автоматически.
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
                        className={`px-4 font-mono text-xs font-bold uppercase transition-all ${
                            copiedType === 'code' 
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
