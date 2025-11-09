import React from 'react';
import { BotIcon } from '../constants';

const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex items-start gap-4 my-4">
      <div className="flex-shrink-0">
        <BotIcon />
      </div>
      <div className="max-w-xl md:max-w-2xl rounded-2xl p-4 bg-gray-200 dark:bg-gray-700 rounded-bl-none flex items-center space-x-2">
        <span className="dot-bounce dot-1 h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full"></span>
        <span className="dot-bounce dot-2 h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full"></span>
        <span className="dot-bounce dot-3 h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full"></span>
      </div>
    </div>
  );
};

export default ThinkingIndicator;
