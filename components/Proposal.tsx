import React, { useState, useRef } from 'react';
import { ProjectItem, RiskLevel, UrgencyLevel } from '../types';
import { AI_BUFFER_MULTIPLIER, RISK_LABELS, URGENCY_LABELS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import html2canvas from 'html2canvas';

interface ProposalProps {
  items: ProjectItem[];
  hourlyRate: number;
  laborHours: number;
  risk: RiskLevel;
  urgency: UrgencyLevel;
  currencyRate: number;
  onBack?: () => void;
  isClientMode?: boolean;
  onApprove?: () => void;
  onTender?: () => void;
  onMarketCheck?: () => void;
  onShareClick?: () => void; 
  onFork?: () => void;
  
  // Branding
  clientName?: string;
  creatorName?: string;
  creatorTelegram?: string;
  creatorAvatarUrl?: string;
}

const Proposal: React.FC<ProposalProps> = ({ 
  items, hourlyRate, laborHours, risk, urgency, currencyRate, 
  onBack, isClientMode, onApprove, onTender, onMarketCheck, onShareClick, onFork,
  clientName, creatorName, creatorTelegram, creatorAvatarUrl
}) => {
  
  const [showTextModal, setShowTextModal] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [proposalStatus, setProposalStatus] = useState<'viewing' | 'accepted'>('viewing');
  const proposalRef = useRef<HTMLDivElement>(null);

  const safeCurrencyRate = (isNaN(currencyRate) || currencyRate < 0) ? 0 : currencyRate;
  const safeHourlyRate = (isNaN(hourlyRate) || hourlyRate < 0) ? 0 : hourlyRate;
  const safeLaborHours = (isNaN(laborHours) || laborHours < 0) ? 0 : laborHours;
  const safeRisk = (!risk || risk < 1) ? 1.2 : risk;
  const safeUrgency = (!urgency || urgency < 1) ? 1.0 : urgency;
  
  const isEmpty = items.length === 0 && safeLaborHours === 0;

  // --- CALCULATIONS ---

  const rawAiCost = items.reduce((acc, item) => acc + (item.amount * item.lightning_price * safeCurrencyRate), 0);
  const bufferedAiCost = rawAiCost * AI_BUFFER_MULTIPLIER;
  const baseLaborCost = safeLaborHours * safeHourlyRate;
  const subtotal = bufferedAiCost + baseLaborCost;
  const total = subtotal * safeRisk * safeUrgency;
  const premiumValue = Math.max(0, total - subtotal);

  // Timeline
  const baseDays = Math.max(1, Math.ceil(safeLaborHours / 5));
  let timelineString = "";
  
  if (isEmpty) {
      timelineString = "---";
  } else if (safeUrgency >= 2.0) {
      const crunchDays = Math.ceil(safeLaborHours / 12);
      timelineString = `${crunchDays * 24} HOURS (CRUNCH MODE)`;
  } else if (safeUrgency >= 1.5) {
      const fastDays = Math.ceil(safeLaborHours / 8);
      timelineString = `${fastDays}-${fastDays + 1} DAYS (PRIORITY)`;
  } else {
      timelineString = `${baseDays}-${baseDays + 2} BUSINESS DAYS`;
  }

  // Chart Data
  const data = [
    { name: 'Технический стек (AI Res)', value: Math.max(0, Number(bufferedAiCost.toFixed(0))), color: '#ccff00' },
    { name: 'Разработка (Labor)', value: Math.max(0, Number(baseLaborCost.toFixed(0))), color: '#00f0ff' },
  ];
  if (premiumValue > 100) {
    data.push({ name: 'Коэфф. Сложности', value: Math.max(0, Number(premiumValue.toFixed(0))), color: '#ff003c' });
  }
  
  const formatCurrency = (val: number) => {
    if (isNaN(val)) return '0 ₽';
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
  }

  const handleScreenshot = async () => {
    if (!proposalRef.current) return;
    setIsExporting(true);
    
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 500));

    try {
        const canvas = await html2canvas(proposalRef.current, {
            backgroundColor: '#050505',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            ignoreElements: (element) => element.classList.contains('no-screenshot')
        });

        const imgData = canvas.toDataURL('image/png');
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            setGeneratedImage(imgData);
        } else {
            const link = document.createElement('a');
            link.download = `Estimate_${clientName || 'Project'}_${new Date().toISOString().split('T')[0]}.png`;
            link.href = imgData;
            link.click();
        }

    } catch (error) {
        console.error("Screenshot failed:", error);
        alert("Не удалось создать скриншот. Возможно, браузер блокирует действие.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleApproveClick = () => {
    setProposalStatus('accepted');
    if (onApprove) onApprove();
  };

  const generateTextReport = () => {
    const date = new Date().toLocaleDateString('ru-RU');
    let text = `⚡️ ANTI-DOSHIRAK ESTIMATE // ${date}\n`;
    text += `====================================\n`;
    if (clientName) text += `👤 ЗАКАЗЧИК: ${clientName}\n`;
    text += `📅 СРОКИ: ${timelineString}\n`;
    text += `💰 ИТОГО: ${isEmpty ? 'ПО ЗАПРОСУ' : formatCurrency(total)}\n`;
    text += `====================================\n\n`;
    
    if (isEmpty) {
        text += `ПРЕДЛОЖЕНИЕ НЕ АКТИВНО ИЛИ НЕ НАЙДЕНО.\n`;
    } else {
        text += `📋 ДЕТАЛИЗАЦИЯ (SCOPE):\n`;
        items.forEach(item => {
           const cost = item.amount * item.lightning_price * safeCurrencyRate * AI_BUFFER_MULTIPLIER;
           text += `• ${item.name} (${item.amount} ${item.unit}): ${formatCurrency(cost)}\n`;
        });
        text += `• Специалист (Production, ${safeLaborHours}ч): ${formatCurrency(baseLaborCost)}\n`;
        
        if (premiumValue > 100) {
            text += `\n📈 КОЭФФИЦИЕНТЫ:\n`;
            text += `• Сложность (Risk x${safeRisk}): ${RISK_LABELS[safeRisk] || ''}\n`;
            if (safeUrgency > 1.0) text += `• Срочность (Urgency x${safeUrgency}): ${URGENCY_LABELS[safeUrgency] || ''}\n`;
            text += `• Доп. ценность (Multipliers): ${formatCurrency(premiumValue)}\n`;
        }
        
        text += `\n🛡 АРГУМЕНТАЦИЯ:\n`;
        if (safeUrgency > 1.0) text += `- Проект реализуется в приоритетном режиме (Fast Track).\n`;
        text += `- В стоимость заложены риски генерации и технические итерации.\n`;
    }
    
    if (creatorName) {
        text += `\n--------------------------------\n`;
        text += `С уважением,\n${creatorName}`;
        if (creatorTelegram) text += ` (${creatorTelegram})`;
    }
    
    return text;
  };

  const currentDate = new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });

  if (proposalStatus === 'accepted') {
    return (
        <div className="min-h-screen bg-cyber-black flex flex-col items-center justify-center p-4 animate-fade-in text-center relative overflow-hidden">
             <div className="absolute inset-0 bg-[linear-gradient(rgba(10,10,10,1)_1px,transparent_1px),linear-gradient(90deg,rgba(10,10,10,1)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] -z-10 opacity-20"></div>

            <div className="max-w-md w-full border border-cyber-neon bg-zinc-900/80 p-8 relative shadow-[0_0_50px_rgba(204,255,0,0.15)] backdrop-blur-md">
                <div className="absolute top-0 left-0 w-2 h-2 bg-cyber-neon"></div>
                <div className="absolute top-0 right-0 w-2 h-2 bg-cyber-neon"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 bg-cyber-neon"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-cyber-neon"></div>

                <div className="text-6xl mb-6 animate-pulse">🤝</div>
                
                <h2 className="text-2xl font-mono text-white font-bold mb-2 tracking-widest uppercase">
                    PROTOCOL <span className="text-cyber-neon">ACTIVATED</span>
                </h2>
                
                <div className="h-px bg-gradient-to-r from-transparent via-cyber-neon to-transparent w-full my-4"></div>

                <p className="text-sm text-gray-300 font-mono mb-8 leading-relaxed">
                    Предложение принято. Система зафиксировала договоренности. 
                    <br/>
                    Инициализация рабочего процесса...
                </p>

                {creatorTelegram ? (
                     <a 
                        href={`https://t.me/${creatorTelegram.replace('@','').replace('https://t.me/','')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block w-full bg-cyber-neon text-black font-bold py-4 font-mono uppercase tracking-widest hover:shadow-[0_0_25px_rgba(204,255,0,0.6)] hover:bg-white transition-all mb-6"
                      >
                        ОТКРЫТЬ ЧАТ С ИСПОЛНИТЕЛЕМ
                      </a>
                ) : (
                    <div className="p-4 border border-dashed border-zinc-700 text-gray-500 font-mono text-xs mb-6">
                        КОНТАКТЫ ИСПОЛНИТЕЛЯ НЕ УКАЗАНЫ.<br/>ИСПОЛЬЗУЙТЕ СТАНДАРТНЫЙ КАНАЛ СВЯЗИ.
                    </div>
                )}
                
                <button 
                    onClick={() => setProposalStatus('viewing')}
                    className="text-[10px] text-cyber-dim font-mono hover:text-white hover:underline uppercase tracking-wider"
                >
                    &lt; ВЕРНУТЬСЯ К ПРОСМОТРУ СМЕТЫ
                </button>
            </div>
            
             <div className="absolute bottom-8 text-[9px] text-zinc-800 font-mono">
                 powered by @neuroskam
             </div>
        </div>
    );
  }

  return (
    <div ref={proposalRef} className={`space-y-6 pb-32 animate-fade-in ${isClientMode ? 'pt-0' : ''} bg-cyber-black min-h-screen text-gray-300 print:bg-white print:text-black print:pb-0 print:space-y-4 print:block`}>
      
      {/* IMAGE PREVIEW MODAL */}
      {generatedImage && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md no-screenshot animate-fade-in">
             <div className="w-full max-w-lg flex flex-col items-center">
                <div className="text-center mb-4">
                     <p className="text-cyber-neon font-mono font-bold text-lg animate-pulse">СНИМОК СГЕНЕРИРОВАН</p>
                     <p className="text-xs text-gray-400 font-mono mt-1">
                        Нажмите на изображение и удерживайте,<br/>чтобы сохранить его в галерею.
                     </p>
                </div>
                
                <div className="border border-cyber-dim shadow-[0_0_30px_rgba(204,255,0,0.1)] mb-6 max-h-[60vh] overflow-y-auto">
                    <img src={generatedImage} alt="Estimate Preview" className="w-full h-auto block" />
                </div>

                <button 
                    onClick={() => setGeneratedImage(null)}
                    className="bg-white text-black font-mono font-bold py-3 px-8 uppercase hover:bg-cyber-neon transition-colors"
                >
                    ЗАКРЫТЬ
                </button>
             </div>
        </div>
      )}

      {/* TEXT REPORT MODAL */}
      {showTextModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 print:hidden backdrop-blur-sm no-screenshot">
            <div className="bg-zinc-900 border border-cyber-neon w-full max-w-2xl p-6 relative shadow-[0_0_50px_rgba(204,255,0,0.1)] flex flex-col h-[80vh] md:h-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-cyber-neon font-mono text-xl tracking-wider">ТЕКСТОВОЙ ОТЧЕТ</h3>
                    <button onClick={() => setShowTextModal(false)} className="text-gray-500 hover:text-white font-mono">[X]</button>
                </div>
                <div className="flex-1 overflow-hidden relative border border-zinc-700 bg-black">
                      <textarea 
                        readOnly 
                        value={generateTextReport()} 
                        className="w-full h-full bg-black text-cyber-tech font-mono text-xs p-4 focus:outline-none resize-none"
                    />
                </div>
                <div className="flex gap-4 mt-4 shrink-0">
                    <button 
                        onClick={() => {
                            const text = generateTextReport();
                            try {
                                const ta = document.createElement('textarea');
                                ta.value = text;
                                ta.style.position = 'fixed';
                                ta.style.left = '-9999px';
                                document.body.appendChild(ta);
                                ta.select();
                                document.execCommand('copy');
                                document.body.removeChild(ta);
                                alert("Отчет скопирован!");
                            } catch (e) {
                                alert("Скопируйте текст вручную.");
                            }
                            setShowTextModal(false);
                        }} 
                        className="flex-1 bg-cyber-neon text-black font-bold py-3 hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all font-mono uppercase"
                    >
                        СКОПИРОВАТЬ
                    </button>
                    <button 
                        onClick={() => setShowTextModal(false)} 
                        className="flex-1 border border-zinc-700 text-gray-400 hover:text-white hover:border-white font-mono uppercase"
                    >
                        ЗАКРЫТЬ
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="hidden print:flex justify-between items-end border-b-2 border-black pb-4 mb-8 pt-8">
         <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-black">СМЕТА ПРОЕКТА</h1>
            <p className="text-sm text-gray-600 mt-1">Дата: {currentDate}</p>
         </div>
         <div className="text-right">
             {creatorAvatarUrl && (
                 <img 
                    src={creatorAvatarUrl} 
                    alt="Logo" 
                    crossOrigin="anonymous" 
                    className="w-24 h-24 object-contain ml-auto mb-2 rounded-lg border border-gray-200" 
                 />
             )}
             <div className="font-bold text-xl text-black">{creatorName || 'NEUROSKAM AGENCY'}</div>
             <div className="text-sm text-gray-500">{creatorTelegram}</div>
         </div>
      </div>

      {/* --- BRANDING --- */}
      <div>
        {(creatorName || creatorTelegram || clientName) && (
            <div className="bg-zinc-900 border-b border-cyber-dim p-4 flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
                {creatorAvatarUrl && (
                    <img 
                        src={creatorAvatarUrl} 
                        alt="Avatar" 
                        crossOrigin="anonymous"
                        className="h-12 w-auto max-w-[120px] rounded-lg object-contain border border-cyber-dim shadow-sm bg-black" 
                    />
                )}
                <div>
                    {creatorName && <div className="text-sm font-bold text-white font-mono">{creatorName}</div>}
                    {creatorTelegram && <a href={`https://t.me/${creatorTelegram.replace('@','')}`} target="_blank" rel="noreferrer" className="text-[10px] text-cyber-tech font-mono hover:underline">{creatorTelegram}</a>}
                </div>
            </div>
            {clientName && (
                <div className="text-right">
                <div className="text-[9px] text-gray-500 font-mono uppercase mb-0.5">Подготовлено для</div>
                <div className="text-xs text-white font-bold font-mono truncate max-w-[200px] leading-relaxed p-0.5">{clientName}</div>
                </div>
            )}
            </div>
        )}
      </div>

      {/* --- INFO BLOCK --- */}
      <div className="hidden print:grid grid-cols-2 gap-8 mb-8 text-sm">
         <div className="border border-gray-300 p-4 bg-gray-50">
            <span className="block text-xs text-gray-500 uppercase mb-1">ЗАКАЗЧИК</span>
            <span className="font-bold text-lg block text-black">{clientName || '_______________'}</span>
         </div>
         <div className="border border-gray-300 p-4 bg-gray-50">
            <span className="block text-xs text-gray-500 uppercase mb-1">СРОКИ РЕАЛИЗАЦИИ</span>
            <span className="font-bold text-lg block text-black">{timelineString}</span>
         </div>
      </div>

      {/* --- SCREEN HEADER --- */}
      <div className={`flex items-center justify-between border-b border-cyber-dim pb-4 ${(!creatorName && !clientName) ? '' : 'pt-0'} px-4 sm:px-0 no-screenshot`}>
        <h2 className="text-2xl font-mono text-white font-bold tracking-tighter">СМЕТА_ПРОЕКТА</h2>
        <div className="flex gap-4 items-center">
            {isClientMode && onFork && (
                <button onClick={onFork} className="text-xs font-mono text-cyber-tech hover:text-white underline uppercase">
                    🛠 СОЗДАТЬ КОПИЮ
                </button>
            )}
            {!isClientMode && onBack && (
            <button onClick={onBack} className="text-xs font-mono text-cyber-dim hover:text-white underline">РЕДАКТОР</button>
            )}
        </div>
      </div>
      
      {/* --- EMPTY STATE --- */}
      {isEmpty && (
        <div className="mx-4 sm:mx-0 mt-4 bg-yellow-500/10 border border-yellow-600 p-4 flex items-center justify-center flex-col text-center">
             <h3 className="text-yellow-500 font-bold font-mono text-lg mb-1">GUEST ACCESS // NO ACTIVE OFFERS</h3>
             <p className="text-xs text-gray-400 font-mono">
                Для данного идентификатора нет активных расчетов или срок действия предложения истек.
             </p>
        </div>
      )}

      {/* --- HERO TOTAL --- */}
      <div className="bg-zinc-900/50 border border-cyber-dim p-6 text-center relative overflow-hidden mx-4 sm:mx-0 print:border-4 print:border-black print:bg-white print:p-8 print:mb-8 print:shadow-none">
        <div className="absolute top-0
