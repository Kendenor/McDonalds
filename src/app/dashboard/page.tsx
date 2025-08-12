
'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  BarChart2,
  Users,
  SlidersHorizontal,
  X,
  Clock,
  Gift,
  Landmark,
  Banknote,
  Hash,
  Percent,
  Send,
  Star,
  CalendarCheck,
  Lock
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { UserService, TransactionService, ProductService, InvestmentPlanService } from '@/lib/user-service';
import { ProductInventoryService } from '@/lib/product-inventory-service';
import { ProductTaskService } from '@/lib/product-task-service';
import { SettingsService } from '@/lib/firebase-service';

function McDonaldLogo({ className }: { className?: string }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M15.75 8.25L18.25 10.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M5.75 13.25L8.25 15.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M8 8H13.5C14.8807 8 16 9.11929 16 10.5V10.5C16 11.8807 14.8807 13 13.5 13H8C6.61929 13 5.5 14.1193 5.5 15.5V15.5C5.5 16.8807 6.61929 18 8 18H16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
      </svg>
    </div>
  );
}

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
        </svg>
    )
}

function TelegramIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
    )
}

const ICONS_MAP: { [key: string]: React.ReactNode } = {
  Clock: <Clock />,
  Users: <Users />,
  Banknote: <Banknote />,
  Landmark: <Landmark />,
  Gift: <Gift />,
  Hash: <Hash />,
  Percent: <Percent />,
  Send: <Send />,
  Star: <Star />,
  CalendarCheck: <CalendarCheck />,
};

const getIcon = (text: string) => {
    for (const key in ICONS_MAP) {
        if (text.toLowerCase().includes(key.toLowerCase())) {
            return ICONS_MAP[key];
        }
    }
    return <Star />;
}

