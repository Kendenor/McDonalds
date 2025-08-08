
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader, Trash2, PlusCircle } from 'lucide-react'
import { SettingsService, BankAccountService, AppSettings, BankAccount } from '@/lib/firebase-service'
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FirebaseInit } from '@/lib/firebase-init';

interface InfoItem {
    text: string;
}

const defaultInfoItems: InfoItem[] = [
    { text: "Profit drops every 24 hours" },
    { text: "Level 1 - 24% Level 2 - 3% Level 3 - 2%" },
    { text: "Withdrawal: 10am - 6pm daily" },
    { text: "Deposit: 24/7" },
    { text: "Daily Login bonus: ₦50" },
    { text: "Welcome bonus: ₦550" },
    { text: "Minimum deposit: ₦3,000" },
    { text: "Withdrawal charge: 15%" },
    { text: "Minimum withdrawal: ₦1,000" },
]

export default function SettingsPage() {
    const { toast } = useToast()
    const [telegramLink, setTelegramLink] = useState('')
    const [whatsappLink, setWhatsappLink] = useState('')
    const [infoItems, setInfoItems] = useState<InfoItem[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [minDeposit, setMinDeposit] = useState(3000);
    const [maxDeposit, setMaxDeposit] = useState(500000);
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await SettingsService.getSettings();
                setTelegramLink(settings.telegramLink || '');
                setWhatsappLink(settings.whatsappLink || '');
                setInfoItems(settings.infoItems && settings.infoItems.length > 0 ? settings.infoItems : defaultInfoItems);
                setBankAccounts(settings.bankAccounts || []);
                setMinDeposit(settings.minDeposit || 3000);
                setMaxDeposit(settings.maxDeposit || 500000);
            } catch (error) {
                console.error('Error loading settings:', error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load settings from database.' });
            }
        };
        loadSettings();
    }, []);
    
    const handleInfoItemChange = (index: number, value: string) => {
        const newItems = [...infoItems];
        newItems[index].text = value;
        setInfoItems(newItems);
    }
    
    const addInfoItem = () => {
        setInfoItems([...infoItems, { text: '' }]);
    }

    const removeInfoItem = (index: number) => {
        const newItems = infoItems.filter((_, i) => i !== index);
        setInfoItems(newItems);
    }

    const handleBankAccountChange = (index: number, field: keyof BankAccount, value: string) => {
        const newAccounts = [...bankAccounts];
        newAccounts[index] = { ...newAccounts[index], [field]: value };
        setBankAccounts(newAccounts);
    }

    const addBankAccount = () => {
        setBankAccounts([...bankAccounts, { id: `acc-${Date.now()}`, bankName: '', accountNumber: '', accountName: '' }]);
    }

    const removeBankAccount = (id: string) => {
        setBankAccounts(bankAccounts.filter(acc => acc.id !== id));
    }


    const handleSave = async () => {
        setIsLoading(true);
        try {
            const settings: AppSettings = { 
                telegramLink, 
                whatsappLink, 
                infoItems, 
                bankAccounts,
                minDeposit,
                maxDeposit
            };
            
            // Save to Firebase
            await SettingsService.saveSettings(settings);
            
            // Also save to localStorage as backup
            localStorage.setItem('globalSettings', JSON.stringify(settings));
            
            window.dispatchEvent(new Event('storage'));
            toast({ title: 'Success', description: 'Settings saved to Firebase successfully.' });
        } catch (error: any) {
            // Fallback to localStorage only
            const settings = { telegramLink, whatsappLink, infoItems, bankAccounts, minDeposit, maxDeposit };
            localStorage.setItem('globalSettings', JSON.stringify(settings));
            toast({ 
                title: 'Firebase Error', 
                description: `Failed to save to Firebase: ${error.message}. Saved to localStorage as backup.` 
            });
        } finally {
            setIsLoading(false);
        }
    }



    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>App Settings</CardTitle>
                    <CardDescription>Manage global application settings like social links, popup info, and deposit accounts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Social Links</h3>
                        <div className="space-y-2">
                            <Label htmlFor="telegram">Telegram Group Link</Label>
                            <Input id="telegram" value={telegramLink} onChange={(e) => setTelegramLink(e.target.value)} placeholder="https://t.me/yourgroup" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="whatsapp">WhatsApp Channel Link</Label>
                            <Input id="whatsapp" value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)} placeholder="https://whatsapp.com/channel/yourchannel" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Deposit Limits</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minDeposit">Minimum Deposit (₦)</Label>
                                <Input 
                                    id="minDeposit" 
                                    type="number" 
                                    value={minDeposit} 
                                    onChange={(e) => setMinDeposit(Number(e.target.value))} 
                                    placeholder="3000" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxDeposit">Maximum Deposit (₦)</Label>
                                <Input 
                                    id="maxDeposit" 
                                    type="number" 
                                    value={maxDeposit} 
                                    onChange={(e) => setMaxDeposit(Number(e.target.value))} 
                                    placeholder="500000" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className='flex justify-between items-center'>
                             <div>
                                <h3 className="text-lg font-medium">Deposit Bank Accounts</h3>
                                <p className="text-sm text-muted-foreground">Manage bank accounts shown to users for deposits.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={addBankAccount}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Account
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {bankAccounts.map((account, index) => (
                                <div key={account.id || `account-${index}`} className="flex flex-col sm:flex-row items-center gap-2 p-3 border rounded-lg">
                                    <Input value={account.bankName} onChange={(e) => handleBankAccountChange(index, 'bankName', e.target.value)} placeholder="Bank Name (e.g. Access Bank)"/>
                                    <Input value={account.accountNumber} onChange={(e) => handleBankAccountChange(index, 'accountNumber', e.target.value)} placeholder="Account Number"/>
                                    <Input value={account.accountName} onChange={(e) => handleBankAccountChange(index, 'accountName', e.target.value)} placeholder="Account Name"/>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400" onClick={() => removeBankAccount(account.id || `account-${index}`)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className='flex justify-between items-center'>
                             <div>
                                <h3 className="text-lg font-medium">Info Popup Content</h3>
                                <p className="text-sm text-muted-foreground">Manage the items displayed in the user dashboard info popup.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={addInfoItem}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Item
                            </Button>
                        </div>
                       
                        <div className="space-y-3">
                            {infoItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input
                                        value={item.text}
                                        onChange={(e) => handleInfoItemChange(index, e.target.value)}
                                        placeholder="Enter info text..."
                                    />
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400" onClick={() => removeInfoItem(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Button onClick={handleSave} disabled={isLoading}>
                            {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Save Settings
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
