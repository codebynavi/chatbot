import React, { useState, useEffect } from 'react';
import { ChevronDownIcon } from '../constants';

interface ContextProviderProps {
  context: string;
  setContext: (context: string) => void;
}

const ContextProvider: React.FC<ContextProviderProps> = ({ context, setContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localContext, setLocalContext] = useState(context);

  useEffect(() => {
    setLocalContext(context);
  }, [context]);

  const handleBlur = () => {
    setContext(localContext);
  };
  
  const handleClearContext = () => {
    setLocalContext('');
    setContext('');
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-gray-200/50 dark:bg-gray-700/50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-grow text-left p-4 flex justify-between items-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800 dark:text-gray-200">Provide Context</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Paste text from docs, PDFs, or websites to improve answers.</span>
          </div>
          <ChevronDownIcon
            className={`w-5 h-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {localContext && (
          <button
            onClick={handleClearContext}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-4 py-2 transition-colors flex-shrink-0"
            title="Clear context"
          >
            Clear
          </button>
        )}
      </div>
      {isOpen && (
        <div className="p-4">
          <textarea
            value={localContext}
            onChange={(e) => setLocalContext(e.target.value)}
            onBlur={handleBlur}
            placeholder="Paste your context here... Context is saved automatically when you click away."
            className="w-full h-40 p-3 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-300 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          />
        </div>
      )}
    </div>
  );
};

export default ContextProvider;
