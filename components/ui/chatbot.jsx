"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Volume2, Mic } from 'lucide-react';
import LoadingAnimation from './LoadingAnimation';

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const endRef = useRef(null);
  const inputBaseRef = useRef('');

  const handleSendMessage = async () => {
    if (input.trim() === '') return;
    const timestamp = new Date().toISOString();
    const newMessages = [...messages, { role: 'user', content: input, time: timestamp }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: messages.map(msg => ({
            role: msg.role,
            parts: msg.content,
          })),
          message: input,
        }),
      });
      
      const data = await res.json();
      
      const assistantMsg = { role: 'assistant', content: data.text || 'Sorry, no response.', time: new Date().toISOString() };
      setMessages([...newMessages, assistantMsg]);
      if (autoPlay) {
        handleSpeak(assistantMsg.content);
      }
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, an error occurred. Please try again later.', time: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Sorry, your browser does not support text-to-speech.');
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      // capture the current input so interim results don't repeatedly append
      inputBaseRef.current = input || '';
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      // Use the captured base input so interim updates replace the transient text
      const base = inputBaseRef.current || '';
      const newText = (base + ' ' + (final || interim)).trim();
      setInput(newText);
    };

    recognition.onerror = (e) => {
      console.warn('Speech recognition error', e);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const toggleListening = () => {
    if (listening) stopListening(); else startListening();
  };

  const formatResponse = (content) => {
    if (!content) return null;

    // Handle code blocks first
    if (content.includes('```')) {
      const parts = content.split(/```(.*?)```/s).filter(Boolean);
      return (
        <div className="space-y-2 text-sm">
          {parts.map((part, i) => (
            part.includes('\n') ? (
              <pre key={i} className="bg-[#0f172a] text-[#e6f0ff] p-3 rounded-md overflow-auto text-xs">{part.trim()}</pre>
            ) : (
              <p key={i} className="whitespace-pre-line">{part.trim()}</p>
            )
          ))}
        </div>
      );
    }

    // Handle bold text and lists
    const htmlContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\* (.*$)/gm, '<li>$1</li>');

    return (
      <div className="text-sm leading-relaxed whitespace-pre-line text-black" dangerouslySetInnerHTML={{ __html: htmlContent.includes('<li>') ? `<ul>${htmlContent}</ul>` : htmlContent }} />
    );
  };

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#FFF0E6] to-[#FFD8C2] rounded-lg shadow-lg border border-white/6">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#FFB997] to-[#FF8C66] flex items-center justify-center text-white font-semibold">AI</div>
          <div>
            <div className="text-sm font-semibold text-black">Assistant</div>
            <div className="text-xs text-black/70">Ask about emissions, reports, or analysis</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" id="auto-play" checked={autoPlay} onChange={() => setAutoPlay(!autoPlay)} />
          <label htmlFor="auto-play" className="text-xs text-black/70">Auto-play audio</label>
        </div>
      </div>

      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="mr-3 flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-[#FFB997]/20 flex items-center justify-center text-black">🤖</div>
                </div>
              )}

              <div className={`max-w-[72%] px-4 py-2 rounded-2xl shadow-sm ${message.role === 'user' ? 'bg-gradient-to-br from-[#FFD8C2] to-[#FFB997] text-black rounded-br-none' : 'bg-white/5 text-black rounded-bl-none'}`}>
                <div className="text-sm">{message.role === 'assistant' ? formatResponse(message.content) : <div className="whitespace-pre-line">{message.content}</div>}</div>
                {message.time && (
                  <div className="text-[10px] text-black/60 mt-1 text-right">{new Date(message.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                )}
                {message.role === 'assistant' && (
                  <Button variant="ghost" size="sm" onClick={() => handleSpeak(message.content)} className="mt-2">
                    <Volume2 className="h-4 w-4 text-black" />
                  </Button>
                )}
              </div>

              {message.role === 'user' && (
                <div className="ml-3 flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#FFD8C2] to-[#FFB997] flex items-center justify-center text-black">U</div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start">
              <div className="mr-3">
                <div className="h-8 w-8 rounded-full bg-white/6 flex items-center justify-center text-black">🤖</div>
              </div>
              <div className="max-w-[72%] px-4 py-2 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 text-white shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                  <div className="text-sm text-black/70">Thinking...</div>
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-black/20">
        <div className="flex flex-col gap-2">
          <div aria-live="polite" className="text-xs text-black/80">Preview: <span className="font-medium">{input || '—'}</span></div>

          <div className="flex items-center gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
              placeholder="Ask me about emissions, e.g. 'Show me monthly trends'"
              disabled={loading}
              className="bg-white/80 placeholder:text-black/40 text-black rounded-full px-4 py-3"
              aria-label="Message input"
            />

            <button onClick={toggleListening} aria-pressed={listening} title="Voice input" className={`h-10 w-10 rounded-full flex items-center justify-center ${listening ? 'bg-[#FF8C66] text-white' : 'bg-white/90 text-black'}`}>
              <Mic className="h-5 w-5" />
              {listening && <span className="ml-2 h-2 w-2 bg-red-500 rounded-full animate-pulse" />}
            </button>

            <Button onClick={handleSendMessage} disabled={loading} className="rounded-full px-4 py-2 bg-gradient-to-r from-[#FFB997] to-[#FF8C66] text-black">
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              ) : (
                <Send className="h-4 w-4 text-black" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
