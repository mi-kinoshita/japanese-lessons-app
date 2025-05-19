export type Message = {
    text: string;
    sender: 'user' | 'ai';
    timestamp: string;
    isError?: boolean;
  };