
import React, { useState, useEffect } from 'react';
import { AppSettings, PriceData, ProjectItem, RiskLevel, UrgencyLevel, SharedQuote } from './types';
import { FALLBACK_DATA, RISK_LABELS, URGENCY_LABELS, DEFAULT_SETTINGS, CYBER_QUOTES } from './constants';
import { parseBriefWithGemini } from './services/geminiService';
import ToolWizard from './components/ToolWizard';
import Settings from './components/Settings';
import Proposal from './components/Proposal';
import Marketplace from './components/Marketplace';
import ShareModal from './components/ShareModal';
import SplashScreen from './components/SplashScreen';

// Settings Icon
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<PriceData>(FALLBACK_DATA);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [laborHours, setLaborHours] = useState<number>(4);
  const [risk, setRisk] = useState<RiskLevel>(RiskLevel.LOW);
  const [urgency, setUrgency] = useState<UrgencyLevel>(UrgencyLevel.STANDARD);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  
  // Share State
  const [shareData, setShareData] = useState<{url: string, code: string} | null>(null);
  
  // Client & Proposal Mode
  const [viewMode, setViewMode] = useState<'editor' | 'proposal' | 'landing'>('landing');
  const [isClientMode, setIsClientMode] = useState(false);
  const [showClientInput, setShowClientInput] = useState(false);
  const [clientCode, setClientCode] = useState("");

  // Logic Protection
  const [isUrgencyLocked, setIsUrgencyLocked] = useState(false);
  
  // AI Brief
  const [brief, setBrief] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  

  useEffect(() => {
    const saved = localStorage.getItem('anti_doshirak_settings');
    if (saved) { try { setSettings(JSON.parse(saved)); } catch (e) {} }
    
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('data');
    if (sharedData) {
      loadSharedDataString(sharedData);
    }
  }, []);

  useEffect(() => { localStorage.setItem('anti_doshirak_settings', JSON.stringify(settings)); }, [settings]);

  // Logic Protection: Pace Check
  useEffect(() => {
    if (items.length === 0) {
        setIsUrgencyLocked(false);
        return;
    }

    let totalContentMinutes = 0;
    items.forEach(item => {
        let durationSec = 0;
        // Heuristics for duration
        if (item.unit === 'second') {
            durationSec = item.amount;
        } else if (item.unit === 'minute') {
            durationSec = item.amount * 60;
        } else if (item.category === 'video') {
            // Assume 1 gen = 5 seconds clip on average for calculation
            durationSec = item.amount * 5; 
        } else {
            // Images/Text count less towards timeline duration for this metric
            durationSec = item.amount * 0.5; 
        }
        totalContentMinutes += durationSec / 60;
    });

    if (totalContentMinutes > 0) {
        const pace = laborHours / totalContentMinutes;
        // Threshold: If spending > 25 hours per minute of content, it's very slow/detailed.
        // High pace + High Urgency = Speculation.
        if (pace > 25) {
            setIsUrgencyLocked(true);
            if (urgency > UrgencyLevel.STANDARD) {
                setUrgency(UrgencyLevel.STANDARD);
            }
        } else {
            setIsUrgencyLocked(false);
        }
    }
  }, [laborHours, items]);

  const loadSharedDataString = (inputStr: string) => {
      try {
        // Clean up if it's a full URL
        let cleanStr = inputStr;
        if (cleanStr.includes('data=')) {
            cleanStr = cleanStr.split('data=')[1];
        }
        const decoded = JSON.parse(atob(cleanStr)) as SharedQuote;
        loadSharedQuote(decoded);
      } catch (e) {
        // GUEST MODE FALLBACK
        console.log("Entering Guest Mode with Code:", inputStr);
        setItems([]);
        setLaborHours(0);
        setSettings(prev => ({
            ...prev,
            clientName: `GUEST ACCESS // ${inputStr || 'ANON'}`
        }));
        setIsClientMode(true);
        setViewMode('proposal');
      }
  };

  const loadSharedQuote = (quote: SharedQuote) => {
    setItems(quote.items);
    setLaborHours(quote.laborHours);
    setRisk(quote.risk || RiskLevel.LOW);
    setUrgency(quote.urgency || UrgencyLevel.STANDARD);
    if (quote.creatorName || quote.clientName) {
        setSettings(prev => ({
            ...prev,
            hourlyRate: quote.hourlyRate,
            creatorName: quote.creatorName || '',
            creatorTelegram: quote.creatorTelegram || '',
            creatorAvatarUrl: quote.creatorAvatarUrl || '',
            clientName: quote.clientName || ''
        }));
    }
    setIsClientMode(true);
    setViewMode('proposal');
  };

  const handleShare = () => {
    const quote: SharedQuote = {
        items,
        laborHours,
        hourlyRate: settings.hourlyRate,
        risk,
        urgency,
        currencyRate: calculateCostPerToken(),
        totalCost: calculateTotal(),
        creatorName: settings.creatorName,
        creatorTelegram: settings.creatorTelegram,
        creatorAvatarUrl: settings.creatorAvatarUrl,
        clientName: settings.clientName
    };
    const code = btoa(JSON.stringify(quote));
    const url = `${window.location.origin}${window.location.pathname}?data=${code}`;
    
    setShareData({ url, code });
  };
  
  // New Fork/Copy functionality
  const handleFork = () => {
      setIsClientMode(false);
      setViewMode('editor');
      // Optional: Clear client-specific name if forking? 
      // Keeping it for now as "Edit Mode" usually implies editing the existing deal.
      window.history.replaceState({}, document.title, window.location.pathname); // Clear URL param
  };

  const handleAddItems = (newItems: ProjectItem[]) => {
      setItems(prev => {
          const merged = [...prev];
          newItems.forEach(newItem => {
              const existingIndex = merged.findIndex(i => i.id === newItem.id);
              if (existingIndex >= 0) {
                  merged[existingIndex] = {
                      ...merged[existingIndex],
                      amount: merged[existingIndex].amount + newItem.amount
                  };
              } else {
                  merged.push(newItem);
              }
          });
          return merged;
      });
  };

  const handleUpdateItemAmount = (uniqueId: string, amount: number) => {
      setItems(prev => prev.map(item => 
          item.uniqueId === uniqueId ? { ...item, amount } : item
      ));
  };

  const handleRemoveItem = (uniqueId: string) => {
      setItems(prev => prev.filter(item => item.uniqueId !== uniqueId));
  };

  const calculateCostPerToken = () => settings.packageTokens > 0 ? settings.packagePriceUsd / settings.packageTokens : 0;
  
  const calculateTotal = () => {
    const currencyRate = calculateCostPerToken();
    const rawAiCost = items.reduce((acc, item) => acc + (item.amount * item.lightning_price * currencyRate), 0);
    const bufferedAiCost = rawAiCost * 1.2;
    const laborCost = laborHours * settings.hourlyRate;
    const subtotal = bufferedAiCost + laborCost;
    return subtotal * risk * urgency;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) {
            setBrief(prev => {
                const separator = prev ? "\n\n" : "";
                return prev + separator + `--- IMPORTED CONTENT (${file.name}) ---\n` + text;
            });
        }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleProcessBrief = async () => {
    if (!brief.trim()) return;
    setIsProcessing(true);
    try {
      const parsedItems = await parseBriefWithGemini(brief, data.tools, "");
      
      const newProjectItems: ProjectItem[] = parsedItems.map(p => {
        const toolDef = data.tools.find(t => t.id === p.tool_id);
        if (!toolDef) return null;
        return {
          ...toolDef,
          uniqueId: Math.random().toString(36).substr(2, 9),
          amount: p.count
        };
      }).filter((i): i is ProjectItem => i !== null);

      handleAddItems(newProjectItems);
      setBrief("");
    } catch (error) {
      console.error(error);
      alert("Ошибка AI: " + (error as any).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // RENDER SPLASH SCREEN IF LOADING
  if (isLoading) {
      return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  if (viewMode === 'landing') {
      return (
        <div className="min-h-screen bg-cyber-black flex flex-col items-center justify-between p-4 animate-fade-in relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-cyber-black to-cyber-black -z-10"></div>
             
             <div className="h-[10vh]"></div>

             <div className="text-center space-y-6 z-10 flex flex-col items-center">
                <h1 className="text-5xl md:text-8xl font-black font-mono text-white tracking-tighter glitch-text leading-none drop-shadow-[0_0_15px_rgba(255,0,60,0.5)]" data-text="ANTI-DOSHIRAK">
                   ANTI-DOSHIRAK
                </h1>
                <div className="border border-cyber-tech text-cyber-tech bg-cyber-tech/10 px-4 py-1 text-sm md:text-base font-bold font-mono tracking-widest uppercase shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                  v1.0 PROTOCOL
                </div>
                <p className="text-cyber-dim font-mono text-xs md:text-sm tracking-widest uppercase mt-4">
                   Creative Production Calculator
                </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl z-10 my-12">
                <button 
                  onClick={() => setViewMode('editor')}
                  className="group relative p-8 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-cyber-neon transition-all duration-300"
                >
                   <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🛠️</div>
                   <div className="font-bold text-white text-xl mb-1 font-mono">Я ИСПОЛНИТЕЛЬ</div>
                   <div className="text-xs text-gray-500 font-mono">Создать смету, настроить рейты</div>
                </button>

                {!showClientInput ? (
                    <button 
                    onClick={() => setShowClientInput(true)}
                    className="group relative p-8 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-cyber-tech transition-all duration-300"
                    >
                    <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">👔</div>
                    <div className="font-bold text-white text-xl mb-1 font-mono">Я ЗАКАЗЧИК</div>
                    <div className="text-xs text-gray-500 font-mono">Посмотреть смету по коду</div>
                    </button>
                ) : (
                    <div className="p-8 border border-cyber-tech bg-zinc-900 flex flex-col justify-center space-y-4 animate-fade-in">
                        <label className="text-xs text-cyber-tech font-mono">ВВЕДИТЕ КОД ИЛИ ССЫЛКУ:</label>
                        <input 
                          type="text" 
                          autoFocus
                          value={clientCode}
                          onChange={(e) => setClientCode(e.target.value)}
                          onKeyDown={(e) => {
                             if(e.key === 'Enter' && clientCode) loadSharedDataString(clientCode);
                          }}
                          className="bg-black border border-zinc-700 text-white p-2 font-mono text-sm outline-none focus:border-cyber-tech"
                          placeholder="Любой ID или код..."
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setShowClientInput(false)} className="flex-1 text-xs text-gray-500 font-mono py-2 hover:text-white">ОТМЕНА</button>
                            <button 
                              onClick={() => loadSharedDataString(clientCode)}
                              disabled={!clientCode}
                              className="flex-1 bg-cyber-tech text-black font-bold font-mono text-xs py-2 disabled:opacity-50 hover:bg-white transition-colors"
                            >
                                ОТКРЫТЬ
                            </button>
                        </div>
                    </div>
                )}
             </div>

             <div className="text-[10px] text-cyber-dim font-mono z-10 mb-8">
                 <a href="https://t.me/neuroskam" target="_blank" rel="noopener noreferrer" className="hover:text-cyber-tech transition-colors">
                    Powered by NeuroSkam
                 </a>
             </div>
        </div>
      );
  }

  if (showSettings) return <Settings settings={settings} setSettings={setSettings} onClose={() => setShowSettings(false)} />;
  
  if (viewMode === 'proposal') {
    return (
      <>
        {showMarketplace && (
            <div className="fixed inset-0 z-[60] bg-black">
                <Marketplace 
                    userPrice={calculateTotal()} 
                    items={items}
                    onClose={() => setShowMarketplace(false)} 
                />
            </div>
        )}
        {shareData && (
             <ShareModal 
               url={shareData.url} 
               code={shareData.code} 
               onClose={() => setShareData(null)} 
             />
        )}
        <Proposal 
          items={items}
          hourlyRate={settings.hourlyRate}
          laborHours={laborHours}
          risk={risk}
          urgency={urgency}
          currencyRate={calculateCostPerToken()}
          onBack={() => setViewMode('editor')}
          isClientMode={isClientMode}
          onApprove={() => {}}
          onTender={() => setShowMarketplace(true)}
          onMarketCheck={isClientMode ? undefined : () => setShowMarketplace(true)}
          onShareClick={isClientMode ? undefined : handleShare}
          onFork={handleFork}
          clientName={settings.clientName}
          creatorName={settings.creatorName}
          creatorTelegram={settings.creatorTelegram}
          creatorAvatarUrl={settings.creatorAvatarUrl}
        />
      </>
    );
  }

  const currencyRate = calculateCostPerToken();

  return (
    <div className="min-h-screen bg-cyber-black text-gray-300 pb-20 font-sans">
      
      {showWizard && (
        <ToolWizard 
          tools={data.tools} 
          onAdd={(item) => { handleAddItems([item]); setShowWizard(false); }} 
          onClose={() => setShowWizard(false)} 
        />
      )}
      
      {shareData && (
         <ShareModal 
           url={shareData.url} 
           code={shareData.code} 
           onClose={() => setShareData(null)} 
         />
      )}

      {/* Header */}
      <div className="p-4 border-b border-cyber-dim bg-zinc-900/80 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex justify-between items-start">
           <div onClick={() => setViewMode('landing')} className="cursor-pointer">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black font-mono text-white tracking-tighter glitch-text" data-text="ANTI-DOSHIRAK">
                    ANTI-DOSHIRAK
                </h1>
                <span className="border border-cyber-tech text-cyber-tech text-[10px] font-bold px-1.5 py-0.5 font-mono bg-cyber-tech/10">
                    v1.0
                </span>
              </div>
              <div className="text-[10px] font-mono text-gray-500 mt-1">
                 1⚡ = {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 4 }).format(currencyRate)}
              </div>
           </div>
           <div className="flex gap-4">
              <button onClick={handleShare} className="text-xs font-mono text-cyber-tech hover:underline mt-1">SHARE</button>
              <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white transition-colors mt-1">
                <SettingsIcon />
              </button>
           </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-8 animate-fade-in">
        
        {/* Quote of the day (Mockup) */}
        <div className="text-[10px] font-mono text-center text-cyber-dim italic border-b border-zinc-900 pb-4">
          "{CYBER_QUOTES[Math.floor(Math.random() * CYBER_QUOTES.length)]}"
        </div>

        {/* AI Brief Input */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded shadow-lg relative">
          <div className="relative group">
            <textarea
              className="w-full bg-black border border-cyber-dim p-3 text-sm text-white focus:border-cyber-neon outline-none min-h-[80px] font-mono resize-none placeholder-gray-700"
              placeholder="Вставьте описание задачи (Бриф) или загрузите текстовый файл..."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              disabled={isProcessing}
            />
            {isProcessing && (
               <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                 <span className="text-cyber-neon font-mono animate-pulse">DECODING...</span>
               </div>
            )}
          </div>
          
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-zinc-800">
             <div className="flex items-center gap-3">
               <span className="text-xs font-mono text-gray-500">AI ASSISTANT</span>
               
               {/* Attachment Button - Text Files Only */}
               <label className="cursor-pointer text-gray-500 hover:text-white transition-colors flex items-center gap-1 group relative" title="Добавить текстовый файл">
                  <input 
                    type="file" 
                    accept=".txt,.md,.csv,.json,.js,.ts" 
                    className="hidden" 
                    onChange={handleFileSelect} 
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-cyber-tech"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                  <span className="text-[10px] group-hover:text-cyber-tech">LOAD TXT</span>
               </label>
             </div>

             <button 
                className="flex items-center gap-2 text-[10px] text-cyber-tech font-bold uppercase hover:text-cyber-neon transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={handleProcessBrief}
                disabled={isProcessing || !brief}
             >
                 {isProcessing ? 'SCANNING...' : 'РАСКИДАТЬ ПО ТЗ'}
             </button>
          </div>
        </div>

        {/* Item List */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="h-32 flex items-center justify-center border border-dashed border-zinc-800 rounded bg-zinc-900/20">
               <span className="text-gray-600 font-mono text-sm">НЕТ АКТИВНЫХ МОДУЛЕЙ</span>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                 {items.map((item) => (
                    <React.Fragment key={item.uniqueId}>
                        <div className="bg-zinc-900/30 p-2 border-l-2 border-cyber-neon h-full flex flex-col justify-center">
                             <div className="text-xs font-bold text-gray-200 line-clamp-1">{item.name}</div>
                             <div className="text-[10px] font-mono text-gray-500">{item.lightning_price}⚡/{item.unit.substr(0,3)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-600 text-[10px]">×</span>
                            <input 
                                type="number"
                                min="1"
                                value={item.amount}
                                onChange={(e) => handleUpdateItemAmount(item.uniqueId, Math.max(0, Number(e.target.value)))}
                                className="w-12 h-8 bg-black border border-zinc-700 text-white text-center text-sm outline-none"
                            />
                        </div>
                        <div className="flex justify-between items-center pl-2">
                             <span className="text-cyber-neon font-mono text-xs">{(item.amount * item.lightning_price * currencyRate).toFixed(0)}₽</span>
                             <button onClick={() => handleRemoveItem(item.uniqueId)} className="text-gray-600 hover:text-cyber-alert px-2">×</button>
                        </div>
                    </React.Fragment>
                 ))}
            </div>
          )}
          
          <button 
             onClick={() => setShowWizard(true)}
             className="w-full py-4 border border-dashed border-zinc-800 text-gray-500 hover:border-cyber-dim hover:text-white transition-all text-sm font-mono uppercase mt-4"
          >
             + ДОБАВИТЬ ВРУЧНУЮ
          </button>
        </div>

        {/* Separator */}
        <div className="border-t border-zinc-800 my-8"></div>

        {/* Adjustments Section */}
        <div className="space-y-6">
           <label className="text-xs font-mono text-gray-500 uppercase tracking-wider block mb-4">МНОЖИТЕЛИ & ТРУДОЗАТРАТЫ</label>
           
           {/* Client Name Input REMOVED - Moved to Settings */}

           {/* Hours Input Box */}
           <div className="bg-zinc-900 border border-zinc-800 p-4 flex justify-between items-center">
             <div className="flex flex-col">
                 <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">ЧАСЫ РАБОТЫ</span>
                 {isUrgencyLocked && <span className="text-[10px] text-cyber-alert mt-1 font-mono">⚠️ Pace Warning: High hours/content</span>}
             </div>
             <div className="w-24 h-10 border border-zinc-700 bg-black flex items-center justify-center">
                <input 
                   type="number"
                   min="0"
                   placeholder="0"
                   value={laborHours === 0 ? '' : laborHours}
                   onChange={(e) => {
                       const val = e.target.value;
                       setLaborHours(val === '' ? 0 : Math.max(0, Number(val)));
                   }}
                   className="w-full h-full bg-transparent text-white text-center font-mono text-lg outline-none placeholder-zinc-700"
                />
             </div>
           </div>

           {/* Risk Buttons */}
           <div className="grid grid-cols-3 gap-3">
              {Object.entries(RISK_LABELS).sort((a,b) => Number(a[0]) - Number(b[0])).map(([val, label]) => {
                 const numVal = Number(val);
                 const isSelected = risk === numVal;
                 return (
                   <button
                     key={val}
                     onClick={() => setRisk(numVal)}
                     className={`
                       py-3 px-1 text-[10px] sm:text-xs font-mono border transition-all uppercase truncate
                       ${isSelected 
                         ? 'border-cyber-alert text-white bg-cyber-alert/10 shadow-[0_0_10px_rgba(255,0,60,0.3)]' 
                         : 'border-zinc-800 text-gray-500 hover:border-zinc-600 bg-black'
                       }
                     `}
                   >
                     {label}
                   </button>
                 );
              })}
           </div>

           {/* Urgency Buttons - With Logic Protection */}
           <div className="grid grid-cols-3 gap-3">
              {Object.entries(URGENCY_LABELS).sort((a,b) => Number(a[0]) - Number(b[0])).map(([val, label]) => {
                 const numVal = Number(val);
                 const isSelected = urgency === numVal;
                 const isLocked = isUrgencyLocked && numVal > 1.0;
                 return (
                   <button
                     key={val}
                     onClick={() => !isLocked && setUrgency(numVal)}
                     disabled={isLocked}
                     className={`
                       py-3 px-1 text-[10px] sm:text-xs font-mono border transition-all uppercase truncate relative
                       ${isLocked ? 'opacity-30 cursor-not-allowed border-zinc-900 bg-zinc-900' : ''}
                       ${isSelected && !isLocked
                         ? 'border-cyber-tech text-white bg-cyber-tech/10 shadow-[0_0_10px_rgba(0,240,255,0.3)]' 
                         : !isLocked ? 'border-zinc-800 text-gray-500 hover:border-zinc-600 bg-black' : ''
                       }
                     `}
                   >
                     {isLocked && <span className="absolute -top-1 -right-1 text-xs">🔒</span>}
                     {label}
                   </button>
                 );
              })}
           </div>
           
           {isUrgencyLocked && (
               <div className="text-[10px] text-cyber-alert font-mono border border-cyber-alert/50 bg-cyber-alert/10 p-2">
                   ⚠️ КОЭФФИЦИЕНТЫ СРОЧНОСТИ ОТКЛЮЧЕНЫ. <br/>
                   Слишком большие трудозатраты для данного объема контента.
               </div>
           )}
        </div>

        {/* Action Button */}
        <div className="pt-4 pb-10">
           <button 
             onClick={() => setViewMode('proposal')}
             disabled={items.length === 0 && laborHours === 0}
             className="w-full bg-cyber-neon text-black font-black text-xl py-6 font-mono uppercase tracking-widest hover:shadow-[0_0_25px_rgba(204,255,0,0.6)] transition-all disabled:opacity-30 disabled:shadow-none flex justify-between px-8 items-center"
           >
             <span>РАССЧИТАТЬ</span>
             <span>&gt;&gt;&gt;</span>
           </button>
        </div>

      </div>
    </div>
  );
}

export default App;