function InfoPopup({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [settings, setSettings] = useState<{ infoItems: Array<{ text: string }>; telegramLink: string; whatsappLink: string }>({ 
    infoItems: [], 
    telegramLink: '', 
    whatsappLink: '' 
  });

  const fetchSettings = async () => {
    try {
      const appSettings = await SettingsService.getSettings();
      setSettings(appSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/40 dark:to-orange-900/30 text-gray-900 dark:text-gray-100 border border-yellow-200 dark:border-yellow-700/40 p-6 rounded-lg max-w-sm w-full mx-4 shadow-2xl">
        <DialogTitle className="sr-only">McDonald's Information</DialogTitle>
        <div className="flex justify-center items-center flex-col space-y-4 text-center">
            <div className="text-primary">
                <McDonaldLogo />
            </div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <Star className="text-yellow-400" fill="currentColor" /> McDonald's
          </h2>
          <div className="space-y-3 text-left w-full">
            {settings.infoItems && settings.infoItems.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <div className="text-primary">{getIcon(item.text)}</div>
                <p>{item.text}</p>
              </div>
            ))}
          </div>

          <div className="w-full space-y-3 pt-4">
            <p className="flex items-center gap-2 justify-center text-sm"><Send size={16} className="text-primary"/> Join our Support group for updates</p>
            {settings.telegramLink && (
              <a href={settings.telegramLink} target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-[#0088cc] hover:bg-[#0077b3] text-white">
                    <TelegramIcon className="mr-2"/>
                    Telegram Group
                </Button>
              </a>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProductCard({
  product,
  onInvest,
  refreshAvailability,
  refreshKey
}: {
  product: { id: string; name: string; price: number; daily: number; total: number; days: number; imageUrl: string; dailyROI: number; cycleDays: number; };
  onInvest: (product: any) => void;
  refreshAvailability: () => void;
  refreshKey: number;
}) {
  const [remainingDays, setRemainingDays] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [availability, setAvailability] = useState<{ available: number; total: number }>({ available: 0, total: 0 });
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);

  useEffect(() => {
    // Calculate remaining days based on product cycle
    const now = new Date();
    const startDate = new Date(); // Assuming product starts when purchased
    const endDate = new Date(startDate.getTime() + (product.cycleDays * 24 * 60 * 60 * 1000));
    
    if (now >= endDate) {
      setIsExpired(true);
      setRemainingDays(0);
    } else {
      const timeDiff = endDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      setRemainingDays(daysDiff);
      setIsExpired(false);
    }
  }, [product.cycleDays]);

  useEffect(() => {
    // Load product availability for Special and Premium products
    const loadAvailability = async () => {
      if (product.id.startsWith('special') || product.id.startsWith('premium')) {
        try {
          const productType = product.id.startsWith('special') ? 'special' : 'premium';
          console.log(`Loading availability for ${product.id} (${productType}) - refreshKey: ${refreshKey}`);
          const avail = await ProductInventoryService.getProductAvailability(product.id, productType);
          console.log(`Availability for ${product.id}:`, avail);
          setAvailability(avail);
        } catch (error) {
          console.error('Error loading availability:', error);
        } finally {
          setIsLoadingAvailability(false);
        }
      } else {
        // Basic products are always available
        setAvailability({ available: 999, total: 999 });
        setIsLoadingAvailability(false);
      }
    };

    loadAvailability();
  }, [product.id, refreshKey]);

  const isSoldOut = availability.available <= 0;
  const isProductLocked = (product.id.startsWith('basic') || product.id.startsWith('premium')) && isExpired;

  return (
    <Card className="bg-card/50 hover:bg-card/90 transition-colors text-card-foreground overflow-hidden">
      <div className="relative aspect-square w-full">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill={true}
          className="object-cover"
          onError={(e) => {
            // Fallback to a default image if the product image fails to load
            const target = e.target as HTMLImageElement;
            target.src = '/images/promo-banner.png';
          }}
        />
        {isExpired && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-lg font-bold">EXPIRED</div>
              <div className="text-sm">Purchase again to restart</div>
            </div>
          </div>
        )}
        {!isExpired && remainingDays > 0 && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold">
            {remainingDays}d left
          </div>
        )}
        {isSoldOut && (
          <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-lg font-bold">SOLD OUT</div>
              <div className="text-sm">No more available</div>
            </div>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-lg mb-2">{product.name}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price:</span>
            <span className="font-semibold">₦{product.price.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Daily ROI:</span>
            <span className="font-semibold text-green-500">{product.dailyROI}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Daily Income:</span>
            <span className="font-semibold">₦{product.daily.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Return:</span>
            <span className="font-semibold text-primary">₦{product.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cycle:</span>
            <span className="font-semibold">{product.cycleDays} days</span>
          </div>
          {(product.id.startsWith('special') || product.id.startsWith('premium')) && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Available:</span>
              {isLoadingAvailability ? (
                <span className="text-xs text-muted-foreground">Loading...</span>
              ) : (
                <span className={`font-semibold ${isSoldOut ? 'text-red-500' : 'text-green-500'}`}>
                  {availability.available}/{availability.total}
                </span>
              )}
            </div>
          )}
        </div>
        <Button 
          onClick={() => onInvest(product)} 
          className="w-full mt-4"
          disabled={isExpired || isSoldOut || isProductLocked}
        >
          {isExpired ? 'Expired - Purchase Again' : 
           isSoldOut ? 'Sold Out' : 
           isProductLocked ? 'Locked Until Cycle Ends' : 
           'Invest Now'}
        </Button>
      </CardContent>
    </Card>
  );
}


export default function DashboardPage() {
  const [showPopup, setShowPopup] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    setShowPopup(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            // Load user data from Firebase
            try {
                const userData = await UserService.getUserById(currentUser.uid);
                if (userData) {
                    setUserData(userData);
                } else {
                    // Create new user if doesn't exist
                    const newUser = {
                        id: currentUser.uid,
                        email: currentUser.email || '',
                        phone: '',
                        regDate: new Date().toISOString(),
                        investment: '₦0',
                        status: 'Active' as const,
                        balance: 0,
                        totalDeposits: 0,
                        totalWithdrawals: 0
                    };
                    await UserService.saveUser(newUser);
                    setUserData(newUser);
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        }
    });

    return () => unsubscribe();
  }, []);

  const handleInvest = async (product: any) => {
    if (!user || !userData) return;

    const currentBalance = userData.balance || 0;
    
    // Check if user has deposited (required for all plans)
    if (!userData.hasDeposited) {
        toast({ 
            variant: "destructive", 
            title: "Deposit Required", 
            description: "You must make a deposit before investing in any plan."
        });
        return;
    }

    // Check access to Special/Premium plans
    if ((product.id.startsWith('special') || product.id.startsWith('premium')) && !canAccessSpecialPlans) {
        toast({ 
            variant: "destructive", 
            title: "Basic Plan Required", 
            description: "You must purchase a Basic plan first to access Special and Premium plans."
        });
        return;
    }
    
    if (currentBalance < product.price) {
        toast({ variant: "destructive", title: "Insufficient Funds", description: "You do not have enough balance to purchase this product."});
        return;
    }

    // Check product availability for Special and Premium products
    if (product.id.startsWith('special') || product.id.startsWith('premium')) {
        const productType = product.id.startsWith('special') ? 'special' : 'premium';
        const isAvailable = await ProductInventoryService.isProductAvailable(product.id, productType);
        
        if (!isAvailable) {
            toast({ 
                variant: "destructive", 
                title: "Product Unavailable", 
                description: "This product is currently sold out. Please try again later or contact admin."
            });
            return;
        }
    }

    try {
        // Update user balance in Firebase
        const newBalance = currentBalance - product.price;
        const updatedUser = { 
          ...userData, 
          balance: newBalance,
          hasBasicPlan: userData.hasBasicPlan || product.id.startsWith('basic'),
          totalInvested: (userData.totalInvested || 0) + product.price
        };
        await UserService.saveUser(updatedUser);
        setUserData(updatedUser);
        
        // Create transaction record
        await TransactionService.createTransaction({
            userId: user.uid,
            userEmail: user.email || '',
            type: 'Investment',
            amount: product.price,
            status: 'Completed',
            date: new Date().toISOString(),
            description: `Investment in ${product.name}`
        });
    
        toast({ title: "Investment Successful!", description: `You have invested in ${product.name}.`});

        // Determine plan type
        const planType = product.id.startsWith('basic') ? 'Basic' : 
                        product.id.startsWith('special') ? 'Special' : 'Premium';

        // Calculate start and end dates
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + (product.cycleDays * 24 * 60 * 60 * 1000));

        // Add purchased product to Firestore
        await ProductService.addPurchasedProduct({
            userId: user.uid,
            productId: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            price: product.price,
            dailyEarning: product.daily,
            totalEarning: product.total,
            daysCompleted: 0,
            totalDays: product.days,
            purchaseDate: new Date().toISOString(),
            status: 'Active',
            planType,
            cycleDays: product.cycleDays,
            dailyROI: product.dailyROI,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalEarned: 0,
            isLocked: planType === 'Basic' || planType === 'Premium'
        });

        // Decrease product availability for Special and Premium products
        if (product.id.startsWith('special') || product.id.startsWith('premium')) {
            const productType = product.id.startsWith('special') ? 'special' : 'premium';
            console.log(`Before purchase - checking availability for ${product.id} (${productType})`);
            
            // Check if product is still available before purchase
            const isAvailable = await ProductInventoryService.isProductAvailable(product.id, productType);
            if (!isAvailable) {
                toast({ 
                    variant: "destructive", 
                    title: "Product Unavailable", 
                    description: "This product is no longer available. Please try another product."
                });
                return;
            }
            
            const success = await ProductInventoryService.decreaseAvailability(product.id, productType);
            
            if (success) {
                console.log(`Successfully decreased availability for ${product.id}`);
                // Refresh the availability display
                await refreshAvailability();
                console.log(`After refresh - availability updated for ${product.id}`);
            } else {
                console.error(`Failed to decrease availability for ${product.id}`);
                toast({ 
                    variant: "destructive", 
                    title: "Error", 
                    description: "Failed to update product availability. Please try again."
                });
                return;
            }
        }

        // Create product-specific daily task
        await ProductTaskService.createProductTask(
            user.uid,
            product.id,
            product.name,
            product.cycleDays,
            product.total
        );

        // Update canAccessSpecialPlans if this is a basic plan
        if (planType === 'Basic') {
            setCanAccessSpecialPlans(true);
        }
    } catch (error) {
        console.error('Error processing investment:', error);
        toast({ variant: 'destructive', title: "Error", description: "Failed to process investment. Please try again." });
    }
  };

  const handleCheckIn = async () => {
    if (!user || !userData) return;

    // Check if user has deposited
    if (!userData.hasDeposited) {
      toast({ 
        variant: "destructive", 
        title: "Deposit Required", 
        description: "You must make a deposit before you can check in for daily bonus." 
      });
      return;
    }

    if (!canCheckIn) {
      toast({ 
        variant: "destructive", 
        title: "Already Checked In", 
        description: "You can only check in once every 24 hours." 
      });
      return;
    }

    try {
      const checkInBonus = 50;
      const newBalance = (userData.balance || 0) + checkInBonus;
      const updatedUser = { 
        ...userData, 
        balance: newBalance,
        lastCheckIn: new Date().toISOString()
      };
      
      await UserService.saveUser(updatedUser);
      setUserData(updatedUser);
      
      // Create transaction record
      await TransactionService.createTransaction({
        userId: user.uid,
        userEmail: user.email || '',
        type: 'Investment',
        amount: checkInBonus,
        status: 'Completed',
        date: new Date().toISOString(),
        description: 'Daily check-in bonus'
      });

      toast({ title: "Check-in Successful!", description: `You earned ₦${checkInBonus} daily bonus!` });
    } catch (error) {
      console.error('Error processing check-in:', error);
      toast({ variant: "destructive", title: "Check-in Failed", description: "An error occurred while processing your check-in." });
    }
  };

  const [products, setProducts] = useState<{
    basic: Array<{ id: string; name: string; price: number; daily: number; total: number; days: number; imageUrl: string; dailyROI: number; cycleDays: number; }>;
    special: Array<{ id: string; name: string; price: number; daily: number; total: number; days: number; imageUrl: string; dailyROI: number; cycleDays: number; }>;
    premium: Array<{ id: string; name: string; price: number; daily: number; total: number; days: number; imageUrl: string; dailyROI: number; cycleDays: number; }>;
  }>({
    basic: [],
    special: [],
    premium: []
  });
  const [canAccessSpecialPlans, setCanAccessSpecialPlans] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check if user can check in (24-hour cooldown)
  const canCheckIn = useMemo(() => {
    if (!userData?.hasDeposited) return false;
    if (!userData?.lastCheckIn) return true;
    
    const lastCheckIn = new Date(userData.lastCheckIn);
    const now = new Date();
    const timeDiff = now.getTime() - lastCheckIn.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return hoursDiff >= 24;
  }, [userData]);

  // Calculate time remaining for next check-in
  const getTimeRemaining = () => {
    if (!userData?.hasDeposited || !userData?.lastCheckIn) return null;
    
    const lastCheckIn = new Date(userData.lastCheckIn);
    const now = new Date();
    const nextCheckIn = new Date(lastCheckIn.getTime() + (24 * 60 * 60 * 1000)); // 24 hours from last check-in
    const timeRemaining = nextCheckIn.getTime() - now.getTime();
    
    if (timeRemaining <= 0) return null;
    
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  // State for countdown timer
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());

  // Update countdown every second
  useEffect(() => {
    if (!userData?.hasDeposited || canCheckIn) {
      setTimeRemaining(null);
      return;
    }

    const interval = setInterval(() => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);
      
      if (!remaining) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userData, canCheckIn]);

    // Load products and check access
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      console.log('Loading products...');
      
      // Initialize inventory if not already done
      await ProductInventoryService.initializeInventory();
      
      // Check for expired products first
      await ProductService.checkAndResetExpiredProducts();
      
      // Load investment plans from service
      const basicPlans = InvestmentPlanService.getBasicPlans().map(plan => ({
        ...plan,
        daily: plan.dailyIncome,
        total: plan.totalReturn,
        days: plan.cycleDays,
        imageUrl: `/images/basic_${plan.id.split('-')[1]}.png.jpg`
      }));
      const specialPlans = InvestmentPlanService.getSpecialPlans().map(plan => ({
        ...plan,
        daily: plan.dailyIncome,
        total: plan.totalReturn,
        days: plan.cycleDays,
        imageUrl: `/images/special_${plan.id.split('-')[1]}.jpg.jpg?t=${Date.now()}`
      }));
      
      const premiumPlans = InvestmentPlanService.getPremiumPlans().map(plan => ({
        ...plan,
        daily: plan.dailyIncome,
        total: plan.totalReturn,
        days: plan.cycleDays,
        imageUrl: `/images/premium_${plan.id.split('-')[1]}.jpg.jpg?t=${Date.now()}`
      }));

      setProducts({
        basic: basicPlans,
        special: specialPlans,
        premium: premiumPlans
      });

      // Check if user can access special plans
      if (user) {
        const canAccess = await InvestmentPlanService.canAccessSpecialPlans(user.uid);
        setCanAccessSpecialPlans(canAccess);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [user]);

  // Function to refresh product availability
  const refreshAvailability = useCallback(async () => {
    console.log('Refreshing availability...');
    // Force reload of products to get updated availability
    await loadProducts();
    // Also force a re-render by updating the refresh key
    setRefreshKey(prev => prev + 1);
  }, [loadProducts]);

  useEffect(() => {
    console.log('useEffect triggered - user:', user?.uid, 'userData:', !!userData);
    
    if (user) {
      loadProducts();
    }
  }, [user, userData, loadProducts]);

  return (
    <div className="space-y-6">
       <InfoPopup open={showPopup} onOpenChange={setShowPopup} />
      <div className="relative h-48 w-full rounded-2xl overflow-hidden">
        <Image
          src="/images/promo-banner.png"
          alt="Promotional Banner"
          fill={true}
          className="object-cover"
          data-ai-hint="promotion business"
        />
      </div>

               <div className="grid grid-cols-4 gap-4">
          <Link href="/dashboard/recharge" className="block">
             <Card className="bg-card/50 hover:bg-card/90 transition-colors text-card-foreground p-4 flex flex-col items-center justify-center gap-2 rounded-2xl aspect-square">
              <div className="bg-primary text-primary-foreground p-3 rounded-xl">
                <RefreshCw size={24} />
              </div>
              <p className="font-medium text-sm">Recharge</p>
            </Card>
          </Link>
           <Link href="/dashboard/withdraw" className="block">
             <Card className="bg-card/50 hover:bg-card/90 transition-colors text-card-foreground p-4 flex flex-col items-center justify-center gap-2 rounded-2xl aspect-square">
              <div className="bg-primary text-primary-foreground p-3 rounded-xl">
                <SlidersHorizontal size={24} />
              </div>
              <p className="font-medium text-sm">Withdraw</p>
            </Card>
          </Link>
           <Link href="/dashboard/earnings" className="block">
             <Card className="bg-card/50 hover:bg-card/90 transition-colors text-card-foreground p-4 flex flex-col items-center justify-center gap-2 rounded-2xl aspect-square">
              <div className="bg-primary text-primary-foreground p-3 rounded-xl">
                <BarChart2 size={24} />
              </div>
              <p className="font-medium text-sm">Earnings</p>
            </Card>
          </Link>

           <Link href="/dashboard/share" className="block">
             <Card className="bg-card/50 hover:bg-card/90 transition-colors text-card-foreground p-4 flex flex-col items-center justify-center gap-2 rounded-2xl aspect-square">
              <div className="bg-primary text-primary-foreground p-3 rounded-xl">
                <Users size={24} />
              </div>
              <p className="font-medium text-sm">Share</p>
            </Card>
          </Link>
        </div>

        <Card className="bg-gradient-to-r from-primary/20 to-primary/10 border-primary/20">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/20 rounded-lg">
                            <Banknote className="text-primary" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Account Balance</h3>
                            <p className="text-sm text-muted-foreground">Available funds</p>
                        </div>
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-3xl font-bold text-primary">₦{(userData?.balance || 0).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mt-1">Total Balance</p>
                </div>
            </CardContent>
        </Card>

        {userData?.hasDeposited ? (
            <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/20 rounded-lg">
                            <CalendarCheck className="text-primary" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Daily Check-in</h3>
                            {canCheckIn ? (
                                <p className="text-sm text-muted-foreground">Earn ₦50 daily bonus!</p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Next check-in available in: {timeRemaining ? 
                                        `${timeRemaining.hours.toString().padStart(2, '0')}:${timeRemaining.minutes.toString().padStart(2, '0')}:${timeRemaining.seconds.toString().padStart(2, '0')}` : 
                                        '00:00:00'
                                    }
                                </p>
                            )}
                        </div>
                    </div>
                    <Button onClick={handleCheckIn} disabled={!canCheckIn}>
                        {canCheckIn ? 'Check-in' : 'Checked-in'}
                    </Button>
                </CardContent>
            </Card>
        ) : (
            <Card className="bg-muted/50 border-muted">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-muted rounded-lg">
                            <CalendarCheck className="text-muted-foreground" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-muted-foreground">Daily Check-in</h3>
                            <p className="text-sm text-muted-foreground">Make a deposit to unlock daily bonuses</p>
                        </div>
                    </div>
                    <Button disabled variant="outline">Deposit Required</Button>
                </CardContent>
            </Card>
        )}

        <div>
            <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-card/50">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="special">Special</TabsTrigger>
                <TabsTrigger value="premium">Premium</TabsTrigger>
            </TabsList>
            <TabsContent value="basic">
                <div className="grid grid-cols-2 gap-4 mt-6">
                    {isLoadingProducts ? (
                        <div className="col-span-full text-center py-8">
                            <p>Loading products...</p>
                        </div>
                    ) : products.basic.length === 0 ? (
                        <div className="col-span-full text-center py-8">
                            <p>No Basic plans available at the moment.</p>
                        </div>
                    ) : (
                        products.basic.map(product => (
                        <ProductCard key={product.id} product={product} onInvest={handleInvest} refreshAvailability={refreshAvailability} refreshKey={refreshKey} />
                        ))
                    )}
                </div>
            </TabsContent>
            <TabsContent value="special">
                <div className="grid grid-cols-2 gap-4 mt-6">
                    {isLoadingProducts ? (
                        <div className="col-span-full text-center py-8">
                            <p>Loading products...</p>
                        </div>
                    ) : products.special.length === 0 ? (
                        <div className="col-span-full text-center py-8">
                            <p>No Special plans available at the moment.</p>

                        </div>
                    ) : (
                        products.special.map(product => (
                        <ProductCard key={product.id} product={product} onInvest={handleInvest} refreshAvailability={refreshAvailability} refreshKey={refreshKey} />
                        ))
                    )}
                </div>
            </TabsContent>
            <TabsContent value="premium">
                <div className="grid grid-cols-2 gap-4 mt-6">
                    {isLoadingProducts ? (
                        <div className="col-span-full text-center py-8">
                            <p>Loading products...</p>
                        </div>
                    ) : products.premium.length === 0 ? (
                        <div className="col-span-full text-center py-8">
                            <p>No Premium plans available at the moment.</p>

                        </div>
                    ) : (
                        products.premium.map(product => (
                        <ProductCard key={product.id} product={product} onInvest={handleInvest} refreshAvailability={refreshAvailability} refreshKey={refreshKey} />
                        ))
                    )}
                </div>
            </TabsContent>
            </Tabs>
        </div>
   </div>
  );
}
