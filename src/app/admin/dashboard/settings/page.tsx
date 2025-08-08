
'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save, Loader, Cog, MessageSquare, Bell, Users, Info, DollarSign, ArrowDownUp } from 'lucide-react';
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
  popupContent?: {
    welcomeMessage?: string;
    notificationTitle?: string;
    depositSuccessMessage?: string;
    withdrawalSuccessMessage?: string;
    referralBonusMessage?: string;
    dailyLoginMessage?: string;
  };
  updatedAt?: any;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('limits');
  const [settings, setSettings] = useState<AppSettings>({
    telegramLink: '',
    whatsappLink: '',
    infoItems: [],
    bankAccounts: [],
    minDeposit: 3000,
    maxDeposit: 500000,
    minWithdrawal: 1000,
    popupContent: {
      welcomeMessage: 'Welcome to McDonald Investment! Your ₦300 welcome bonus has been added to your account.',
      notificationTitle: 'Notifications',
      depositSuccessMessage: 'Deposit successful! Your funds have been added to your account.',
      withdrawalSuccessMessage: 'Withdrawal request submitted successfully!',
      referralBonusMessage: 'Referral bonus received! Your earnings have been updated.',
      dailyLoginMessage: 'Daily login bonus of ₦50 has been added to your account!'
    }
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
      setSettings({
        ...currentSettings,
        popupContent: {
          ...settings.popupContent,
          ...currentSettings.popupContent
        }
      });
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
      setIsDialogOpen(false);
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

  const handlePopupContentChange = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      popupContent: {
        ...prev.popupContent,
        [field]: value
      }
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
      {/* Quick Settings Popover */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage application settings, limits, and popup content</p>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              Quick Settings
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Quick Settings</h4>
                <p className="text-sm text-muted-foreground">Quick access to common settings</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Min Deposit</Label>
                  <div className="text-sm font-medium">₦{settings.minDeposit?.toLocaleString() || '3,000'}</div>
                </div>
                <div>
                  <Label className="text-xs">Max Deposit</Label>
                  <div className="text-sm font-medium">₦{settings.maxDeposit?.toLocaleString() || '500,000'}</div>
                </div>
                <div>
                  <Label className="text-xs">Min Withdrawal</Label>
                  <div className="text-sm font-medium">₦{settings.minWithdrawal?.toLocaleString() || '1,000'}</div>
                </div>
              </div>
              
              <Button 
                onClick={() => setIsDialogOpen(true)} 
                size="sm" 
                className="w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Settings
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Main Settings Card */}
            <Card>
                <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Application Settings
          </CardTitle>
          <CardDescription>
            Configure application settings, limits, and popup content. Click "Edit Settings" to modify values.
          </CardDescription>
                </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Settings Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-sm text-muted-foreground">Minimum Deposit</h4>
              <p className="text-2xl font-bold">₦{settings.minDeposit?.toLocaleString() || '3,000'}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-sm text-muted-foreground">Maximum Deposit</h4>
              <p className="text-2xl font-bold">₦{settings.maxDeposit?.toLocaleString() || '500,000'}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-sm text-muted-foreground">Minimum Withdrawal</h4>
              <p className="text-2xl font-bold">₦{settings.minWithdrawal?.toLocaleString() || '1,000'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-sm text-muted-foreground">Telegram Link</h4>
              <p className="text-sm truncate">{settings.telegramLink || 'Not set'}</p>
                        </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-sm text-muted-foreground">WhatsApp Link</h4>
              <p className="text-sm truncate">{settings.whatsappLink || 'Not set'}</p>
                        </div>
                    </div>

          <Button 
            onClick={() => setIsDialogOpen(true)} 
            className="w-full"
          >
            <Settings className="mr-2 h-4 w-4" />
            Edit Settings
          </Button>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Edit Settings
            </DialogTitle>
            <DialogDescription>
              Modify application settings, limits, and popup content. Changes will be applied immediately.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="limits">Limits</TabsTrigger>
              <TabsTrigger value="socials">Social Links</TabsTrigger>
              <TabsTrigger value="popups">Popup Content</TabsTrigger>
            </TabsList>

            <TabsContent value="limits" className="space-y-6">
              {/* Deposit Limits */}
                    <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Deposit Limits
                </h3>
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
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ArrowDownUp className="h-4 w-4" />
                  Withdrawal Limits
                </h3>
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
            </TabsContent>

            <TabsContent value="socials" className="space-y-6">
              {/* Social Links */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Social Links
                </h3>
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
            </TabsContent>

            <TabsContent value="popups" className="space-y-6">
              {/* Popup Content */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Popup Content
                </h3>
                <p className="text-sm text-muted-foreground">
                  Edit the content that appears in popups and notifications for users.
                </p>

                    <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="welcomeMessage">Welcome Message</Label>
                    <Textarea
                      id="welcomeMessage"
                      value={settings.popupContent?.welcomeMessage || ''}
                      onChange={(e) => handlePopupContentChange('welcomeMessage', e.target.value)}
                      placeholder="Welcome message shown to new users"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notificationTitle">Notification Title</Label>
                    <Input
                      id="notificationTitle"
                      value={settings.popupContent?.notificationTitle || ''}
                      onChange={(e) => handlePopupContentChange('notificationTitle', e.target.value)}
                      placeholder="Notifications"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="depositSuccessMessage">Deposit Success Message</Label>
                    <Textarea
                      id="depositSuccessMessage"
                      value={settings.popupContent?.depositSuccessMessage || ''}
                      onChange={(e) => handlePopupContentChange('depositSuccessMessage', e.target.value)}
                      placeholder="Message shown when deposit is successful"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="withdrawalSuccessMessage">Withdrawal Success Message</Label>
                    <Textarea
                      id="withdrawalSuccessMessage"
                      value={settings.popupContent?.withdrawalSuccessMessage || ''}
                      onChange={(e) => handlePopupContentChange('withdrawalSuccessMessage', e.target.value)}
                      placeholder="Message shown when withdrawal is submitted"
                      rows={2}
                    />
                            </div>

                  <div className="space-y-2">
                    <Label htmlFor="referralBonusMessage">Referral Bonus Message</Label>
                    <Textarea
                      id="referralBonusMessage"
                      value={settings.popupContent?.referralBonusMessage || ''}
                      onChange={(e) => handlePopupContentChange('referralBonusMessage', e.target.value)}
                      placeholder="Message shown when referral bonus is received"
                      rows={2}
                    />
                        </div>
                       
                  <div className="space-y-2">
                    <Label htmlFor="dailyLoginMessage">Daily Login Message</Label>
                    <Textarea
                      id="dailyLoginMessage"
                      value={settings.popupContent?.dailyLoginMessage || ''}
                      onChange={(e) => handlePopupContentChange('dailyLoginMessage', e.target.value)}
                      placeholder="Message shown for daily login bonus"
                      rows={2}
                    />
                                </div>
                        </div>
                    </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex-1"
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
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
                        </Button>
                    </div>
        </DialogContent>
      </Dialog>
        </div>
  );
}
