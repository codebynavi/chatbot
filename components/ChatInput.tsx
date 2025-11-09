import React, { useState, useRef } from 'react';
import { SendIcon, LoadingSpinner, MicrophoneIcon, PaperclipIcon, XIcon } from '../constants';

interface ChatInputProps {
    onSendMessage: (prompt: string, images?: string[]) => void;
    isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [imageError, setImageError] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    
    const recognitionRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isSpeechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setImageError(null);
        const files = e.target.files;

        if (!files || files.length === 0) return;
        
        const maxFiles = 5;
        if (imagePreviews.length + files.length > maxFiles) {
            setImageError(`You can upload a maximum of ${maxFiles} images.`);
            return;
        }

        // FIX: Explicitly type `file` as `File` to resolve type errors.
        const filePromises = Array.from(files).map((file: File) => {
            return new Promise<string>((resolve, reject) => {
                const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
                if (!allowedTypes.includes(file.type)) {
                    return reject(new Error('Invalid file type. Please select JPG, PNG, WEBP, or GIF.'));
                }

                const maxSizeInMB = 5;
                if (file.size > maxSizeInMB * 1024 * 1024) {
                    return reject(new Error(`File "${file.name}" is too large. Maximum size is ${maxSizeInMB}MB.`));
                }
                
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    resolve(loadEvent.target?.result as string);
                };
                reader.onerror = () => {
                    reject(new Error(`Failed to read "${file.name}". It might be corrupted.`));
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(filePromises)
            .then(newPreviews => {
                setImagePreviews(prev => [...prev, ...newPreviews]);
            })
            .catch(err => {
                setImageError(err.message);
            });
        
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Allow re-selecting same file(s)
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
        if (imageError) setImageError(null);
    };

    const handleToggleRecording = () => {
        if (isLoading) return;

        if (isRecording && recognitionRef.current) {
            recognitionRef.current.stop();
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => {
            setIsRecording(false);
            recognitionRef.current = null;
        };
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsRecording(false);
            recognitionRef.current = null;
        };
        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result) => result.transcript)
                .join('');
            setInput(transcript);
        };
        
        recognition.start();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading || imageError || (!input.trim() && imagePreviews.length === 0)) {
            return;
        }
        onSendMessage(input.trim(), imagePreviews.length > 0 ? imagePreviews : undefined);
        setInput('');
        setImagePreviews([]);
        setImageError(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };
    
    const showPreviewContainer = imagePreviews.length > 0 || imageError;
    const isSubmitDisabled = isLoading || !!imageError || (!input.trim() && imagePreviews.length === 0);

    return (
        <div>
            {showPreviewContainer && (
                <div className="mb-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <div className="flex flex-wrap gap-2">
                        {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative">
                                <img src={preview} alt={`Preview ${index + 1}`} className="h-16 w-16 object-cover rounded-md" />
                                <button
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-gray-800/60 text-white rounded-full p-0.5 hover:bg-black/60 backdrop-blur-sm transition-colors"
                                    aria-label={`Remove image ${index + 1}`}
                                >
                                    <XIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                    {imageError && (
                         <div className="text-red-500 dark:text-red-400 text-sm p-2 mt-2">
                            <p className="font-bold">Cannot upload image</p>
                            <p>{imageError}</p>
                        </div>
                    )}
                </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    multiple
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="p-3 rounded-full transition-colors flex-shrink-0 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Attach image(s)"
                    title="Attach image(s)"
                >
                    <PaperclipIcon />
                </button>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={imagePreviews.length > 0 ? "Describe the image(s) or ask a question..." : "Ask me anything..."}
                    rows={1}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-full py-3 px-5 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                    disabled={isLoading}
                />
                {isSpeechSupported && (
                     <button
                        type="button"
                        onClick={handleToggleRecording}
                        disabled={isLoading}
                        className={`p-3 rounded-full transition-colors flex-shrink-0
                            ${isRecording 
                                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                                : 'bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white'
                            }
                            disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed`}
                        aria-label={isRecording ? "Stop recording" : "Start recording with microphone"}
                    >
                        <MicrophoneIcon />
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="bg-teal-500 hover:bg-teal-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-full p-3 transition-colors flex-shrink-0"
                    aria-label="Send message"
                >
                    {isLoading ? <LoadingSpinner /> : <SendIcon />}
                </button>
            </form>
        </div>
    );
};

export default ChatInput;