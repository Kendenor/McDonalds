'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DebugBankPage() {
  const { toast } = useToast();
  const [localStorageData, setLocalStorageData] = useState<any>({});
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  const loadLocalStorageData = () => {
    try {
      const settings = JSON.parse(localStorage.getItem('globalSettings') || '{}');
      setLocalStorageData(settings);
      setBankAccounts(settings.bankAccounts || []);
      
      console.log('All localStorage data:', localStorage);
      console.log('Settings from localStorage:', settings);
      console.log('Bank accounts found:', settings.bankAccounts);
      
      toast({
        title: "Data Loaded",
        description: `Found ${settings.bankAccounts?.length || 0} bank accounts in localStorage.`
      });
    } catch (error) {
      console.error('Error loading localStorage data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load localStorage data."
      });
    }
  };

  const addTestBankAccount = () => {
    const newAccount = {
      id: `test-${Date.now()}`,
      bankName: 'Test Bank',
      accountNumber: '1234567890',
      accountName: 'Test Account'
    };
    
    const updatedAccounts = [...bankAccounts, newAccount];
    const settings = { ...localStorageData, bankAccounts: updatedAccounts };
    
    localStorage.setItem('globalSettings', JSON.stringify(settings));
    setBankAccounts(updatedAccounts);
    setLocalStorageData(settings);
    
    toast({
      title: "Test Account Added",
      description: "Test bank account has been added to localStorage."
    });
  };

  const clearAllBankAccounts = () => {
    const settings = { ...localStorageData, bankAccounts: [] };
    localStorage.setItem('globalSettings', JSON.stringify(settings));
    setBankAccounts([]);
    setLocalStorageData(settings);
    
    toast({
      title: "Bank Accounts Cleared",
      description: "All bank accounts have been removed from localStorage."
    });
  };

  const removeBankAccount = (id: string) => {
    const updatedAccounts = bankAccounts.filter(acc => acc.id !== id);
    const settings = { ...localStorageData, bankAccounts: updatedAccounts };
    
    localStorage.setItem('globalSettings', JSON.stringify(settings));
    setBankAccounts(updatedAccounts);
    setLocalStorageData(settings);
    
    toast({
      title: "Account Removed",
      description: "Bank account has been removed."
    });
  };

  useEffect(() => {
    loadLocalStorageData();
  }, []);

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-4xl bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Database size={48} className="text-primary mx-auto" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Bank Account Debug</CardTitle>
          <CardDescription>Debug and troubleshoot bank account storage issues.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={loadLocalStorageData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Data
            </Button>
            <Button onClick={addTestBankAccount} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Test Account
            </Button>
            <Button onClick={clearAllBankAccounts} variant="outline">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Accounts
            </Button>
          </div>

          {/* Bank Accounts Display */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Bank Accounts in localStorage</h3>
            {bankAccounts.length === 0 ? (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-muted-foreground">No bank accounts found in localStorage.</p>
                <p className="text-sm text-muted-foreground mt-2">Click "Add Test Account" to create a test account.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bankAccounts.map((account) => (
                  <div key={account.id} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{account.bankName}</p>
                        <p className="text-sm text-muted-foreground">Account: {account.accountNumber}</p>
                        <p className="text-sm text-muted-foreground">Name: {account.accountName}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeBankAccount(account.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raw localStorage Data */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Raw localStorage Data</h3>
            <div className="p-4 bg-muted/50 rounded-lg">
              <pre className="text-sm overflow-auto max-h-64">
                {JSON.stringify(localStorageData, null, 2)}
              </pre>
            </div>
          </div>

          {/* Test Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Links</h3>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => window.open('/dashboard/recharge', '_blank')}>
                Test Recharge Page
              </Button>
              <Button variant="outline" onClick={() => window.open('/dashboard/recharge/confirm?amount=5000', '_blank')}>
                Test Confirm Page
              </Button>
              <Button variant="outline" onClick={() => window.open('/admin/dashboard/settings', '_blank')}>
                Admin Settings
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">How to Fix</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Step 1:</strong> Click "Add Test Account" to create a test bank account</p>
              <p><strong>Step 2:</strong> Click "Test Confirm Page" to see if it shows the bank account</p>
              <p><strong>Step 3:</strong> If it works, go to Admin Settings and add your real bank accounts</p>
              <p><strong>Step 4:</strong> If it doesn't work, check the console for error messages</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 