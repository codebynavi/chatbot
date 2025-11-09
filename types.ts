export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export type Feedback = 'up' | 'down' | null;

export interface Message {
  id: string;
  role: Role;
  text: string;
  sources?: GroundingSource[];
  isPlaying?: boolean;
  images?: string[]; // Base64 encoded images
  feedback?: Feedback;
}

export enum ChatMode {
  CHAT = 'CHAT',
  THINKING = 'THINKING',
  MAPS = 'MAPS',
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  mode: ChatMode;
  context?: string;
}