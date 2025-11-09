import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chat, Content, Part } from '@google/genai';
import { ChatMode, Message, Role, GroundingSource, Conversation, Feedback } from './types';
import { createChatSession, getThinkingResponse, getMapsResponse, generateSpeech, generateTitle } from './services/geminiService';
import { decode, decodeAudioData } from './utils/audioUtils';
import MessageItem from './components/MessageItem';
import ModeSelector from './components/ModeSelector';
import ContextProvider from './components/ContextProvider';
import ChatInput from './components/ChatInput';
import HistorySidebar from './components/HistorySidebar';
import ThinkingIndicator from './components/ThinkingIndicator';
import { ExportIcon, MoonIcon, SunIcon, SpeakerOnIcon, MenuIcon } from './constants';

const initialBotMessage: Message = { 
  id: crypto.randomUUID(), 
  role: Role.MODEL, 
  text: "Hello! I'm a multi-modal AI assistant. Choose a mode, ask me anything, or upload an image to start." 
};

type Theme = 'light' | 'dark';

const ttsVoices = [
  { name: 'Kore', label: 'Female (US)' },
  { name: 'Puck', label: 'Male (US)' },
  { name: 'Charon', label: 'Male (UK)' },
  { name: 'Zephyr', label: 'Female (UK)' },
  { name: 'Fenrir', label: 'Male (AU)' },
];

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
      }
    } catch (e) {
      console.warn("Could not access localStorage to get theme.", e);
    }
    return 'light';
  });
  const [ttsVoice, setTtsVoice] = useState<string>('Kore');
  const [ttsConfirmation, setTtsConfirmation] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = useMemo(() => 
    conversations.find(c => c.id === activeConversationId),
    [conversations, activeConversationId]
  );

  const currentVoiceLabel = useMemo(() => {
    return ttsVoices.find(v => v.name === ttsVoice)?.label ?? 'Kore';
  }, [ttsVoice]);

  useEffect(() => {
    const storedVoice = localStorage.getItem('ttsVoice');
    if (storedVoice && ttsVoices.some(v => v.name === storedVoice)) {
      setTtsVoice(storedVoice);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    try {
        localStorage.setItem('theme', theme);
    } catch (e) {
        console.warn("Could not access localStorage to set theme.", e);
    }
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
  }, [theme]);
  
  useEffect(() => {
    localStorage.setItem('ttsVoice', ttsVoice);
  }, [ttsVoice]);
  
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (ttsConfirmation) {
      const timer = setTimeout(() => {
        setTtsConfirmation(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [ttsConfirmation]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleTtsVoiceChange = (newVoice: string) => {
    setTtsVoice(newVoice);
    const voiceLabel = ttsVoices.find(v => v.name === newVoice)?.label;
    if (voiceLabel) {
      setTtsConfirmation(`TTS voice set to ${voiceLabel}`);
    }
  };

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('chatHistory');
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory) as Conversation[];
        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
          setConversations(parsedHistory);
          setActiveConversationId(parsedHistory[0].id);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
    handleNewChat();
  }, []);

  useEffect(() => {
    // Prevent saving an empty conversations array on first load
    if (conversations.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(conversations));
    } else {
      // If all conversations are cleared, remove the item from storage
      localStorage.removeItem('chatHistory');
    }
  }, [conversations]);

  useEffect(() => {
    if (activeConversation) {
        setContext(activeConversation.context || '');
        if (activeConversation.mode === ChatMode.CHAT) {
            const history: Content[] = activeConversation.messages
                .slice(1) // Exclude initial bot message
                .map(msg => {
                    const parts: Part[] = [];
                    if (msg.images) {
                      msg.images.forEach(image => {
                        const [meta, base64Data] = image.split(',');
                        const mimeType = meta.match(/:(.*?);/)?.[1];
                        if (base64Data && mimeType) {
                            parts.push({ inlineData: { data: base64Data, mimeType } });
                        }
                      });
                    }
                    if (msg.text) {
                        parts.push({ text: msg.text });
                    }
                    return { role: msg.role, parts };
                });
          setChatSession(createChatSession(history));
        } else {
          setChatSession(null);
        }
    }
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isLoading]);

  useEffect(() => {
    if (activeConversation?.mode === ChatMode.MAPS && !location) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(position.coords);
          setError(null);
        },
        () => {
          setError("Geolocation is required for Maps Mode. Please enable it in your browser settings.");
        }
      );
    }
  }, [activeConversation?.mode, location]);

  const handleNewChat = useCallback(() => {
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [initialBotMessage],
      mode: ChatMode.CHAT,
      context: '',
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  }, []);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations(prev => prev.map(c => 
      c.id === id ? { ...c, title: newTitle } : c
    ));
  };

  const handleDeleteConversation = (idToDelete: string) => {
    const index = conversations.findIndex(c => c.id === idToDelete);
    if (index === -1) return;

    const newConversations = conversations.filter(c => c.id !== idToDelete);

    if (activeConversationId === idToDelete) {
        if (newConversations.length > 0) {
            // Select the next conversation, or the previous one if it was the last
            const newActiveIndex = Math.max(0, index - 1);
            setActiveConversationId(newConversations[newActiveIndex].id);
        } else {
            // If all conversations are deleted, start a new one
            handleNewChat();
            return; // handleNewChat already sets conversations
        }
    }
    setConversations(newConversations);
  };
  
  const handleClearAllConversations = useCallback(() => {
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [initialBotMessage],
      mode: ChatMode.CHAT,
      context: '',
    };
    setConversations([newConversation]);
    setActiveConversationId(newConversation.id);
  }, []);

  const handleSetContext = (newContext: string) => {
    setContext(newContext);
    if (!activeConversationId) return;
    setConversations(prev => prev.map(c => 
        c.id === activeConversationId ? { ...c, context: newContext } : c
    ));
  }

  const handleSetMode = (mode: ChatMode) => {
    if (!activeConversationId) return;
    setConversations(prev => prev.map(c => 
      c.id === activeConversationId ? { ...c, mode } : c
    ));
  };

  const handleSendMessage = useCallback(async (prompt: string, images?: string[]) => {
    if ((!prompt && (!images || images.length === 0)) || isLoading || !activeConversationId || !activeConversation) return;

    setIsLoading(true);
    setError(null);
    const userMessage: Message = { id: crypto.randomUUID(), role: Role.USER, text: prompt, images };
    
    // Update state with user message and potentially a temporary title
    setConversations(prev => {
        const isNew = prev.find(c => c.id === activeConversationId)?.messages.length === 1;
        const titlePrompt = prompt || "Image Upload";
        return prev.map(c => {
            if (c.id === activeConversationId) {
                const updatedConvo = {
                    ...c,
                    messages: [...c.messages, userMessage],
                    title: isNew ? titlePrompt.substring(0, 40) + "..." : c.title,
                };
                return updatedConvo;
            }
            return c;
        });
    });
    
    // Generate real title in background if it's a new chat
    if (activeConversation?.messages.length === 1) {
        generateTitle(prompt || "Analyze these images").then(title => {
            setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, title } : c));
        });
    }

    try {
      let responseText: string = '';
      let responseSources: GroundingSource[] | undefined = undefined;

      const fullContext = context ? `CONTEXT:\n${context}\n\n---\n\nPROMPT:\n${prompt}` : prompt;

      switch (activeConversation.mode) {
        case ChatMode.THINKING:
          responseText = await getThinkingResponse(prompt, context, images);
          break;
        case ChatMode.MAPS:
          if (!location) {
              throw new Error("Location not available. Please allow location access.");
          }
          const mapsResponse = await getMapsResponse(prompt, context, location, images);
          responseText = mapsResponse.text;
          responseSources = mapsResponse.sources;
          break;
        case ChatMode.CHAT:
        default:
          if (!chatSession) throw new Error("Chat session not initialized.");
          
          const userParts: Part[] = [];
          if (images) {
            images.forEach(image => {
              const [meta, base64Data] = image.split(',');
              const mimeType = meta.match(/:(.*?);/)?.[1];
              if (base64Data && mimeType) {
                  userParts.push({ inlineData: { data: base64Data, mimeType } });
              }
            });
          }
          if (fullContext) {
            userParts.push({ text: fullContext });
          }

          const response = await chatSession.sendMessage({ message: { parts: userParts } });
          responseText = response.text;
          break;
      }

      const modelMessage: Message = { 
        id: crypto.randomUUID(), 
        role: Role.MODEL, 
        text: responseText,
        sources: responseSources
      };
      setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: [...c.messages, modelMessage] } : c));

    } catch (err: any) {
      const errorMessage = `Error: ${err.message || 'An unexpected error occurred.'}`;
      setError(errorMessage);
      const errorBotMessage: Message = { 
        id: crypto.randomUUID(), 
        role: Role.MODEL, 
        text: errorMessage
      };
      setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: [...c.messages, errorBotMessage] } : c));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, context, location, chatSession, activeConversationId, conversations]);

  const handlePlayAudio = useCallback(async (text: string, messageId: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const audioContext = audioContextRef.current;

    setConversations(prev => prev.map(c => c.id === activeConversationId 
      ? { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, isPlaying: true } : m) } 
      : c
    ));

    try {
      const base64Audio = await generateSpeech(text, ttsVoice);
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      source.onended = () => {
        setConversations(prev => prev.map(c => c.id === activeConversationId
          ? { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, isPlaying: false } : m) }
          : c
        ));
      };
    } catch (err: any) {
      setError(`TTS Error: ${err.message}`);
       setConversations(prev => prev.map(c => c.id === activeConversationId
        ? { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, isPlaying: false } : m) }
        : c
      ));
    }
  }, [activeConversationId, ttsVoice]);
  
  const handleExportConversation = useCallback(() => {
    if (!activeConversation) {
        setError("No active conversation to export.");
        return;
    }

    const { title, mode, messages } = activeConversation;
    const currentContext = context;

    let content = `# Conversation: ${title}\n`;
    content += `Mode: ${mode}\n\n`;
    content += `--- CONTEXT ---\n${currentContext || 'No context provided.'}\n--- END CONTEXT ---\n\n`;
    content += `--- MESSAGES ---\n\n`;

    messages.slice(1).forEach(msg => { // slice(1) to skip initial bot message
        content += `[${msg.role.toUpperCase()}]\n`;
        if (msg.images && msg.images.length > 0) {
            content += `(${msg.images.length} image(s) attached)\n`;
        }
        content += `${msg.text}\n\n`;
        if (msg.sources && msg.sources.length > 0) {
            content += "Sources:\n";
            msg.sources.forEach(source => {
                content += `- ${source.title}: ${source.uri}\n`;
            });
            content += "\n";
        }
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'conversation'}.txt`;

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

}, [activeConversation, context]);

const handleFeedback = (messageId: string, feedback: 'up' | 'down') => {
    if (!activeConversationId) return;
    setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
            return {
                ...c,
                messages: c.messages.map(m => {
                    if (m.id === messageId) {
                        const newFeedback = m.feedback === feedback ? null : feedback;
                        return { ...m, feedback: newFeedback };
                    }
                    return m;
                })
            };
        }
        return c;
    }));
};

const handleEditMessage = (messageId: string, newText: string) => {
    if (!activeConversationId || isLoading) return;

    const conversationIndex = conversations.findIndex(c => c.id === activeConversationId);
    if (conversationIndex === -1) return;

    const conversation = conversations[conversationIndex];
    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    
    // Can't edit bot message, or the initial placeholder message
    if (messageIndex <= 0 || conversation.messages[messageIndex].role !== Role.USER) return;
    
    const originalMessage = conversation.messages[messageIndex];
    const originalImages = originalMessage.images;

    // Truncate history to the point of the edited message
    const truncatedMessages = conversation.messages.slice(0, messageIndex);
    
    const updatedConversations = [...conversations];
    updatedConversations[conversationIndex] = {
      ...conversation,
      messages: truncatedMessages,
    };

    setConversations(updatedConversations);

    // Use a microtask to ensure the state update is processed before sending the new message
    // This re-uses the existing sending logic
    setTimeout(() => handleSendMessage(newText, originalImages), 0);
};


  return (
    <div className="flex h-screen bg-white text-gray-800 dark:bg-gray-900 dark:text-white font-sans">
      <HistorySidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onClearAllConversations={handleClearAllConversations}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
      />
      <div className="flex-1 flex flex-col transition-all duration-300">
          <header className="bg-gray-100/80 dark:bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-200 dark:border-gray-700 shadow-lg flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden">
                   <MenuIcon />
              </button>
              <h1 className="text-xl md:text-2xl font-bold text-teal-600 dark:text-teal-400 truncate text-center flex-1 ml-2">
                  {activeConversation?.title || 'Gemini Multi-Modal Chat'}
              </h1>
              <div className="relative">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                      <label htmlFor="tts-voice" className="sr-only">TTS Voice</label>
                      <SpeakerOnIcon />
                      <select
                          id="tts-voice"
                          value={ttsVoice}
                          onChange={(e) => handleTtsVoiceChange(e.target.value)}
                          className="bg-gray-200/50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 rounded-md py-1.5 pl-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                          title={`Current TTS Voice: ${currentVoiceLabel}`}
                      >
                          {ttsVoices.map(voice => (
                              <option key={voice.name} value={voice.name}>{voice.label}</option>
                          ))}
                      </select>
                  </div>
                   {ttsConfirmation && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="absolute top-full mt-2 right-0 w-max bg-gray-900 text-white text-xs rounded py-1 px-2 z-50 opacity-90 shadow-lg"
                    >
                      {ttsConfirmation}
                    </div>
                  )}
              </div>
              <button
                  onClick={toggleTheme}
                  className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  aria-label="Toggle theme"
                  title="Toggle theme"
              >
                  {theme === 'light' ? <MoonIcon /> : <SunIcon />}
              </button>
              <button 
                onClick={handleExportConversation}
                disabled={!activeConversation || activeConversation.messages.length <= 1}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Export conversation"
                title="Export conversation as .txt"
              >
                  <ExportIcon />
              </button>
          </header>
        
          <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {activeConversation ? (
                <>
                    <div className="max-w-4xl mx-auto space-y-4">
                        <ContextProvider context={context} setContext={handleSetContext} />
                        <ModeSelector mode={activeConversation.mode} setMode={handleSetMode} />
                    </div>
                    
                    <div className="max-w-4xl mx-auto">
                        {activeConversation.messages.map((msg) => (
                            <MessageItem 
                              key={msg.id} 
                              message={msg} 
                              onPlayAudio={handlePlayAudio} 
                              onFeedback={handleFeedback}
                              onEditMessage={handleEditMessage}
                              isLoading={isLoading} />
                        ))}
                        {isLoading && <ThinkingIndicator />}
                        <div ref={messagesEndRef} />
                    </div>
                </>
            ) : (
                <div className="flex justify-center items-center h-full text-gray-500">
                    <p>Select a conversation or start a new one.</p>
                </div>
            )}
          </main>

          <footer className="bg-gray-100/80 dark:bg-gray-800/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-4 sticky bottom-0">
            <div className="max-w-4xl mx-auto">
              {error && <p className="text-red-400 text-sm text-center mb-2">{error}</p>}
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            </div>
          </footer>
      </div>
    </div>
  );
}

export default App;