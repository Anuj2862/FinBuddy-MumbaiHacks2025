import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    status?: 'sending' | 'sent' | 'error';
    metadata?: any;
}

interface ChatContextType {
    messages: Message[];
    addMessage: (text: string, sender: 'user' | 'bot', metadata?: any) => void;
    clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const [messages, setMessages] = useState<Message[]>([]);

    const addMessage = (text: string, sender: 'user' | 'bot', metadata?: any) => {
        const newMessage: Message = {
            id: Math.random().toString(36).substring(2, 11),
            text,
            sender,
            timestamp: new Date(),
            metadata
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const clearChat = () => setMessages([]);

    return (
        <ChatContext.Provider value={{ messages, addMessage, clearChat }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
