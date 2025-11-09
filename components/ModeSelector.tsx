import React from 'react';
import { ChatMode } from '../types';

interface ModeSelectorProps {
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
}

const modes = [
  { id: ChatMode.CHAT, label: 'Standard Chat', description: 'Fast, general-purpose conversation.' },
  { id: ChatMode.THINKING, label: 'Complex Thinking', description: 'For deep analysis and complex tasks.' },
  { id: ChatMode.MAPS, label: 'Maps Grounding', description: 'For location-based, up-to-date info.' },
];

const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, setMode }) => {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            title={m.description}
            className={`px-4 py-2 text-sm text-left rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-teal-500
              ${mode === m.id 
                ? 'bg-teal-500 dark:bg-teal-600 text-white shadow-md' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <p className="font-semibold">{m.label}</p>
            <p className="text-xs opacity-80">{m.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;