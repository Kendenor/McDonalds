'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, CheckCircle, Terminal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ConsoleCommandsPage() {
  const { toast } = useToast();
  const [copiedCommand, setCopiedCommand] = useState<string>('');

  const commands = [
    {
      title: "Clear Test Bank Account",
      description: "Remove the test bank account from localStorage",
      command: `localStorage.removeItem('globalSettings'); console.log('Test account cleared!');`,
      action: () => {
        localStorage.removeItem('globalSettings');
        toast({ title: "Test Account Cleared", description: "Test bank account has been removed from localStorage." });
      }
    },
    {
      title: "Show Current Bank Accounts",
      description: "Display all bank accounts currently in localStorage",
      command: `console.log('Bank accounts:', JSON.parse(localStorage.getItem('globalSettings') || '{}').bankAccounts || []);`,
      action: () => {
        const settings = JSON.parse(localStorage.getItem('globalSettings') || '{}');
        const accounts = settings.bankAccounts || [];
        console.log('Bank accounts:', accounts);
        toast({ title: "Bank Accounts Logged", description: `Found ${accounts.length} bank accounts. Check console (F12).` });
      }
    },
    {
      title: "Clear All localStorage",
      description: "Remove all data from localStorage (nuclear option)",
      command: `localStorage.clear(); console.log('All localStorage cleared!');`,
      action: () => {
        localStorage.clear();
        toast({ title: "All Data Cleared", description: "All localStorage data has been completely cleared." });
      }
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(text);
    toast({ title: "Copied!", description: "Command copied to clipboard." });
    setTimeout(() => setCopiedCommand(''), 2000);
  };

  const runCommand = (command: any) => {
    command.action();
  };

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-4xl bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Terminal size={48} className="text-primary mx-auto" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Console Commands</CardTitle>
          <CardDescription>Copy and paste these commands in your browser console (F12) to fix the bank account issue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {commands.map((cmd, index) => (
            <div key={index} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{cmd.title}</h3>
                  <p className="text-sm text-muted-foreground">{cmd.description}</p>
                </div>
                <Button onClick={() => runCommand(cmd)} variant="outline" size="sm">
                  Run Now
                </Button>
              </div>
              
              <div className="relative">
                <pre className="p-4 bg-muted/50 rounded-lg text-sm overflow-x-auto">
                  {cmd.command}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(cmd.command)}
                >
                  {copiedCommand === cmd.command ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}

          {/* Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">How to Use:</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Step 1:</strong> Open browser console (Press F12, then click "Console" tab)</p>
              <p><strong>Step 2:</strong> Copy and paste the command above</p>
              <p><strong>Step 3:</strong> Press Enter to run the command</p>
              <p><strong>Step 4:</strong> Go to Admin Settings and add your real bank accounts</p>
              <p><strong>Step 5:</strong> Test the recharge page</p>
            </div>
          </div>

          {/* Quick Fix Button */}
          <div className="pt-4 border-t">
            <Button 
              onClick={() => {
                localStorage.removeItem('globalSettings');
                toast({ 
                  title: "Quick Fix Applied", 
                  description: "Test account cleared! Now add your real bank accounts in Admin Settings." 
                });
              }} 
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Quick Fix: Clear Test Account
            </Button>
          </div>

          {/* Navigation */}
          <div className="pt-4 space-y-2">
            <Button onClick={() => window.open('/admin/dashboard/settings', '_blank')} className="w-full">
              Go to Admin Settings
            </Button>
            <Button onClick={() => window.open('/dashboard/recharge', '_blank')} variant="outline" className="w-full">
              Test Recharge Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 