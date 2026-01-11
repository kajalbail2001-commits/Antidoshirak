
import React, { useState, useEffect } from 'react';
import { MARKET_RATES } from '../constants';
import { MarketService, ProjectItem } from '../types';

interface MarketplaceProps {
  userPrice: number;
  items?: ProjectItem[];
  onClose: () => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ userPrice, items, onClose }) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(MARKET_RATES.services[0].id);
  const [activeService, setActiveService] = useState<MarketService>(MARKET_RATES.services[0]);
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [detectedVolume, setDetectedVolume] = useState<string>("");

  // Logic to auto-calculate scale based on items vs service base unit
  useEffect(() => {
    const found = MARKET_RATES.services.find(s => s.id === selectedServiceId);
    if (found) {
        setActiveService(found);
        
        if (items && items.length > 0) {
            let totalVolume = 0;
            
            // Heuristic to match items to service category
            if (found.category === "Video Gen") {
                // Sum seconds
                items.forEach(i => {
                    if (i.category === 'video' || i.category === 'avatar' || i.category === 'audio') {
                        let sec = 0;
                        if (i.unit === 'second') sec = i.amount;
                        else if (i.unit === 'minute') sec = i.amount * 60;
                        else if (i.unit === 'generation') sec = i.amount * 5; // approx 5s per gen
                        totalVolume += sec;
                    }
                });
                
                // Formatting display for humans (Min:Sec)
                let volStr = "";
                if (totalVolume >= 60) {
                    const m = Math.floor(totalVolume / 60);
                    const s = Math.round(totalVolume % 60);
                    volStr = `${m} мин ${s > 0 ? s + ' сек' : ''}`;
                } else {
                    volStr = `${totalVolume.toFixed(0)} сек`;
                }
                
                if (found.base_unit_amount > 0) {
                   // Calculate raw factor
                   const rawFactor = totalVolume / found.base_unit_amount;
                   // Round UP to nearest whole number (Anti-Doshirak style: don't sell 1.5 packs, sell 2)
                   const factor = Math.ceil(Math.max(1, rawFactor));
                   
                   setScaleFactor(factor);
                   setDetectedVolume(`${volStr} (x${factor})`);
                }

            } else if (found.category === "Image Gen") {
                // Sum images
                 items.forEach(i => {
                    if (i.category === 'image') {
                        totalVolume += i.amount;
                    }
                });
                 if (found.base_unit_amount > 0) {
                   const rawFactor = totalVolume / found.base_unit_amount;
                   const factor = Math.ceil(Math.max(1, rawFactor));
                   setScaleFactor(factor);
                   setDetectedVolume(`${totalVolume} шт (x${factor})`);
                }
            } else if (found.category === "Audio Gen") {
                 // Sum tracks/generations
                 items.forEach(i => {
                    if (i.category === 'audio') {
                         totalVolume += i.amount;
                    }
                });
                if (found.base_unit_amount > 0) {
                   const rawFactor = totalVolume / found.base_unit_amount;
                   const factor = Math.ceil(Math.max(1, rawFactor));
                   setScaleFactor(factor);
                   setDetectedVolume(`${totalVolume} трек(ов) (x${factor})`);
                }
            } else {
                // Fallback
                setScaleFactor(1);
                setDetectedVolume("Стандарт");
            }
        }
    }
  }, [selectedServiceId, items]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);

  // Scaled Price Helper
  const getScaledMin = (tier: any) => tier.price_range[0] * scaleFactor;
  const getScaledMax = (tier: any) => tier.price_range[1] * scaleFactor;

  // Helper to determine where user price fits
  const getPricePosition = (price: number, min: number, max: number) => {
    if (price < min) return 'below';
    if (price >= min && price <= max) return 'inside'; // Closed interval to prevent gaps
    return 'above';
  };

  return (
    <div className="flex flex-col h-full bg-cyber-black animate-fade-in p-4 overflow-y-auto pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-cyber-dim pb-4">
        <div>
           <h2 className="text-xl font-mono text-cyber-tech tracking-wider">MARKET CALIBRATION</h2>
           <p className="text-[10px] text-gray-500 font-mono">NEUROSKAM DATABASE v1.0</p>
        </div>
        <button onClick={onClose} className="text-xs font-mono text-cyber-alert hover:underline">ЗАКРЫТЬ</button>
      </div>

      {/* Your Price Hero */}
      <div className="bg-zinc-900 border border-cyber-neon p-4 mb-6 text-center shadow-[0_0_15px_rgba(204,255,0,0.1)]">
        <p className="text-[10px] text-cyber-dim font-mono uppercase tracking-widest mb-1">ВАША ОЦЕНКА (YOUR PRICE)</p>
        <h1 className="text-3xl font-mono text-cyber-neon font-black">
          {formatCurrency(userPrice)}
        </h1>
      </div>

      {/* Configuration Area */}
      <div className="bg-zinc-900/50 p-4 border border-zinc-800 mb-6 rounded">
          {/* Selector */}
          <div className="mb-4 space-y-2">
            <label className="text-xs text-gray-400 font-mono">ЭТАЛОН (BENCHMARK)</label>
            <select 
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full bg-black border border-cyber-dim text-white p-2 font-mono text-xs focus:border-cyber-tech outline-none"
            >
              {MARKET_RATES.services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 font-mono">
               База: {activeService.base_unit_amount} {activeService.unit_label}
            </p>
          </div>

          {/* Scaling Slider */}
          <div className="space-y-2">
             <div className="flex justify-between items-center">
                <label className="text-xs text-cyber-tech font-mono">МАСШТАБ (ОБЪЕМ)</label>
                <span className="text-xs font-mono text-white font-bold">x{scaleFactor}</span>
             </div>
             <input 
               type="range"
               min="1"
               max="20"
               step="1"
               value={scaleFactor}
               onChange={(e) => setScaleFactor(Number(e.target.value))}
               className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyber-neon"
             />
             <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                <span>Мало (x1)</span>
                <span>{detectedVolume ? `Авто: ${detectedVolume}` : 'Стандарт'}</span>
                <span>Максимум (x20)</span>
             </div>
          </div>
      </div>

      {/* Tiers Container */}
      <div className="space-y-4">
        
        {/* TIER 1: ECONOMY */}
        <div className={`p-4 rounded border border-dashed transition-all relative ${
          getPricePosition(userPrice, getScaledMin(activeService.tiers.tier_1), getScaledMax(activeService.tiers.tier_1)) === 'inside'
          ? 'border-gray-400 bg-gray-900/20 opacity-100' 
          : 'border-zinc-700 bg-transparent opacity-60'
        }`}>
          <div className="flex justify-between items-start mb-2">
            <div>
               <h3 className="text-sm font-bold text-gray-400 font-mono flex items-center gap-2">
                 ⚠️ {activeService.tiers.tier_1.label}
               </h3>
               <p className="text-[10px] text-gray-600 font-mono">SLA: {activeService.tiers.tier_1.sla_days} DAYS</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-gray-500">
                {formatCurrency(getScaledMin(activeService.tiers.tier_1))} - {formatCurrency(getScaledMax(activeService.tiers.tier_1))}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-mono leading-relaxed">
            {activeService.tiers.tier_1.desc}
          </p>
          {getPricePosition(userPrice, getScaledMin(activeService.tiers.tier_1), getScaledMax(activeService.tiers.tier_1)) === 'inside' && (
             <div className="mt-2 text-[10px] text-red-500 font-bold font-mono bg-red-900/10 p-1 text-center">
               ВНИМАНИЕ: ВЫ В ЗОНЕ ДЕМПИНГА
             </div>
          )}
        </div>

        {/* TIER 2: PRO */}
        <div className={`p-5 rounded relative transition-all ${
           getPricePosition(userPrice, getScaledMin(activeService.tiers.tier_2), getScaledMax(activeService.tiers.tier_2)) === 'inside'
           ? 'bg-cyber-neon/10 border border-cyber-neon shadow-[0_0_20px_rgba(204,255,0,0.15)] transform scale-105 z-10'
           : 'bg-zinc-900 border border-zinc-700 hover:border-cyber-dim'
        }`}>
          {/* Badge */}
          <div className="absolute -top-3 right-4 bg-cyber-neon text-black text-[9px] font-black px-2 py-0.5 rounded font-mono uppercase tracking-wide">
             RECOMMENDED
          </div>

          <div className="flex justify-between items-start mb-2">
            <div>
               <h3 className={`text-base font-bold font-mono flex items-center gap-2 ${
                  getPricePosition(userPrice, getScaledMin(activeService.tiers.tier_2), getScaledMax(activeService.tiers.tier_2)) === 'inside'
                  ? 'text-cyber-neon' : 'text-gray-200'
               }`}>
                 💎 {activeService.tiers.tier_2.label}
               </h3>
               <p className="text-[10px] text-cyber-dim font-mono">SLA: {activeService.tiers.tier_2.sla_days} DAYS</p>
            </div>
            <div className="text-right">
              <span className={`text-sm font-mono font-bold ${
                  getPricePosition(userPrice, getScaledMin(activeService.tiers.tier_2), getScaledMax(activeService.tiers.tier_2)) === 'inside'
                  ? 'text-white' : 'text-gray-400'
              }`}>
                {formatCurrency(getScaledMin(activeService.tiers.tier_2))} - {formatCurrency(getScaledMax(activeService.tiers.tier_2))}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 font-mono leading-relaxed border-t border-zinc-800 pt-2 mt-2">
            {activeService.tiers.tier_2.desc}
          </p>

          {getPricePosition(userPrice, getScaledMin(activeService.tiers.tier_2), getScaledMax(activeService.tiers.tier_2)) === 'inside' && (
             <div className="mt-3 text-[10px] text-cyber-neon font-bold font-mono bg-cyber-neon/10 p-2 text-center border border-cyber-neon/30">
               ✓ ОТЛИЧНОЕ ПОПАДАНИЕ В РЫНОК
             </div>
          )}
        </div>

        {/* TIER 3: AGENCY */}
        <div className={`p-4 rounded border transition-all relative ${
          getPricePosition(userPrice, getScaledMin(activeService.tiers.tier_3), 99999999) === 'inside'
          ? 'border-cyber-alert bg-cyber-alert/10'
          : 'border-zinc-800 bg-black'
        }`}>
          <div className="flex justify-between items-start mb-2">
            <div>
               <h3 className="text-sm font-bold text-gray-300 font-mono flex items-center gap-2">
                 🏢 {activeService.tiers.tier_3.label}
               </h3>
               <p className="text-[10px] text-gray-600 font-mono">SLA: {activeService.tiers.tier_3.sla_days} DAYS</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-gray-500">
                {formatCurrency(getScaledMin(activeService.tiers.tier_3))}+
              </span>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-mono leading-relaxed">
            {activeService.tiers.tier_3.desc}
          </p>
           {getPricePosition(userPrice, getScaledMin(activeService.tiers.tier_3), 99999999) === 'inside' && (
             <div className="mt-2 text-[10px] text-cyber-alert font-bold font-mono bg-cyber-alert/10 p-1 text-center">
               ВЫ В СЕГМЕНТЕ ENTERPRISE
             </div>
          )}
        </div>

      </div>

      <button onClick={onClose} className="mt-auto w-full border border-cyber-neon text-cyber-neon py-4 font-mono uppercase tracking-widest hover:bg-cyber-neon hover:text-black transition-all font-bold">
        Принять и Вернуться
      </button>
    </div>
  );
};

export default Marketplace;
