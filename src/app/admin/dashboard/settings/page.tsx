
'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save, Loader, Cog, MessageSquare, Bell, Users, Info, DollarSign, ArrowDownUp, Plus, Edit, Trash2, Landmark } from 'lucide-react';
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
  // Add notification banner settings
  notificationBanner?: {
    enabled: boolean;
    message: string;
    backgroundColor?: string;
    textColor?: string;
    showOnAllPages?: boolean;
  };
  // Add popup notification settings
  popupNotification?: {
    enabled: boolean;
    title: string;
    message: string;
    showOnHomePage: boolean;
    backgroundColor?: string;
    textColor?: string;
    buttonText?: string;
    buttonLink?: string;
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
    infoItems: [
      { text: "Profit drops every 24 hours" },
      { text: "Level 1 - 24% Level 2 - 3% Level 3 - 2%" },
      { text: "Withdrawal: 10am - 6pm daily" },
      { text: "Deposit: 24/7" },
      { text: "Daily Login bonus: ₦50" },
      { text: "Welcome bonus: ₦550" },
      { text: "Minimum deposit: ₦3,000" },
      { text: "Withdrawal charge: 15%" },
      { text: "Minimum withdrawal: ₦1,000" },
      { text: "Join our Support group for updates" }
    ],
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
    },
    notificationBanner: {
      enabled: false,
      message: 'Welcome to McDonald Investment!',
      backgroundColor: '#3b82f6',
      textColor: '#ffffff',
      showOnAllPages: true
    },
    popupNotification: {
      enabled: false,
      title: 'Welcome!',
      message: 'Thank you for visiting McDonald Investment!',
      showOnHomePage: true,
      backgroundColor: '#3b82f6',
      textColor: '#ffffff',
      buttonText: 'Get Started',
      buttonLink: '/dashboard'
    }
  });

  // Bank account management state
  const [isBankAccountDialogOpen, setIsBankAccountDialogOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<any>(null);
  const [newBankAccount, setNewBankAccount] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
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
        },
        notificationBanner: {
          enabled: currentSettings.notificationBanner?.enabled || false,
          message: currentSettings.notificationBanner?.message || 'Welcome to McDonald Investment!',
          backgroundColor: currentSettings.notificationBanner?.backgroundColor || '#3b82f6',
          textColor: currentSettings.notificationBanner?.textColor || '#ffffff',
          showOnAllPages: currentSettings.notificationBanner?.showOnAllPages || true
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

  // Info items management functions
  const handleInfoItemChange = (index: number, value: string) => {
    setSettings(prev => ({
      ...prev,
      infoItems: prev.infoItems.map((item, i) => 
        i === index ? { text: value } : item
      )
    }));
  };

  const handleAddInfoItem = () => {
    setSettings(prev => ({
      ...prev,
      infoItems: [...prev.infoItems, { text: '' }]
    }));
  };

  const handleRemoveInfoItem = (index: number) => {
    setSettings(prev => ({
      ...prev,
      infoItems: prev.infoItems.filter((_, i) => i !== index)
    }));
  };

  // Bank account management functions
  const handleAddBankAccount = () => {
    if (!newBankAccount.bankName || !newBankAccount.accountNumber || !newBankAccount.accountName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all fields.' });
      return;
    }

    const account = {
      id: Date.now().toString(),
      ...newBankAccount
    };

    setSettings(prev => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, account]
    }));

    setNewBankAccount({ bankName: '', accountNumber: '', accountName: '' });
    setIsBankAccountDialogOpen(false);
    toast({ title: 'Success', description: 'Bank account added successfully.' });
  };

  const handleEditBankAccount = () => {
    if (!editingBankAccount || !editingBankAccount.bankName || !editingBankAccount.accountNumber || !editingBankAccount.accountName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all fields.' });
      return;
    }

    setSettings(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map(account => 
        account.id === editingBankAccount.id ? editingBankAccount : account
      )
    }));

    setEditingBankAccount(null);
    setIsBankAccountDialogOpen(false);
    toast({ title: 'Success', description: 'Bank account updated successfully.' });
  };

  const handleDeleteBankAccount = (accountId: string) => {
    setSettings(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter(account => account.id !== accountId)
    }));
    toast({ title: 'Success', description: 'Bank account deleted successfully.' });
  };

  const openEditBankAccount = (account: any) => {
    setEditingBankAccount({ ...account });
    setIsBankAccountDialogOpen(true);
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
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="limits">Limits</TabsTrigger>
              <TabsTrigger value="socials">Social Links</TabsTrigger>
              <TabsTrigger value="popups">Popup Content</TabsTrigger>
              <TabsTrigger value="notification">Notification Banner</TabsTrigger>
              <TabsTrigger value="popupnotification">Popup Notification</TabsTrigger>
              <TabsTrigger value="bankaccounts">Bank Accounts</TabsTrigger>
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
              {/* Info Items (Home Page Popup Content) */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Home Page Info Items
                </h3>
                <p className="text-sm text-muted-foreground">
                  Edit the information items that appear on the home page popup (rules, bonuses, etc.).
                </p>

                <div className="space-y-4">
                  {settings.infoItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Textarea
                        value={item.text}
                        onChange={(e) => handleInfoItemChange(index, e.target.value)}
                        placeholder="Enter info item text"
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveInfoItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={handleAddInfoItem}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Info Item
                  </Button>
                </div>
              </div>

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

            <TabsContent value="notification" className="space-y-6">
              {/* Notification Banner Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notification Banner Settings
                </h3>
                <p className="text-sm text-muted-foreground">
                  Configure the notification banner that appears at the top of the website.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="bannerEnabled"
                      checked={settings.notificationBanner?.enabled || false}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notificationBanner: {
                          enabled: e.target.checked,
                          message: prev.notificationBanner?.message || 'Welcome to McDonald Investment!',
                          backgroundColor: prev.notificationBanner?.backgroundColor || '#3b82f6',
                          textColor: prev.notificationBanner?.textColor || '#ffffff',
                          showOnAllPages: prev.notificationBanner?.showOnAllPages || true
                        }
                      }))}
                      className="rounded"
                    />
                    <Label htmlFor="bannerEnabled">Enable Notification Banner</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bannerMessage">Banner Message</Label>
                    <Textarea
                      id="bannerMessage"
                      value={settings.notificationBanner?.message || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notificationBanner: {
                          ...prev.notificationBanner,
                          message: e.target.value
                        }
                      }))}
                      placeholder="Enter the message to display in the banner"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bannerBackgroundColor">Background Color</Label>
                      <Input
                        id="bannerBackgroundColor"
                        type="color"
                        value={settings.notificationBanner?.backgroundColor || '#3b82f6'}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notificationBanner: {
                            ...prev.notificationBanner,
                            backgroundColor: e.target.value
                          }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bannerTextColor">Text Color</Label>
                      <Input
                        id="bannerTextColor"
                        type="color"
                        value={settings.notificationBanner?.textColor || '#ffffff'}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notificationBanner: {
                            ...prev.notificationBanner,
                            textColor: e.target.value
                          }
                        }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="bannerShowOnAllPages"
                      checked={settings.notificationBanner?.showOnAllPages || false}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notificationBanner: {
                          ...prev.notificationBanner,
                          showOnAllPages: e.target.checked
                        }
                      }))}
                      className="rounded"
                    />
                    <Label htmlFor="bannerShowOnAllPages">Show on all pages</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="popupnotification" className="space-y-6">
              {/* Popup Notification Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Popup Notification Settings
                </h3>
                <p className="text-sm text-muted-foreground">
                  Configure popup notifications that appear when users visit the home page.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="popupEnabled"
                      checked={settings.popupNotification?.enabled || false}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        popupNotification: {
                          enabled: e.target.checked,
                          title: prev.popupNotification?.title || 'Welcome!',
                          message: prev.popupNotification?.message || 'Thank you for visiting McDonald Investment!',
                          showOnHomePage: prev.popupNotification?.showOnHomePage || true,
                          backgroundColor: prev.popupNotification?.backgroundColor || '#3b82f6',
                          textColor: prev.popupNotification?.textColor || '#ffffff',
                          buttonText: prev.popupNotification?.buttonText || 'Get Started',
                          buttonLink: prev.popupNotification?.buttonLink || '/dashboard'
                        }
                      }))}
                      className="rounded"
                    />
                    <Label htmlFor="popupEnabled">Enable Popup Notification</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="popupTitle">Popup Title</Label>
                    <Input
                      id="popupTitle"
                      value={settings.popupNotification?.title || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        popupNotification: {
                          enabled: prev.popupNotification?.enabled || false,
                          title: e.target.value,
                          message: prev.popupNotification?.message || 'Thank you for visiting McDonald Investment!',
                          showOnHomePage: prev.popupNotification?.showOnHomePage || true,
                          backgroundColor: prev.popupNotification?.backgroundColor || '#3b82f6',
                          textColor: prev.popupNotification?.textColor || '#ffffff',
                          buttonText: prev.popupNotification?.buttonText || 'Get Started',
                          buttonLink: prev.popupNotification?.buttonLink || '/dashboard'
                        }
                      }))}
                      placeholder="Enter popup title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="popupMessage">Popup Message</Label>
                    <Textarea
                      id="popupMessage"
                      value={settings.popupNotification?.message || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        popupNotification: {
                          enabled: prev.popupNotification?.enabled || false,
                          title: prev.popupNotification?.title || 'Welcome!',
                          message: e.target.value,
                          showOnHomePage: prev.popupNotification?.showOnHomePage || true,
                          backgroundColor: prev.popupNotification?.backgroundColor || '#3b82f6',
                          textColor: prev.popupNotification?.textColor || '#ffffff',
                          buttonText: prev.popupNotification?.buttonText || 'Get Started',
                          buttonLink: prev.popupNotification?.buttonLink || '/dashboard'
                        }
                      }))}
                      placeholder="Enter popup message"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="popupBackgroundColor">Background Color</Label>
                      <Input
                        id="popupBackgroundColor"
                        type="color"
                        value={settings.popupNotification?.backgroundColor || '#3b82f6'}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          popupNotification: {
                            enabled: prev.popupNotification?.enabled || false,
                            title: prev.popupNotification?.title || 'Welcome!',
                            message: prev.popupNotification?.message || 'Thank you for visiting McDonald Investment!',
                            showOnHomePage: prev.popupNotification?.showOnHomePage || true,
                            backgroundColor: e.target.value,
                            textColor: prev.popupNotification?.textColor || '#ffffff',
                            buttonText: prev.popupNotification?.buttonText || 'Get Started',
                            buttonLink: prev.popupNotification?.buttonLink || '/dashboard'
                          }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="popupTextColor">Text Color</Label>
                      <Input
                        id="popupTextColor"
                        type="color"
                        value={settings.popupNotification?.textColor || '#ffffff'}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          popupNotification: {
                            enabled: prev.popupNotification?.enabled || false,
                            title: prev.popupNotification?.title || 'Welcome!',
                            message: prev.popupNotification?.message || 'Thank you for visiting McDonald Investment!',
                            showOnHomePage: prev.popupNotification?.showOnHomePage || true,
                            backgroundColor: prev.popupNotification?.backgroundColor || '#3b82f6',
                            textColor: e.target.value,
                            buttonText: prev.popupNotification?.buttonText || 'Get Started',
                            buttonLink: prev.popupNotification?.buttonLink || '/dashboard'
                          }
                        }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="popupButtonText">Button Text (Optional)</Label>
                    <Input
                      id="popupButtonText"
                      value={settings.popupNotification?.buttonText || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        popupNotification: {
                          enabled: prev.popupNotification?.enabled || false,
                          title: prev.popupNotification?.title || 'Welcome!',
                          message: prev.popupNotification?.message || 'Thank you for visiting McDonald Investment!',
                          showOnHomePage: prev.popupNotification?.showOnHomePage || true,
                          backgroundColor: prev.popupNotification?.backgroundColor || '#3b82f6',
                          textColor: prev.popupNotification?.textColor || '#ffffff',
                          buttonText: e.target.value,
                          buttonLink: prev.popupNotification?.buttonLink || '/dashboard'
                        }
                      }))}
                      placeholder="e.g., Get Started, Learn More"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="popupButtonLink">Button Link (Optional)</Label>
                    <Input
                      id="popupButtonLink"
                      value={settings.popupNotification?.buttonLink || ''}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        popupNotification: {
                          enabled: prev.popupNotification?.enabled || false,
                          title: prev.popupNotification?.title || 'Welcome!',
                          message: prev.popupNotification?.message || 'Thank you for visiting McDonald Investment!',
                          showOnHomePage: prev.popupNotification?.showOnHomePage || true,
                          backgroundColor: prev.popupNotification?.backgroundColor || '#3b82f6',
                          textColor: prev.popupNotification?.textColor || '#ffffff',
                          buttonText: prev.popupNotification?.buttonText || 'Get Started',
                          buttonLink: e.target.value
                        }
                      }))}
                      placeholder="e.g., /dashboard, https://example.com"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bankaccounts" className="space-y-6">
              {/* Bank Account Management */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Landmark className="h-4 w-4" />
                    Bank Account Management
                  </h3>
                  <Button 
                    onClick={() => {
                      setNewBankAccount({ bankName: '', accountNumber: '', accountName: '' });
                      setEditingBankAccount(null);
                      setIsBankAccountDialogOpen(true);
                    }}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Account
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage bank accounts that users can deposit funds to.
                </p>
                
                {/* Important Note */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Important:</strong> After adding, editing, or deleting bank accounts, 
                    you must click "Save Settings" at the bottom of this page for changes to take effect.
                  </p>
                </div>

                {settings.bankAccounts.length > 0 ? (
                  <div className="space-y-3">
                    {settings.bankAccounts.map((account) => (
                      <Card key={account.id} className="bg-card/50">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{account.bankName}</h4>
                                <Badge variant="secondary">{account.accountNumber}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{account.accountName}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditBankAccount(account)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteBankAccount(account.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-card/50 text-center">
                    <CardContent className="p-8">
                      <Landmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No bank accounts configured yet.</p>
                      <p className="text-sm text-muted-foreground mt-2">Add your first bank account to enable deposits.</p>
                    </CardContent>
                  </Card>
                )}
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

      {/* Bank Account Dialog */}
      <Dialog open={isBankAccountDialogOpen} onOpenChange={setIsBankAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBankAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
            </DialogTitle>
            <DialogDescription>
              {editingBankAccount ? 'Update the bank account details.' : 'Add a new bank account for user deposits.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={editingBankAccount ? editingBankAccount.bankName : newBankAccount.bankName}
                onChange={(e) => {
                  if (editingBankAccount) {
                    setEditingBankAccount(prev => ({ ...prev, bankName: e.target.value }));
                  } else {
                    setNewBankAccount(prev => ({ ...prev, bankName: e.target.value }));
                  }
                }}
                placeholder="e.g., First Bank, GT Bank"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                value={editingBankAccount ? editingBankAccount.accountNumber : newBankAccount.accountNumber}
                onChange={(e) => {
                  if (editingBankAccount) {
                    setEditingBankAccount(prev => ({ ...prev, accountNumber: e.target.value }));
                  } else {
                    setNewBankAccount(prev => ({ ...prev, accountNumber: e.target.value }));
                  }
                }}
                placeholder="e.g., 1234567890"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={editingBankAccount ? editingBankAccount.accountName : newBankAccount.accountName}
                onChange={(e) => {
                  if (editingBankAccount) {
                    setEditingBankAccount(prev => ({ ...prev, accountName: e.target.value }));
                  } else {
                    setNewBankAccount(prev => ({ ...prev, accountName: e.target.value }));
                  }
                }}
                placeholder="e.g., McDonald Investment Ltd"
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={editingBankAccount ? handleEditBankAccount : handleAddBankAccount}
              className="flex-1"
            >
              {editingBankAccount ? 'Update Account' : 'Add Account'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsBankAccountDialogOpen(false);
                setEditingBankAccount(null);
                setNewBankAccount({ bankName: '', accountNumber: '', accountName: '' });
              }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </div>
  );
}
