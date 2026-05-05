import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';

/**
 * VoiceChat Component for FinBuddy AI.
 * Uses Web Speech API for voice-to-text and real-time interaction.
 */
export function VoiceChat() {
    const { messages, addMessage } = useChat();
    const [isListening, setIsListening] = useState(false);
    const [inputText, setInputText] = useState('');
    const recognitionRef = useRef<any>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'hi-IN';

            recognitionRef.current.onresult = (event: any) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }
                setInputText(currentTranscript);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            if (inputText.trim()) {
                handleSendMessage(inputText);
            }
        } else {
            setInputText('');
            recognitionRef.current?.start();
        }
        setIsListening(!isListening);
    };

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        addMessage(text, 'user');
        setInputText('');

        try {
            const userId = localStorage.getItem('finbuddy_user_id') || 'guest';

            const response = await fetch('http://localhost:5000/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, rawInput: text }),
            });

            const data = await response.json();

            if (response.ok) {
                addMessage(data.message, 'bot');
                if (data.warning) {
                    addMessage(`⚠️ ${data.warning}`, 'bot');
                }
            } else {
                addMessage(data.message || data.error || 'Sorry, I encountered an error.', 'bot');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            addMessage('Network error. Fallback: I heard "' + text + '" but server is unreachable.', 'bot');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSendMessage(inputText);
        }
    };

    return (
        <div className="glass-card p-0 overflow-hidden" style={{ border: '1px solid #D4E0F5', background: '#FFFFFF' }}>
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between" style={{ borderColor: '#D4E0F5' }}>
                <h4 className="mb-0 fw-bold" style={{color:'#2D3561'}}>
                    <i className="fas fa-robot me-2" style={{color:'#E8735A'}}></i> FinBuddy AI
                </h4>
                <div className="badge rounded-pill" style={{background:'#FAE5E0', color:'#E8735A', border:'1px solid rgba(232,115,90,0.3)'}}>Live Assistant</div>
            </div>

            <div className="chat-window p-4" style={{ height: '400px', overflowY: 'auto', background: '#F5F8FD' }}>
                {messages.length === 0 && (
                    <div className="text-center mt-5" style={{color:'#7A8BAD'}}>
                        <i className="fas fa-comments fa-3x mb-3" style={{color:'#D4E0F5'}}></i>
                        <p>Namaste! I'm your FinBuddy. Just tell me what you earned or spent today.</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`d-flex ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'} mb-3`}>
                        <div className={`p-3 ${msg.sender === 'user' ? 'shadow-glow' : 'bg-glass'}`}
                            style={{
                                maxWidth: '80%',
                                borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                background: msg.sender === 'user' ? 'linear-gradient(135deg, #E8735A, #D45F47)' : '#FFFFFF',
                                color: msg.sender === 'user' ? 'white' : '#2D3561',
                                border: msg.sender === 'bot' ? '1px solid #D4E0F5' : 'none',
                                boxShadow: msg.sender === 'user' ? '0 4px 14px rgba(232,115,90,0.35)' : '0 2px 8px rgba(45,53,97,0.07)'
                            }}>
                            <div style={{ fontSize: '1rem', lineHeight: '1.4' }}>{msg.text}</div>
                            <small className="d-block text-end opacity-50 mt-2" style={{ fontSize: '0.65rem' }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </small>
                        </div>
                    </div>
                ))}
                {isListening && (
                    <div className="d-flex justify-content-start mb-3 animate-pulse">
                        <div className="p-2 px-3 rounded-pill" style={{background:'#FAE5E0', border:'1px solid rgba(232,115,90,0.3)', color:'#E8735A'}}>
                            <i className="fas fa-microphone me-2" style={{color:'#E8735A'}}></i> Listening... {inputText}
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-top" style={{ borderColor: '#D4E0F5', background: '#FFFFFF' }}>
                <div className="input-group">
                    <button
                        className={`btn ${isListening ? 'btn-danger' : 'btn-glow-success'}`}
                        onClick={toggleListening}
                        title={isListening ? 'Stop' : 'Start Voice'}
                        style={{ borderTopLeftRadius: '15px', borderBottomLeftRadius: '15px' }}
                    >
                        <i className={`fas ${isListening ? 'fa-stop-circle' : 'fa-microphone'}`}></i>
                    </button>
                    <input
                        type="text"
                        className="form-control border-0 p-3"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message (e.g. Rs. 500 earned from tea sales)"
                        style={{ background: '#F5F8FD', color: '#2D3561', borderTop: '1.5px solid #D4E0F5', borderBottom: '1.5px solid #D4E0F5' }}
                    />
                    <button
                        className="btn btn-glow-primary px-4"
                        onClick={() => handleSendMessage(inputText)}
                        disabled={!inputText.trim()}
                        style={{ borderTopRightRadius: '15px', borderBottomRightRadius: '15px' }}
                    >
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div className="mt-2 text-center" style={{fontSize:'0.72rem', color:'#7A8BAD'}}>
                    Enter to send • Supports Hindi, English & Hinglish
                </div>
            </div>
        </div>
    );
}


