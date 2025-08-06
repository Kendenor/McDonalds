'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, RefreshCw, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ClearTestPage() {
  const { toast } = useToast();
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  const loadBankAccounts = () => {
    const settings = JSON.parse(localStorage.getItem('globalSettings') || '{}');
    const accounts = settings.bankAccounts || [];
    setBankAccounts(accounts);
    console.log('Current bank accounts:', accounts);
  };

  const clearTestAccounts = () => {
    const settings = JSON.parse(localStorage.getItem('globalSettings') || '{}');
    
    // Remove any test accounts (accounts with "Test" in the name)
    const realAccounts = settings.bankAccounts?.filter((acc: any) => 
      !acc.bankName?.includes('Test') && 
      !acc.accountName?.includes('Test')
    ) || [];
    
    const newSettings = { ...settings, bankAccounts: realAccounts };
    localStorage.setItem('globalSettings', JSON.stringify(newSettings));
    
    setBankAccounts(realAccounts);
    toast({
      title: "Test Accounts Cleared",
      description: `Removed test accounts. ${realAccounts.length} real accounts remaining.`
    });
  };

  const clearAllAccounts = () => {
    const settings = JSON.parse(localStorage.getItem('globalSettings') || '{}');
    const newSettings = { ...settings, bankAccounts: [] };
    localStorage.setItem('globalSettings', JSON.stringify(newSettings));
    
    setBankAccounts([]);
    toast({
      title: "All Accounts Cleared",
      description: "All bank accounts have been removed."
    });
  };

  useEffect(() => {
    loadBankAccounts();
  }, []);

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Clear Test Bank Accounts</CardTitle>
          <CardDescription>Remove test accounts and show your real bank accounts from admin settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Current Bank Accounts */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Bank Accounts</h3>
            {bankAccounts.length === 0 ? (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-muted-foreground">No bank accounts found.</p>
                <p className="text-sm text-muted-foreground mt-2">Go to Admin Settings to add bank accounts.</p>
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
                        <div className="flex items-center gap-2 text-orange-500">
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
          <div className="flex gap-2">
            <Button onClick={clearTestAccounts} className="flex-1">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Test Accounts
            </Button>
            <Button onClick={clearAllAccounts} variant="outline" className="flex-1">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Accounts
            </Button>
            <Button onClick={loadBankAccounts} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Next Steps</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Step 1:</strong> Click "Clear Test Accounts" to remove the test account</p>
              <p><strong>Step 2:</strong> Go to Admin Settings and add your real bank accounts</p>
              <p><strong>Step 3:</strong> Save the settings</p>
              <p><strong>Step 4:</strong> Test the recharge page again</p>
            </div>
          </div>

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