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

// FAQ data for the chatbot
const FAQ_DATA = [
  {
    keywords: ['task', 'daily', 'complete', 'earn', 'reward'],
    response: `Daily Tasks System:
• Each product you purchase comes with a daily task
• Complete the task daily to earn rewards
• Tasks have a 24-hour cooldown
• Rewards continue until the product cycle completes
• Tasks expire when the product cycle ends`
  },
  {
    keywords: ['product', 'cycle', 'days', 'investment'],
    response: `Product Investment Cycles:
• Special Products: 50-day cycles with 19.5% daily ROI
• Premium Products: 7-day cycles with 19.9% daily ROI
• Basic Products: No cycles, immediate returns
• Each product has limited availability (e.g., 0/300 slots)
• When slots are full, products show "SOLD OUT"`
  },
  {
    keywords: ['roi', 'return', 'profit', 'income'],
    response: `Investment Returns:
• Special Products: 19.5% daily ROI, 50-day cycles
• Premium Products: 19.9% daily ROI, 7-day cycles
• Basic Products: Varying returns based on plan
• Total returns are calculated over the full cycle period
• Daily income is automatically calculated`
  },
  {
    keywords: ['withdraw', 'balance', 'earnings'],
    response: `Withdrawals & Earnings:
• Check your balance in the dashboard
• View earnings from completed tasks
• Withdraw funds when ready
• Track your investment performance
• Monitor pending and completed transactions`
  },
  {
    keywords: ['referral', 'bonus', 'team'],
    response: `Referral System:
• Invite friends to earn referral bonuses
• Build your team for additional income
• Track referrals in "My Team" section
• Earn bonuses from your team's investments
• View team performance and earnings`
  },
  {
    keywords: ['help', 'support', 'how', 'what'],
    response: `How can I help you?
• Ask about tasks and daily rewards
• Learn about product cycles and ROI
• Understand withdrawal processes
• Get help with referrals
• Learn about investment strategies`
  }
];

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

  // Find best matching response
  const findBestMatch = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    for (const faq of FAQ_DATA) {
      if (faq.keywords.some(keyword => input.includes(keyword))) {
        return faq.response;
      }
    }
    
    return `I understand you're asking about "${userInput}". Let me help you with that. You can ask me about:
• Daily tasks and rewards
• Product investment cycles
• ROI and returns
• Withdrawals and earnings
• Referral system
• General investment help`;
  };

  // Generate bot response
  const generateResponse = async (userInput: string) => {
    setIsTyping(true);
    
    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = findBestMatch(userInput);
    
    const botMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'bot',
      content: response,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, botMessage]);
    setIsTyping(false);
  };

  // Handle user message
  const handleUserMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const userInput = inputValue.trim();
    setInputValue('');
    
    // Generate bot response
    await generateResponse(userInput);
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserMessage();
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot size={16} className="text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about investments..."
                  className="flex-1"
                />
                <Button
                  onClick={handleUserMessage}
                  disabled={!inputValue.trim() || isTyping}
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
