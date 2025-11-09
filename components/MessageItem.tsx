import React, { useState, useRef, useEffect } from 'react';
import { Message, Role, Feedback } from '../types';
import { UserIcon, BotIcon, SpeakerOnIcon, SpeakerOffIcon, LoadingSpinner, ThumbsUpIcon, ThumbsDownIcon, CopyIcon, CheckIcon, PencilIcon } from '../constants';
import Markdown from 'react-markdown';

interface MessageItemProps {
  message: Message;
  onPlayAudio: (text: string, messageId: string) => void;
  onFeedback: (messageId: string, feedback: 'up' | 'down') => void;
  onEditMessage: (messageId: string, newText: string) => void;
  isLoading: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onPlayAudio, onFeedback, onEditMessage, isLoading }) => {
  const isUser = message.role === Role.USER;
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.style.height = 'inherit';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight}px`;
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }, [isEditing]);


  const handleCopy = () => {
    if (!message.text) return;
    navigator.clipboard.writeText(message.text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleStartEditing = () => {
    if (isLoading) return;
    setEditedText(message.text);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditedText(message.text);
  };

  const handleSaveAndSubmit = () => {
    if (isLoading || editedText.trim() === message.text.trim() || (!editedText.trim() && !message.images?.length)) return;
    onEditMessage(message.id, editedText.trim());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveAndSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEditing();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedText(e.target.value);
    e.target.style.height = 'inherit';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className={`flex items-start gap-4 my-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && <div className="flex-shrink-0">{<BotIcon />}</div>}
      
      <div className={`group relative max-w-xl md:max-w-2xl rounded-2xl p-4 ${isUser ? 'bg-indigo-500 text-white dark:bg-indigo-600 rounded-br-none' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-bl-none'}`}>
        {message.images && message.images.length > 0 && (
          <div className="mb-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {message.images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`User upload ${index + 1}`}
                className="rounded-lg w-full h-auto object-cover"
              />
            ))}
          </div>
        )}

        {isUser && isEditing ? (
           <div className="flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={editedText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              className="w-full bg-indigo-400/50 dark:bg-indigo-700/50 text-white rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[60px] max-h-48 overflow-y-auto"
              rows={1}
            />
            <div className="flex justify-end gap-2">
              <button onClick={handleCancelEditing} className="px-3 py-1 text-sm rounded-md hover:bg-white/10 transition-colors">Cancel</button>
              <button onClick={handleSaveAndSubmit} className="px-3 py-1 text-sm rounded-md bg-white/20 hover:bg-white/30 transition-colors font-semibold disabled:opacity-50" disabled={isLoading || editedText.trim() === message.text.trim() || (!editedText.trim() && !message.images?.length)}>Save & Submit</button>
            </div>
          </div>
        ) : (
          <>
            <div className="prose prose-sm md:prose-base max-w-none prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-headings:text-gray-900 dark:prose-headings:text-white prose-strong:text-gray-900 dark:prose-strong:text-white prose-a:text-teal-600 dark:prose-a:text-teal-400 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-code:text-pink-600 dark:prose-code:text-pink-400">
              <Markdown>{message.text}</Markdown>
            </div>
            
            {message.sources && message.sources.length > 0 && (
                <div className="mt-4 border-t border-gray-300 dark:border-gray-600 pt-3">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Sources:</h4>
                    <ul className="space-y-1">
                        {message.sources.map((source, index) => (
                            <li key={index}>
                                <a 
                                    href={source.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-teal-600 hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300 text-sm underline truncate"
                                >
                                    {source.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isUser && (
              <div className="mt-2 flex items-center justify-end gap-1">
                <button
                  onClick={handleStartEditing}
                  disabled={isLoading}
                  className="p-1.5 rounded-full text-indigo-200 hover:bg-indigo-400/50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-0"
                  aria-label="Edit message"
                  title="Edit message"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!message.text}
                  className="p-1.5 rounded-full text-indigo-200 hover:bg-indigo-400/50 transition-colors disabled:opacity-50"
                  aria-label="Copy message text"
                  title={isCopied ? "Copied!" : "Copy text"}
                >
                  {isCopied ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            )}

            {!isUser && message.text && (
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  onClick={handleCopy}
                  className={`p-1.5 rounded-full transition-colors ${
                    isCopied 
                      ? 'text-teal-500' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  aria-label="Copy message text"
                  title={isCopied ? "Copied!" : "Copy text"}
                >
                  {isCopied ? <CheckIcon /> : <CopyIcon />}
                </button>
                <button
                  onClick={() => onFeedback(message.id, 'up')}
                  className={`p-1.5 rounded-full transition-colors ${
                    message.feedback === 'up'
                      ? 'bg-teal-500 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  aria-label="Good response"
                >
                  <ThumbsUpIcon />
                </button>
                 <button
                  onClick={() => onFeedback(message.id, 'down')}
                  className={`p-1.5 rounded-full transition-colors ${
                    message.feedback === 'down'
                      ? 'bg-red-500 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  aria-label="Bad response"
                >
                  <ThumbsDownIcon />
                </button>

                <button
                  onClick={() => onPlayAudio(message.text, message.id)}
                  disabled={message.isPlaying}
                  className="p-1 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                  aria-label="Play message audio"
                >
                  {message.isPlaying ? <LoadingSpinner /> : message.isPlaying === false ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {isUser && <div className="flex-shrink-0">{<UserIcon />}</div>}
    </div>
  );
};

export default MessageItem;