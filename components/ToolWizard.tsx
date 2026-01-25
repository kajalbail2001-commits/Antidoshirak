import React, { useState } from 'react';
import { Tool, ProjectItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ToolWizardProps {
  tools: Tool[];
  onAdd: (item: ProjectItem) => void;
  onAddCustom?: (tool: Tool) => void;
  onClose: () => void;
}

const ToolWizard: React.FC<ToolWizardProps> = ({ tools, onAdd, onAddCustom, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [amount, setAmount] = useState<number>(0);

  // Custom tool state
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState(0);
  const [customUnit, setCustomUnit] = useState<any>('generation');

  const categories = Array.from(new Set(tools.map(t => t.category)));

  const handleCreateCustom = () => {
    if (!customName || customPrice <= 0) return;
    const newTool: Tool = {
      id: `manual_${Date.now()}`,
      name: customName,
      lightning_price: customPrice,
      unit: customUnit,
      category: 'other'
    };
    // Call the special prop for custom tools
    if (onAddCustom) {
      onAddCustom(newTool);
    } else {
      // Fallback if not provided (should not happen based on App.tsx)
      onAdd({ ...newTool, uniqueId: uuidv4(), amount: 1 });
    }
    onClose();
  };

  const handleAdd = () => {
    if (selectedTool && amount > 0) {
      onAdd({
        ...selectedTool,
        uniqueId: uuidv4(),
        amount: amount
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-cyber-black border-t sm:border border-cyber-dim shadow-2xl shadow-cyber-neon/10 p-4 h-[80vh] sm:h-auto overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-cyber-dim">
          <h3 className="text-cyber-tech font-mono">ДОБАВИТЬ МОДУЛЬ</h3>
          <button onClick={onClose} className="text-cyber-alert font-mono">[X]</button>
        </div>

        {/* Step 1: Category */}
        {!selectedCategory && !isCreatingCustom && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setIsCreatingCustom(true)}
              className="p-4 border border-dashed border-cyber-neon/50 text-cyber-neon hover:bg-cyber-neon/10 transition-all uppercase font-mono text-sm font-bold"
            >
              + СВОЙ ВАРИАНТ
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="p-4 border border-zinc-800 bg-zinc-900 hover:border-cyber-tech hover:text-cyber-tech transition-all uppercase font-mono text-sm"
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Step 1.5: Create Custom Tool */}
        {isCreatingCustom && (
          <div className="space-y-4">
            <button
              onClick={() => setIsCreatingCustom(false)}
              className="text-xs text-cyber-dim mb-2 font-mono hover:text-white"
            >
              &lt; НАЗАД
            </button>
            <h4 className="text-cyber-neon font-bold mb-4 font-mono">СОЗДАНИЕ КАСТОМА</h4>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Название услуги..."
                className="w-full bg-black border border-zinc-700 p-3 text-white font-mono text-sm focus:border-cyber-neon outline-none"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Цена (⚡)"
                  className="flex-1 bg-black border border-zinc-700 p-3 text-white font-mono text-sm focus:border-cyber-neon outline-none"
                  value={customPrice || ''}
                  onChange={e => setCustomPrice(Number(e.target.value))}
                />
                <select
                  className="bg-black border border-zinc-700 p-3 text-white font-mono text-sm focus:border-cyber-neon outline-none"
                  value={customUnit}
                  onChange={e => setCustomUnit(e.target.value)}
                >
                  <option value="generation">за шт</option>
                  <option value="second">за сек</option>
                  <option value="minute">за мин</option>
                  <option value="hour">за час</option>
                </select>
              </div>
              <button
                disabled={!customName || customPrice <= 0}
                onClick={handleCreateCustom}
                className="w-full bg-cyber-tech text-black font-bold py-3 font-mono uppercase disabled:opacity-50 hover:bg-white transition-all mt-4"
              >
                СОХРАНИТЬ И ДОБАВИТЬ
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Tool Selection */}
        {selectedCategory && !selectedTool && !isCreatingCustom && (
          <div className="space-y-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-cyber-dim mb-2 font-mono hover:text-white"
            >
              &lt; НАЗАД
            </button>
            {tools.filter(t => t.category === selectedCategory).map(tool => (
              <button
                key={tool.name}
                onClick={() => setSelectedTool(tool)}
                className="w-full text-left p-3 border border-zinc-800 hover:bg-zinc-900 hover:border-cyber-neon transition-all flex justify-between items-center group"
              >
                <span className="font-sans font-bold text-gray-300 group-hover:text-white">{tool.name}</span>
                <span className="font-mono text-xs text-cyber-dim group-hover:text-cyber-neon">{tool.lightning_price}⚡/{tool.unit.slice(0, 3)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Configuration */}
        {selectedTool && (
          <div className="space-y-6">
            <button
              onClick={() => setSelectedTool(null)}
              className="text-xs text-cyber-dim mb-2 font-mono hover:text-white"
            >
              &lt; НАЗАД
            </button>

            <div className="p-4 bg-zinc-900 border border-cyber-neon/30">
              <h4 className="text-cyber-neon font-bold mb-1">{selectedTool.name}</h4>
              <p className="text-xs text-gray-500 font-mono uppercase">База: {selectedTool.lightning_price} ⚡ / {selectedTool.unit}</p>
            </div>

            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">
                {selectedTool.unit === 'second' ? 'ДЛИТЕЛЬНОСТЬ (СЕК)' : 'КОЛИЧЕСТВО (ГЕНЕРАЦИЙ)'}
              </label>
              <input
                type="number"
                min="1"
                className="w-full bg-black border border-cyber-dim p-4 text-xl font-mono text-white focus:border-cyber-tech outline-none"
                placeholder="0"
                onChange={(e) => setAmount(Number(e.target.value))}
                autoFocus
              />
            </div>

            <button
              disabled={amount <= 0}
              onClick={handleAdd}
              className="w-full bg-cyber-neon text-black font-bold py-4 font-mono uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(204,255,0,0.4)] transition-all"
            >
              Внедрить в Чек
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolWizard;