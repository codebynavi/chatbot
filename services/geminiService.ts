import { GoogleGenAI, Chat, GenerateContentResponse, Modality, Content } from "@google/genai";
import { GroundingSource } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function generateTitle(prompt: string): Promise<string> {
    const titlePrompt = `Generate a very short, concise title (4 words max) for the following user prompt. Just return the title, nothing else:\n\n"${prompt}"`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: titlePrompt,
        });
        // Clean up potential markdown or quotes
        return response.text.replace(/["*#]/g, '').trim();
    } catch (error) {
        console.error("Error generating title:", error);
        return "Untitled Chat"; // Fallback title
    }
}

export function createChatSession(history: Content[] = []): Chat {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    history,
  });
}

export async function getThinkingResponse(prompt: string, context: string, images?: string[]): Promise<string> {
    const fullPrompt = context ? `${context}\n\nQuestion: ${prompt}` : prompt;

    const userParts: any[] = [{ text: fullPrompt }];
    if (images) {
      images.forEach(image => {
        const [meta, base64Data] = image.split(',');
        const mimeType = meta.match(/:(.*?);/)?.[1];
        if (base64Data && mimeType) {
            userParts.push({ inlineData: { data: base64Data, mimeType } });
        }
      });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: userParts },
        config: {
            thinkingConfig: { thinkingBudget: 32768 }
        }
    });
    return response.text;
}

export async function getMapsResponse(prompt: string, context: string, location: GeolocationCoordinates | null, images?: string[]): Promise<{ text: string, sources?: GroundingSource[] }> {
    const fullPrompt = context ? `${context}\n\nQuestion: ${prompt}` : prompt;
    
    const userParts: any[] = [{ text: fullPrompt }];
    if (images) {
      images.forEach(image => {
        const [meta, base64Data] = image.split(',');
        const mimeType = meta.match(/:(.*?);/)?.[1];
        if (base64Data && mimeType) {
            userParts.push({ inlineData: { data: base64Data, mimeType } });
        }
      });
    }

    const config: any = {
        tools: [{ googleMaps: {} }],
    };

    if (location) {
        config.toolConfig = {
            retrievalConfig: {
                latLng: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                }
            }
        };
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: userParts },
        config: config
    });
    
    const text = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    const sources: GroundingSource[] = groundingChunks
        ?.filter((chunk: any) => chunk.maps?.uri)
        .map((chunk: any) => ({
            uri: chunk.maps.uri,
            title: chunk.maps.title || 'View on Google Maps'
        })) ?? [];

    return { text, sources };
}

export async function generateSpeech(text: string, voiceName: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data returned from API");
    }
    return base64Audio;
}