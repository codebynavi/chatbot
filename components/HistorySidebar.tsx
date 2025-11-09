
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Conversation } from '../types';
import { PencilIcon, CheckIcon, XIcon, TrashIcon, SearchIcon, PlusIcon } from '../constants';

interface HistorySidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearAllConversations: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
  conversations, 
  activeConversationId, 
  onNewChat, 
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onClearAllConversations,
  isOpen,
  setIsOpen 
}) => {
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  useEffect(() => {
    if (editingConvId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingConvId]);

  const handleStartEditing = (conv: Conversation) => {
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleCancelEditing = () => {
    setEditingConvId(null);
    setEditingTitle('');
  };

  const handleSaveRename = () => {
    if (editingConvId && editingTitle.trim()) {
      onRenameConversation(editingConvId, editingTitle.trim());
    }
    handleCancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelEditing();
    }
  };

  const handleDelete = (convId: string) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
        onDeleteConversation(convId);
    }
  };


  return (
    <>
      <div className={`fixed inset-0 z-30 bg-gray-900/80 md:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={() => setIsOpen(false)}></div>
      <aside className={`absolute md:relative z-40 flex flex-col bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 w-72 md:w-64 flex-shrink-0 h-full`}>
        <div className="p-2 space-y-2 border-b border-gray-200 dark:border-gray-700">
            <button
                onClick={onNewChat}
                className="w-full text-left p-3 rounded-lg bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-semibold transition-colors flex items-center gap-2"
            >
                <PlusIcon />
                New Chat
            </button>
             <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon />
                </div>
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
            </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2">
            <ul className="space-y-1">
            {filteredConversations.map((conv) => (
                <li key={conv.id} className="relative group">
                    {editingConvId === conv.id ? (
                        <div className="flex items-center gap-1 p-1">
                            <input
                                ref={inputRef}
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onBlur={handleSaveRename}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <button onClick={handleSaveRename} className="p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md" aria-label="Save title"><CheckIcon /></button>
                            <button onClick={handleCancelEditing} className="p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md" aria-label="Cancel editing"><XIcon /></button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => onSelectConversation(conv.id)}
                                className={`w-full text-left p-3 rounded-md text-sm truncate transition-colors ${
                                conv.id === activeConversationId
                                    ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 hover:text-gray-900 dark:hover:bg-gray-700/50 dark:hover:text-white'
                                }`}
                            >
                                {conv.title}
                            </button>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-gray-200/50 dark:bg-gray-700/50 rounded-md">
                                <button onClick={() => handleStartEditing(conv)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" aria-label="Rename conversation">
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(conv.id)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" aria-label="Delete conversation">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                </li>
            ))}
            </ul>
        </nav>

        {conversations.length > 0 && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => {
                        if (window.confirm('Are you sure you want to delete all conversations? This action cannot be undone.')) {
                            onClearAllConversations();
                        }
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-sm text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 font-semibold transition-colors"
                >
                    <TrashIcon className="w-4 h-4" />
                    Clear All Chats
                </button>
            </div>
        )}
      </aside>
    </>
  );
};

export default HistorySidebar;