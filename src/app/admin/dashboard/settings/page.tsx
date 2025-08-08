
'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SettingsService } from '@/lib/firebase-service';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AppSettings {
  telegramLink: string;
  whatsappLink: string;
  infoItems: Array<{ text: string }>;
  bankAccounts: any[];
  minDeposit?: number;
  maxDeposit?: number;
  minWithdrawal?: number;
  updatedAt?: any;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    telegramLink: '',
    whatsappLink: '',
    infoItems: [],
    bankAccounts: [],
    minDeposit: 3000,
    maxDeposit: 500000,
    minWithdrawal: 1000
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadSettings();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await SettingsService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load settings.' });
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }

    setIsSaving(true);
    try {
      await SettingsService.saveSettings(settings);
      toast({ title: 'Settings Saved', description: 'Settings have been updated successfully.' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof AppSettings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? value : Number(value)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to access admin settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Admin Settings
          </CardTitle>
          <CardDescription>
            Configure application settings and limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Deposit Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Deposit Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minDeposit">Minimum Deposit (₦)</Label>
                <Input
                  id="minDeposit"
                  type="number"
                  value={settings.minDeposit || 3000}
                  onChange={(e) => handleInputChange('minDeposit', e.target.value)}
                  placeholder="3000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDeposit">Maximum Deposit (₦)</Label>
                <Input
                  id="maxDeposit"
                  type="number"
                  value={settings.maxDeposit || 500000}
                  onChange={(e) => handleInputChange('maxDeposit', e.target.value)}
                  placeholder="500000"
                />
              </div>
            </div>
          </div>

          {/* Withdrawal Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Withdrawal Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minWithdrawal">Minimum Withdrawal (₦)</Label>
                <Input
                  id="minWithdrawal"
                  type="number"
                  value={settings.minWithdrawal || 1000}
                  onChange={(e) => handleInputChange('minWithdrawal', e.target.value)}
                  placeholder="1000"
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Social Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telegramLink">Telegram Link</Label>
                <Input
                  id="telegramLink"
                  type="url"
                  value={settings.telegramLink}
                  onChange={(e) => handleInputChange('telegramLink', e.target.value)}
                  placeholder="https://t.me/yourchannel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsappLink">WhatsApp Link</Label>
                <Input
                  id="whatsappLink"
                  type="url"
                  value={settings.whatsappLink}
                  onChange={(e) => handleInputChange('whatsappLink', e.target.value)}
                  placeholder="https://wa.me/yournumber"
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
