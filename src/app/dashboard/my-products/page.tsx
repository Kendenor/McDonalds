
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Package, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Progress } from "@/components/ui/progress"
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ProductService, ClaimService, UserService } from '@/lib/user-service';
import { ProductTaskService } from '@/lib/product-task-service';

function PurchasedProductCard({
  product,
  onClaim,
  claimedToday
}: {
  product: any;
  onClaim: (productId: string, dailyEarning: number) => void;
  claimedToday: boolean;
}) {
  const [productTask, setProductTask] = useState<any>(null);
  const [taskStatus, setTaskStatus] = useState<{ canComplete: boolean; message: string; timeRemaining?: number } | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(false);
  const { toast } = useToast();
  const { name, imageUrl, dailyEarning, totalEarning, daysCompleted, totalDays, id, planType, isLocked, endDate } = product;
  const progress = (daysCompleted / totalDays) * 100;
  
  // Calculate if product is locked (Basic and Premium should be locked until cycle ends)
  const isProductLocked = (planType === 'Basic' || planType === 'Premium') && isLocked;
  
  // Calculate remaining time for countdown
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  useEffect(() => {
    if (!isProductLocked) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(endDate);
      const diff = end.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Unlocked');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [isProductLocked, endDate]);

  // Load product task and check status
  useEffect(() => {
    const loadProductTask = async () => {
      try {
        const userTasks = await ProductTaskService.getUserProductTasks(product.userId);
        const task = userTasks.find(t => t.productId === product.productId);
        setProductTask(task);
        
        if (task) {
          const status = await ProductTaskService.canCompleteProductTask(task.id);
          setTaskStatus(status);
        }
      } catch (error) {
        console.error('Error loading product task:', error);
      }
    };

    if (product.userId) {
      loadProductTask();
    }
  }, [product.userId, product.productId]);

  const handleCompleteTask = async () => {
    if (!productTask) return;
    
    setIsLoadingTask(true);
    try {
      const result = await ProductTaskService.completeProductTask(productTask.id);
      
      if (result.success) {
        toast({ 
          title: "Task Completed!", 
          description: result.message 
        });
        
        // Refresh task status
        const status = await ProductTaskService.canCompleteProductTask(productTask.id);
        setTaskStatus(status);
      } else {
        toast({ 
          variant: "destructive", 
          title: "Task Failed", 
          description: result.message 
        });
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Failed to complete task. Please try again." 
      });
    } finally {
      setIsLoadingTask(false);
    }
  };

  return (
    <Card className="bg-card/50 overflow-hidden rounded-2xl w-full">
        <div className="p-4 space-y-4">
            <div className="flex gap-4 items-center">
                 <div className="relative h-20 w-20 rounded-lg overflow-hidden shrink-0">
                    <Image
                        src={imageUrl}
                        alt={name}
                        fill={true}
                        className="object-cover"
                        data-ai-hint="product corporate"
                        onError={(e) => {
                            // Fallback to a default image if the product image fails to load
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/promo-banner.png';
                        }}
                    />
                </div>
                <div className='w-full space-y-2'>
                    <h3 className="text-md font-bold text-primary">{name}</h3>
                     <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <p className="text-muted-foreground flex items-center gap-1"><DollarSign size={12}/>Daily: <span className="font-semibold text-foreground">₦{dailyEarning.toLocaleString()}</span></p>
                        <p className="text-muted-foreground flex items-center gap-1"><DollarSign size={12}/>Total: <span className="font-semibold text-foreground">₦{totalEarning.toLocaleString()}</span></p>
                    </div>
                </div>
            </div>
           
            <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>Day {daysCompleted}/{totalDays}</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {isProductLocked ? (
              <div className="space-y-2">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
                  <p className="text-sm text-orange-400 font-medium">🔒 Product Locked</p>
                  <p className="text-xs text-orange-300">Unlocks in: {timeRemaining}</p>
                </div>
                <Button 
                  className="w-full bg-gray-500/20 text-gray-400 cursor-not-allowed" 
                  disabled={true}
                >
                  Locked Until Cycle Ends
                </Button>
              </div>
            ) : (
              <Button 
                className="w-full bg-primary/20 hover:bg-primary/30 text-primary font-bold disabled:bg-green-500/20 disabled:text-green-400 disabled:cursor-not-allowed" 
                onClick={() => onClaim(id, dailyEarning)}
                disabled={claimedToday}
              >
                {claimedToday ? <><CheckCircle className="mr-2"/> Claimed</> : "Claim Earnings"}
              </Button>
            )}

            {/* Product Daily Task Section */}
            {productTask && (
              <div className="space-y-2 mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-primary">Daily Task</h4>
                  {productTask.totalEarned > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ₦{productTask.totalEarned.toLocaleString()} / ₦{productTask.totalExpected.toLocaleString()}
                    </span>
                  )}
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-xs text-blue-400 font-medium mb-1">
                    {productTask.title}
                  </p>
                  <p className="text-xs text-blue-300 mb-2">
                    {productTask.description}
                  </p>
                  
                  {taskStatus && (
                    <div className="space-y-2">
                      {taskStatus.canComplete ? (
                        <Button 
                          className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-bold"
                          onClick={handleCompleteTask}
                          disabled={isLoadingTask}
                        >
                          {isLoadingTask ? 'Completing...' : `Complete Task (₦${productTask.reward})`}
                        </Button>
                      ) : (
                        <div className="text-center">
                          <p className="text-xs text-orange-400 font-medium">
                            {taskStatus.message}
                          </p>
                          {taskStatus.timeRemaining && (
                            <p className="text-xs text-orange-300">
                              Available in {taskStatus.timeRemaining} hours
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
      </div>
    </Card>
  );
}


export default function MyProductsPage() {
    const [purchasedProducts, setPurchasedProducts] = useState<any[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const { toast } = useToast();
    const [claimedProducts, setClaimedProducts] = useState<string[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Load products from Firestore
                try {
                    const products = await ProductService.getUserProducts(currentUser.uid);
                    setPurchasedProducts(products);
                } catch (error) {
                    console.error('Error loading products:', error);
                }

                // Check claims for today
                const today = new Date().toISOString().split('T')[0];
                try {
                    const todayClaims = await ClaimService.getUserClaimsForDate(currentUser.uid, today);
                    setClaimedProducts(todayClaims.map(claim => claim.productId));
                } catch (error) {
                    console.error('Error loading claims:', error);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const handleClaimEarnings = async (productId: string, dailyEarning: number) => {
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];
        
        // Check if already claimed today
        const hasClaimed = await ClaimService.hasClaimedToday(user.uid, productId);
        if (hasClaimed) {
            toast({ variant: 'destructive', title: "Already Claimed", description: "You have already claimed earnings for this product today." });
            return;
        }

        try {
            // Add claim to Firestore
            await ClaimService.addClaim({
                userId: user.uid,
                productId: productId,
                amount: dailyEarning,
                claimDate: new Date().toISOString(),
                dateKey: today
            });

            // Update user balance in Firestore
            const userData = await UserService.getUserById(user.uid);
            if (userData) {
                const newBalance = (userData.balance || 0) + dailyEarning;
                await UserService.saveUser({ ...userData, balance: newBalance });
            }

            // Update local state
            setClaimedProducts(prev => [...prev, productId]);
            
            toast({ title: "Earnings Claimed!", description: `₦${dailyEarning} has been added to your balance.` });
        } catch (error) {
            console.error('Error claiming earnings:', error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to claim earnings. Please try again." });
        }
    };

    return (
    <div className="space-y-4">
        <div className="space-y-4">
            {purchasedProducts.length > 0 ? (
                purchasedProducts.map(product => (
                    <PurchasedProductCard 
                        key={product.id} 
                        product={product}
                        onClaim={handleClaimEarnings}
                        claimedToday={claimedProducts.includes(product.id)}
                    />
                ))
            ) : (
                <Card className="bg-card/50">
                    <CardContent className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-4 bg-primary/10 rounded-full">
                            <Package size={40} className="text-primary"/>
                        </div>
                        <h3 className="text-lg font-semibold">No Products Yet</h3>
                        <p className="text-muted-foreground text-sm">You haven't invested in any products. Start investing to see your products here.</p>
                        <Link href="/dashboard">
                            <Button>Browse Products</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    </div>
  );
}
