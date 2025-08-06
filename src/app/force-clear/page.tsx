'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ForceClearPage() {
  const { toast } = useToast();
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [isCleared, setIsCleared] = useState(false);

  const loadBankAccounts = () => {
    const settings = JSON.parse(localStorage.getItem('globalSettings') || '{}');
    const accounts = settings.bankAccounts || [];
    setBankAccounts(accounts);
    console.log('Current bank accounts:', accounts);
  };

  const forceClearAll = () => {
    // Clear the entire globalSettings
    localStorage.removeItem('globalSettings');
    
    // Also clear any other related data
    localStorage.removeItem('globalAdminUsers');
    localStorage.removeItem('globalTransactions');
    
    setBankAccounts([]);
    setIsCleared(true);
    
    toast({
      title: "All Data Cleared",
      description: "All localStorage data has been completely cleared.",
    });
  };

  const reloadFromAdmin = () => {
    // This will force the admin settings to reload
    window.location.reload();
  };

  useEffect(() => {
    loadBankAccounts();
  }, []);

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Force Clear All Data</CardTitle>
          <CardDescription>Completely clear all localStorage data and start fresh.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Warning */}
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-orange-500">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Warning</span>
            </div>
            <p className="text-sm mt-2">This will clear ALL localStorage data including admin settings, bank accounts, and user data.</p>
          </div>

          {/* Current Bank Accounts */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Bank Accounts (Before Clear)</h3>
            {bankAccounts.length === 0 ? (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-muted-foreground">No bank accounts found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bankAccounts.map((account) => (
                  <div key={account.id} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{account.bankName}</p>
                        <p className="text-sm text-muted-foreground">Account: {account.accountNumber}</p>
                        <p className="text-sm text-muted-foreground">Name: {account.accountName}</p>
                      </div>
                      {(account.bankName?.includes('Test') || account.accountName?.includes('Test')) && (
                        <div className="flex items-center gap-2 text-red-500">
                          <span className="text-sm">Test Account</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <Button onClick={forceClearAll} className="w-full bg-red-600 hover:bg-red-700">
              <Trash2 className="mr-2 h-4 w-4" />
              Force Clear ALL Data
            </Button>
            
            <Button onClick={loadBankAccounts} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Data
            </Button>
          </div>

          {/* After Clear Instructions */}
          {isCleared && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Data Cleared Successfully!</span>
              </div>
              <div className="space-y-2 mt-2 text-sm">
                <p><strong>Next Steps:</strong></p>
                <p>1. Go to Admin Settings and add your real bank accounts</p>
                <p>2. Save the settings</p>
                <p>3. Test the recharge page</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="pt-4 border-t space-y-2">
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