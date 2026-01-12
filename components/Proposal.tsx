import React, { useState, useRef } from 'react';
import { ProjectItem, RiskLevel, UrgencyLevel } from '../types';
import { AI_BUFFER_MULTIPLIER, RISK_LABELS, URGENCY_LABELS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import html2canvas from 'html2canvas';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        close: () => void;
      };
    };
  }
}

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
  const [isSending, setIsSending] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [proposalStatus, setProposalStatus] = useState<'viewing' | 'accepted'>('viewing');
  const proposalRef = useRef<HTMLDivElement>(null);

  const safeCurrencyRate = (isNaN(currencyRate) || currencyRate < 0) ? 0 : currencyRate;
  const safeHourlyRate = (isNaN(hourlyRate) || hourlyRate < 0) ? 0 : hourlyRate;
  const safeLaborHours = (isNaN(laborHours) || laborHours < 0) ? 0 : laborHours;
  const safeRisk = (!risk || risk < 1) ? 1.2 : risk;
  const safeUrgency = (!urgency || urgency < 1) ? 1.0 : urgency;
  const isEmpty = items.length === 0 && safeLaborHours === 0;

  // CALCULATIONS
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

  // --- ACTIONS ---
  
  // 1. СКАЧАТЬ PNG
  const handleDownload = async () => {
    if (!proposalRef.current) return;
    setIsExporting(true);
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 500));
    try {
        const canvas = await html2canvas(proposalRef.current, { backgroundColor: '#050505', scale: 2, useCORS: true, ignoreElements: (el) => el.classList.contains('no-screenshot') });
        const link = document.createElement('a');
        link.download = `Estimate_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) { alert("Ошибка сохранения"); } 
    finally { setIsExporting(false); }
  };

  // 2. ОТПРАВИТЬ БОТУ
  const handleSendToBot = async () => {
    if (!proposalRef.current) return;
    const tgInitData = window.Telegram?.WebApp?.initData;
    if (!tgInitData) { alert("⚠️ Работает только в Telegram"); return; }

    setIsSending(true);
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 500));
    try {
        const canvas = await html2canvas(proposalRef.current, { backgroundColor: '#050505', scale: 1, useCORS: true, ignoreElements: (el) => el.classList.contains('no-screenshot') });
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.6); // Сжатие
        const response = await fetch('/.netlify/functions/send-estimate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64, initData: tgInitData })
        });
        if (!response.ok) throw new Error("Сервер не ответил");
        alert("✅ Смета отправлена в личку!");
    } catch (e: any) { alert("Ошибка: " + e.message); } 
    finally { setIsSending(false); }
  };

  const handleApproveClick = () => { setProposalStatus('accepted'); if (onApprove) onApprove(); };

  // 3. ПОЛНЫЙ ТЕКСТОВЫЙ ОТЧЕТ
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
        text += `• Специалист (Production & Engineering, ${safeLaborHours}ч): ${formatCurrency(baseLaborCost)}\n`;
        
        if (premiumValue > 100) {
            text += `\n📈 КОЭФФИЦИЕНТЫ:\n`;
            text += `• Сложность (Risk x${safeRisk}): ${RISK_LABELS[safeRisk] || ''}\n`;
            if (safeUrgency > 1.0) text += `• Срочность (Urgency x${safeUrgency}): ${URGENCY_LABELS[safeUrgency] || ''}\n`;
            text += `• Доп. ценность: ${formatCurrency(premiumValue)}\n`;
        }
        
        text += `\n🛡 АРГУМЕНТАЦИЯ:\n- Проект реализуется в приоритетном режиме.\n- В стоимость заложены риски генерации.\n`;
    }
    
    if (creatorName) text += `\n--------------------------------\nС уважением,\n${creatorName} ${creatorTelegram ? `(${creatorTelegram})` : ''}`;
    return text;
  };

  const currentDate = new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });

  if (proposalStatus === 'accepted') {
    return (
        <div className="min-h-screen bg-cyber-black flex flex-col items-center justify-center p-4 animate-fade-in text-center relative overflow-hidden">
             <div className="absolute inset-0 bg-[linear-gradient(rgba(10,10,10,1)_1px,transparent_1px),linear-gradient(90deg,rgba(10,10,10,1)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] -z-10 opacity-20"></div>
            <div className="max-w-md w-full border border-cyber-neon bg-zinc-900/80 p-8 relative shadow-[0_0_50px_rgba(204,255,0,0.15)] backdrop-blur-md">
                <div className="text-6xl mb-6 animate-pulse">🤝</div>
                <h2 className="text-2xl font-mono text-white font-bold mb-2 tracking-widest uppercase">PROTOCOL <span className="text-cyber-neon">ACTIVATED</span></h2>
                <div className="h-px bg-gradient-to-r from-transparent via-cyber-neon to-transparent w-full my-4"></div>
                <p className="text-sm text-gray-300 font-mono mb-8 leading-relaxed">Предложение принято. Система зафиксировала договоренности.</p>
                {creatorTelegram && <a href={`https://t.me/${creatorTelegram.replace('@','').replace('https://t.me/','')}`} target="_blank" rel="noreferrer" className="block w-full bg-cyber-neon text-black font-bold py-4 font-mono uppercase tracking-widest hover:shadow-[0_0_25px_rgba(204,255,0,0.6)] hover:bg-white transition-all mb-6">ОТКРЫТЬ ЧАТ С ИСПОЛНИТЕЛЕМ</a>}
                <button onClick={() => setProposalStatus('viewing')} className="text-[10px] text-cyber-dim font-mono hover:text-white hover:underline uppercase tracking-wider">&lt; ВЕРНУТЬСЯ К ПРОСМОТРУ СМЕТЫ</button>
            </div>
        </div>
    );
  }

  return (
    <div ref={proposalRef} className={`space-y-6 pb-32 animate-fade-in ${isClientMode ? 'pt-0' : ''} bg-cyber-black min-h-screen text-gray-300 print:bg-white print:text-black print:pb-0 print:space-y-4 print:block`}>
      {showTextModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 print:hidden backdrop-blur-sm no-screenshot">
            <div className="bg-zinc-900 border border-cyber-neon w-full max-w-2xl p-6 relative">
                <textarea readOnly value={generateTextReport()} className="w-full h-64 bg-black text-cyber-tech font-mono text-xs p-4 focus:outline-none resize-none mb-4"/>
                <div className="flex gap-4">
                    <button type="button" onClick={() => { navigator.clipboard.writeText(generateTextReport()); alert("Скопировано!"); setShowTextModal(false); }} className="flex-1 bg-cyber-neon text-black font-bold py-3 font-mono">КОПИРОВАТЬ</button>
                    <button type="button" onClick={() => setShowTextModal(false)} className="flex-1 border border-zinc-700 text-gray-400 font-mono">ЗАКРЫТЬ</button>
                </div>
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="hidden print:flex justify-between items-end border-b-2 border-black pb-4 mb-8 pt-8">
         <div><h1 className="text-4xl font-black uppercase">СМЕТА ПРОЕКТА</h1><p className="text-sm">Дата: {currentDate}</p></div>
         <div className="text-right"><div className="font-bold text-xl">{creatorName || 'NEUROSKAM AGENCY'}</div><div className="text-sm">{creatorTelegram}</div></div>
      </div>

      {/* BRANDING */}
      {(creatorName || creatorTelegram || clientName) && (
        <div className="bg-zinc-900 border-b border-cyber-dim p-4 flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
            {creatorAvatarUrl && <img src={creatorAvatarUrl} alt="Avatar" crossOrigin="anonymous" className="h-12 w-auto max-w-[120px] rounded-lg object-contain border border-cyber-dim shadow-sm bg-black" />}
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

      {/* INFO */}
      <div className="hidden print:grid grid-cols-2 gap-8 mb-8 text-sm">
         <div className="border border-gray-300 p-4"><span>ЗАКАЗЧИК</span><br/><b>{clientName}</b></div>
         <div className="border border-gray-300 p-4"><span>СРОКИ</span><br/><b>{timelineString}</b></div>
      </div>

      {/* HEADER ACTIONS */}
      <div className={`flex items-center justify-between border-b border-cyber-dim pb-4 px-4 sm:px-0 no-screenshot`}>
        <h2 className="text-2xl font-mono text-white font-bold tracking-tighter">СМЕТА_ПРОЕКТА</h2>
        <div className="flex gap-4 items-center">
            {isClientMode && onFork && <button type="button" onClick={onFork} className="text-xs font-mono text-cyber-tech hover:text-white underline uppercase">🛠 СОЗДАТЬ КОПИЮ</button>}
            {!isClientMode && onBack && <button type="button" onClick={onBack} className="text-xs font-mono text-cyber-dim hover:text-white underline">РЕДАКТОР</button>}
        </div>
      </div>
      
      {isEmpty && <div className="mx-4 sm:mx-0 mt-4 bg-yellow-500/10 border border-yellow-600 p-4 text-center text-yellow-500 font-mono text-xs">NO ACTIVE OFFERS</div>}

      {/* TOTAL */}
      <div className="bg-zinc-900/50 border border-cyber-dim p-6 text-center relative overflow-hidden mx-4 sm:mx-0 print:border-4 print:border-black print:bg-white print:p-8 print:mb-8 print:shadow-none">
        <div className="absolute top-0 left-0 w-1 h-full bg-cyber-neon print:hidden"></div>
        <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1 print:text-black print:font-bold">Итоговая Стоимость Проекта</p>
        <h1 className={`text-4xl sm:text-5xl font-mono font-black ${isEmpty ? 'text-gray-500' : 'text-cyber-neon'} print:text-black`}>{isEmpty ? "NO ACTIVE OFFER" : formatCurrency(total)}</h1>
        <div className="mt-2 flex justify-center gap-2 text-[10px] font-mono text-gray-500 print:text-black">
           <span>СЛОЖНОСТЬ: x{safeRisk}</span><span>ПРИОРИТЕТ: x{safeUrgency}</span><span>Timeline: {timelineString}</span>
        </div>
      </div>

      {/* TABLE */}
      {!isEmpty && (
      <div className="px-4 sm:px-0 mb-8 print:px-0">
          <table className="w-full text-xs font-mono text-left text-gray-300 print:text-black">
            <thead className="text-[10px] text-gray-500 uppercase bg-zinc-900/50 print:bg-gray-100">
                <tr><th className="p-2">Инструмент / Услуга</th><th className="p-2 text-right">Объем</th><th className="p-2 text-right">Стоимость</th></tr>
            </thead>
            <tbody>
                <tr className="border-b border-zinc-800 print:border-gray-300"><td className="p-2 font-bold">Специалист (Production & Engineering)</td><td className="p-2 text-right">{safeLaborHours} ч.</td><td className="p-2 text-right">{formatCurrency(baseLaborCost)}</td></tr>
                {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-zinc-800 print:border-gray-300">
                        <td className="p-2">{item.name}</td><td className="p-2 text-right">{item.amount}</td><td className="p-2 text-right">{formatCurrency(item.amount * item.lightning_price * safeCurrencyRate * AI_BUFFER_MULTIPLIER)}</td>
                    </tr>
                ))}
            </tbody>
          </table>
      </div>
      )}

      {/* CHARTS */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 print:hidden mx-4 sm:mx-0">
           <div className="h-40 w-full relative flex items-center justify-center">
             {!isEmpty && total > 0 && (
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#050505', border: '1px solid #333' }} itemStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }} formatter={(value: number) => formatCurrency(value)}/>
                </PieChart>
             </ResponsiveContainer>
             )}
           </div>
      </div>

      {/* FOOTER */}
      <div className="mt-12 mb-4 px-4 sm:px-0 flex justify-end opacity-40 hover:opacity-100 transition-opacity print:hidden">
          <a href="https://t.me/neuroskam" target="_blank" rel="noreferrer" className="text-[10px] font-mono text-gray-600 hover:text-cyber-tech flex items-center gap-2 group decoration-0">
             <span className="w-1.5 h-1.5 bg-gray-700 rounded-full group-hover:bg-cyber-tech transition-colors"></span>dev by @neuroskam
          </a>
      </div>

      {/* ACTIONS */}
      {!isClientMode && (
        <div className="grid grid-cols-2 gap-2 no-print px-4 sm:px-0 no-screenshot">
            <div className="col-span-2 flex gap-2">
                {onMarketCheck && <button type="button" onClick={onMarketCheck} className="flex-1 bg-zinc-800 text-cyber-tech border border-cyber-dim font-bold py-4 font-mono uppercase tracking-widest hover:border-cyber-tech hover:bg-zinc-700 transition-all flex justify-center items-center gap-2"><span className="hidden sm:inline">⚖️</span> Калибровка</button>}
                {onShareClick && <button type="button" onClick={onShareClick} className="flex-[2] bg-cyber-neon text-black font-bold py-4 font-mono uppercase tracking-widest hover:shadow-[0_0_15px_rgba(204,255,0,0.4)] transition-all flex justify-center items-center gap-2"><span>🚀</span> ОТПРАВИТЬ КЛИЕНТУ</button>}
            </div>
            <button type="button" onClick={() => setShowTextModal(true)} className="bg-zinc-900 text-gray-300 border border-zinc-700 font-bold py-3 font-mono uppercase text-xs hover:text-white hover:border-white transition-all">TXT REPORT</button>
            <button type="button" disabled={isSending} onClick={handleSendToBot} className="bg-zinc-900 text-gray-300 border border-zinc-700 font-bold py-3 font-mono uppercase text-[10px] hover:text-white hover:border-white transition-all">{isSending ? '...' : '📥 ОТПРАВИТЬ СЕБЕ'}</button>
            <button type="button" disabled={isExporting} onClick={handleDownload} className="bg-zinc-900 text-gray-300 border border-zinc-700 font-bold py-3 font-mono uppercase text-xs hover:text-white hover:border-white transition-all disabled:opacity-50">{isExporting ? '...' : 'СКАЧАТЬ PNG'}</button>
        </div>
      )}

      {/* CLIENT ACTIONS */}
      {isClientMode && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent z-50 max-w-md mx-auto flex gap-3 no-print no-screenshot">
           <button type="button" onClick={onTender} disabled={isEmpty} className="flex-1 border border-cyber-dim text-gray-300 font-bold py-3 font-mono uppercase text-xs hover:border-cyber-tech hover:text-cyber-tech transition-all disabled:opacity-30">СРАВНИТЬ ЦЕНЫ</button>
           <button type="button" onClick={handleApproveClick} disabled={isEmpty} className="flex-1 bg-cyber-neon text-black font-bold py-3 font-mono uppercase text-xs hover:shadow-[0_0_15px_rgba(204,255,0,0.4)] transition-all disabled:opacity-30">ПРИНЯТЬ ПРЕДЛОЖЕНИЕ</button>
        </div>
      )}
    </div>
  );
};

export default Proposal;
