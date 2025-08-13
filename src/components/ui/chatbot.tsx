'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Input } from './input';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  className?: string;
}

export function Chatbot({ className }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m your McDonald Investment assistant. I can help you understand how our platform works, including the task system, product cycles, and investment process. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Chatbot Toggle Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          className
        )}
      >
        <MessageCircle size={24} />
      </Button>

      {/* Chatbot Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-end p-4">
          <Card className="w-full max-w-md h-[600px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-primary" />
                <h3 className="font-semibold">Investment Assistant</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X size={16} />
              </Button>
            </div>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.type === 'bot' && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot size={16} className="text-primary" />
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3 text-sm",
                      message.type === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div className="whitespace-pre-line">{message.content}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  {message.type === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={16} className="text-primary" />
                    </div>
                  )}
                </div>
              ))}
              
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything about investments..."
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    if (inputValue.trim()) {
                      const userMessage: ChatMessage = {
                        id: Date.now().toString(),
                        type: 'user',
                        content: inputValue.trim(),
                        timestamp: new Date()
                      };
                      setMessages(prev => [...prev, userMessage]);
                      setInputValue('');
                    }
                  }}
                  disabled={!inputValue.trim()}
                  size="sm"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
