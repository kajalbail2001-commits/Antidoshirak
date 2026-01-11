
import React from 'react';
import { AppSettings } from '../types';

interface SettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings, onClose }) => {
  
  const costPerToken = settings.packageTokens > 0 
    ? settings.packagePriceUsd / settings.packageTokens 
    : 0;

  // Financial Floor Calculation (RUB)
  const calculatedMinRate = settings.billableHoursPerMonth > 0 
    ? Math.ceil(settings.targetMonthlyIncome / settings.billableHoursPerMonth)
    : 0;

  // Auto-update hourly rate if it falls below calculated floor
  const isRateTooLow = settings.hourlyRate < calculatedMinRate;

  // Helper to remove leading zeros
  const handleNumberChange = (val: string, field: keyof AppSettings) => {
    const num = val === '' ? 0 : Number(val);
    setSettings(prev => ({ ...prev, [field]: num }));
  };

  const handleStringChange = (val: string, field: keyof AppSettings) => {
      setSettings(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className="min-h-screen bg-cyber-black text-gray-300 font-sans p-4 sm:p-8 animate-fade-in flex justify-center">
      <div className="w-full max-w-2xl space-y-8 pb-20">
        
        {/* Header */}
        <div className="border-b border-cyber-dim pb-4 flex justify-between items-center sticky top-0 bg-cyber-black/90 backdrop-blur z-10 pt-2">
            <h2 className="text-xl font-mono text-cyber-neon tracking-wider">КОНФИГУРАЦИЯ</h2>
            <button onClick={onClose} className="text-cyber-alert font-mono hover:text-white uppercase text-sm border border-transparent hover:border-cyber-alert px-2 py-1 transition-all">
                [ЗАКРЫТЬ]
            </button>
        </div>

        {/* PERSONAL BRANDING */}
        <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
                <label className="text-xs text-cyber-tech font-mono block uppercase tracking-wider">ОФОРМЛЕНИЕ КП (БРЕНДИНГ)</label>
            </div>

            <div>
                <label className="text-[10px] text-gray-500 font-mono block mb-1">ИМЯ КЛИЕНТА (ДЛЯ КОГО)</label>
                <input
                type="text"
                value={settings.clientName || ''}
                onChange={(e) => handleStringChange(e.target.value, 'clientName')}
                placeholder="OOO 'Cyberdyne Systems'"
                className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 font-mono text-sm focus:border-cyber-tech outline-none placeholder-gray-700"
                />
            </div>
            
            <div>
                <label className="text-[10px] text-gray-500 font-mono block mb-1">ВАШЕ ИМЯ / НАЗВАНИЕ СТУДИИ</label>
                <input
                type="text"
                value={settings.creatorName || ''}
                onChange={(e) => handleStringChange(e.target.value, 'creatorName')}
                placeholder="Neo Anderson"
                className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 font-mono text-sm focus:border-cyber-tech outline-none placeholder-gray-700"
                />
            </div>

            <div>
                <label className="text-[10px] text-gray-500 font-mono block mb-1">TELEGRAM CONTACT</label>
                <input
                type="text"
                value={settings.creatorTelegram || ''}
                onChange={(e) => handleStringChange(e.target.value, 'creatorTelegram')}
                placeholder="@neo_matrix"
                className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 font-mono text-sm focus:border-cyber-tech outline-none placeholder-gray-700"
                />
            </div>

            <div>
                <label className="text-[10px] text-gray-500 font-mono block mb-1">ССЫЛКА НА ЛОГОТИП / АВАТАР (URL)</label>
                <input
                type="text"
                value={settings.creatorAvatarUrl || ''}
                onChange={(e) => handleStringChange(e.target.value, 'creatorAvatarUrl')}
                placeholder="https://imgur.com/..."
                className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 font-mono text-sm focus:border-cyber-tech outline-none placeholder-gray-700"
                />
                <p className="text-[9px] text-gray-600 mt-1">
                Используйте прямую ссылку на изображение (загрузить: <a href="https://imgur.com/upload" target="_blank" rel="noreferrer" className="text-cyber-dim hover:text-white underline">imgur.com/upload</a>).
                </p>
            </div>
        </div>

        {/* FINANCIAL ANCHOR */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
            <div className="flex justify-between items-center">
                <label className="text-xs text-cyber-alert font-mono block uppercase tracking-wider">ФИНАНСОВЫЙ ЯКОРЬ (ВАШ ПОЛ)</label>
            </div>
            
            <div>
                <label className="text-[10px] text-gray-500 font-mono block mb-1">ЦЕЛЬ: ДОХОД В МЕСЯЦ (RUB)</label>
                <input
                type="number"
                value={settings.targetMonthlyIncome}
                onChange={(e) => handleNumberChange(e.target.value, 'targetMonthlyIncome')}
                className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 font-mono text-sm focus:border-cyber-alert outline-none"
                />
            </div>

            <div>
                <label className="text-[10px] text-gray-500 font-mono block mb-1">ДОСТУПНЫЕ ЧАСЫ В МЕСЯЦ</label>
                <input
                type="number"
                value={settings.billableHoursPerMonth}
                onChange={(e) => handleNumberChange(e.target.value, 'billableHoursPerMonth')}
                className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 font-mono text-sm focus:border-cyber-alert outline-none"
                />
            </div>

            <div className="p-4 bg-zinc-900/50 border border-dashed border-zinc-700">
                <div className="flex justify-between items-center font-mono">
                    <span className="text-xs text-gray-500">РАСЧЕТНЫЙ МИНИМУМ ЧАСА:</span>
                    <span className="text-sm text-cyber-alert font-bold">{calculatedMinRate.toLocaleString()} RUB</span>
                </div>
            </div>
        </div>

        {/* RATES CONFIG */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
            <div className="flex justify-between items-center">
                <label className="text-xs text-cyber-neon font-mono block uppercase tracking-wider">НАСТРОЙКИ РЕЙТОВ</label>
            </div>

            <div>
                <label className="text-[10px] text-gray-500 font-mono block mb-1">СТОИМОСТЬ ВАШЕГО ЧАСА (RUB)</label>
                <input
                    type="number"
                    value={settings.hourlyRate}
                    onChange={(e) => handleNumberChange(e.target.value, 'hourlyRate')}
                    className={`w-full bg-zinc-900 border ${isRateTooLow ? 'border-red-500' : 'border-zinc-700'} text-white p-3 font-mono text-sm focus:border-cyber-neon outline-none`}
                />
                {isRateTooLow && (
                    <p className="text-[10px] text-red-500 mt-1 font-mono">
                        ⚠️ Ваш рейт ниже расчетного минимума для достижения цели!
                    </p>
                )}
            </div>

            {/* SYNTX CALIBRATION */}
            <div className="bg-zinc-900/50 border border-cyber-tech/30 p-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] text-cyber-tech font-mono block uppercase tracking-wider font-bold">КАЛИБРОВКА КУРСА (SYNTX)</label>
                    <a 
                        href="https://t.me/syntxaibot?start=aff_6590079602"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] bg-cyber-tech/10 text-cyber-tech border border-cyber-tech px-3 py-1 font-mono uppercase hover:bg-cyber-tech hover:text-black transition-all flex items-center gap-1"
                    >
                        <span>🔗</span> СВЕРИТЬ В БОТЕ
                    </a>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] text-gray-500 font-mono block mb-1">ЦЕНА ТАРИФА (₽)</label>
                        <input
                            type="number"
                            value={settings.packagePriceUsd}
                            onChange={(e) => handleNumberChange(e.target.value, 'packagePriceUsd')}
                            className="w-full bg-black border border-zinc-700 text-white p-3 font-mono text-sm focus:border-cyber-tech outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 font-mono block mb-1">КОЛ-ВО МОЛНИЙ (⚡)</label>
                        <input
                            type="number"
                            value={settings.packageTokens}
                            onChange={(e) => handleNumberChange(e.target.value, 'packageTokens')}
                            className="w-full bg-black border border-zinc-700 text-white p-3 font-mono text-sm focus:border-cyber-tech outline-none"
                        />
                    </div>
                </div>
                
                <div className="mt-3 p-2 bg-black/50 border border-dashed border-zinc-800 text-right">
                    <span className="text-[10px] text-gray-500 font-mono uppercase mr-2">СТОИМОСТЬ 1 МОЛНИИ:</span>
                    <span className="text-sm text-cyber-neon font-bold font-mono">{costPerToken.toFixed(2)} ₽</span>
                </div>
            </div>
            
        </div>

        <button 
            onClick={onClose}
            className="w-full bg-cyber-neon text-black font-bold py-4 font-mono uppercase tracking-widest hover:shadow-[0_0_20px_rgba(204,255,0,0.5)] transition-all"
        >
            СОХРАНИТЬ И ЗАКРЫТЬ
        </button>

      </div>
    </div>
  );
};

export default Settings;
