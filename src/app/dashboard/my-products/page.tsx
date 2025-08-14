
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserService, ProductService } from '@/lib/user-service';
import { ProductTaskService } from '@/lib/product-task-service';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Clock, CheckCircle, XCircle, AlertCircle, Trophy, Target, Zap, Lock } from 'lucide-react';

interface PurchasedProduct {
  id: string;
  userId: string;
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  dailyEarning: number;
  totalEarning: number;
  daysCompleted: number;
  totalDays: number;
  purchaseDate: string;
  status: 'Active' | 'Completed';
  planType: 'Basic' | 'Special' | 'Premium';
  cycleDays: number;
  dailyROI: number;
  startDate: string;
  endDate: string;
  totalEarned: number;
  lastPayoutDate?: string;
  isLocked: boolean;
}

interface ProductTask {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  dailyReward: number;
  maxCompletions: number;
  completionsToday: number;
  lastCompletedAt: Date | null;
  cycleDays: number;
  cycleDaysCompleted: number;
  totalEarned: number;
  totalExpected: number;
  isExpired: boolean;
  nextAvailableTime: Date | null;
  requiredActions: number;
  completedActions: number;
  currentActionStep: number;
  actionTypes: string[];
  lastActionTime: Date | null;
}

interface TaskStatus {
  canComplete: boolean;
  message: string;
  hoursRemaining?: number;
  minutesRemaining?: number;
  progress: number;
  remainingActions: number;
}

const ACTION_DESCRIPTIONS = {
  view_earnings: 'View your earnings',
  check_balance: 'Check your balance',
  read_news: 'Read investment news',
  update_profile: 'Update your profile',
  share_platform: 'Share the platform'
};

const ACTION_ICONS = {
  view_earnings: Trophy,
  check_balance: Target,
  read_news: AlertCircle,
  update_profile: CheckCircle,
  share_platform: Zap
};

export default function MyProductsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [purchasedProducts, setPurchasedProducts] = useState<PurchasedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [productTasks, setProductTasks] = useState<Map<string, ProductTask>>(new Map());
  const [taskStatuses, setTaskStatuses] = useState<Map<string, TaskStatus>>(new Map());
  const [countdowns, setCountdowns] = useState<Map<string, { hours: number; minutes: number }>>(new Map());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadPurchasedProducts();
      }
    });
    return () => unsubscribe();
  }, []);

  // Add real-time listener for products
  useEffect(() => {
    if (!user) return;

    const unsubscribe = ProductService.onProductsChange(user.uid, (products) => {
      console.log('[PRODUCTS] Real-time update received:', products.length, 'products');
      
      // Update products with real-time data
      setPurchasedProducts(products);
      
      // Always load tasks when products change
      if (products.length > 0) {
        console.log('[PRODUCTS] Loading tasks for', products.length, 'products');
        loadProductTasks(products);
        
        // Additional check: if any Special plans don't have tasks, try to create them
        const specialPlans = products.filter(p => p.planType === 'Special');
        if (specialPlans.length > 0) {
          console.log('[PRODUCTS] Found Special plans, ensuring tasks exist...');
          setTimeout(() => {
            loadProductTasks(products); // Retry after a short delay
          }, 1000);
        }
      } else {
        console.log('[PRODUCTS] No products, clearing tasks');
        setProductTasks(new Map());
        setTaskStatuses(new Map());
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Fallback: automatically stop loading after 15 seconds to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoading(false);
        setLoadingTasks(false);
      }, 15000);
      
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  // Auto-check for missing tasks every 5 seconds for Special plans
  useEffect(() => {
    if (!user || purchasedProducts.length === 0) return;
    
    const interval = setInterval(() => {
      const specialPlans = purchasedProducts.filter(p => p.planType === 'Special');
      if (specialPlans.length > 0) {
        // Check if any Special plans are missing tasks
        const missingTasks = specialPlans.filter(product => !productTasks.has(product.id));
        if (missingTasks.length > 0) {
          console.log('[PRODUCTS] Auto-check: Found Special plans missing tasks:', missingTasks.map(p => p.name));
          loadProductTasks(missingTasks);
        }
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user, purchasedProducts, productTasks]);

  useEffect(() => {
    // Update countdowns every minute
    const interval = setInterval(updateCountdowns, 60000);
    return () => clearInterval(interval);
  }, [productTasks]);

  const loadPurchasedProducts = async () => {
    if (!user) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Load products directly
      const products = await ProductService.getUserProducts(user.uid);
      
      // Set products immediately
      setPurchasedProducts(products);
      
      // If no products, stop loading immediately
      if (products.length === 0) {
        setLoading(false);
        return;
      }
      
      // If products exist, load tasks in background
      setLoadingTasks(true);
      
      try {
        await loadProductTasks(products);
      } catch (taskError) {
        console.error('[PRODUCTS] Error loading tasks:', taskError);
      } finally {
        setLoadingTasks(false);
      }
      
      // Always set loading to false after products are loaded
      setLoading(false);
      
    } catch (error) {
      console.error('[PRODUCTS] Failed to load products:', error);
      setPurchasedProducts([]);
      setLoading(false);
    }
  };

  const loadProductTasks = async (products: PurchasedProduct[], retryCount = 0) => {
    if (!user) return;
    
    console.log('[PRODUCTS] Loading tasks for', products.length, 'products (attempt', retryCount + 1, ')');
    
    const tasksMap = new Map<string, ProductTask>();
    const statusesMap = new Map<string, TaskStatus>();
    const productTaskService = new ProductTaskService();
    
    for (const product of products) {
      try {
        console.log(`[PRODUCTS] Loading task for product: ${product.name} (${product.id})`);
        console.log(`[PRODUCTS] Product details:`, {
          id: product.id,
          name: product.name,
          planType: product.planType,
          status: product.status
        });

        let task = await productTaskService.getProductTask(user.uid, product.id);
        
        if (task) {
          console.log(`[PRODUCTS] Task found for ${product.name}:`, task);
          tasksMap.set(product.id, task);
          
          // Get task status
          const status = await productTaskService.canCompleteProductTask(user.uid, product.id);
          statusesMap.set(product.id, status);
          console.log(`[PRODUCTS] Task status for ${product.name}:`, status);
        } else {
          console.log(`[PRODUCTS] No task found for ${product.name} (${product.id})`);
          
          // For Special plans, try to create the task if it doesn't exist
          if (product.planType === 'Special') {
            console.log(`[PRODUCTS] Attempting to create missing task for Special plan: ${product.name}`);
            try {
              const newTask = await productTaskService.createProductTask(
                user.uid,
                product.id,
                product.name,
                product.totalEarning,
                product.cycleDays
              );
              console.log(`[PRODUCTS] Successfully created missing task:`, newTask);
              
              if (newTask) {
                tasksMap.set(product.id, newTask);
                
                // Get task status for new task
                const status = await productTaskService.canCompleteProductTask(user.uid, product.id);
                statusesMap.set(product.id, status);
                
                console.log(`[PRODUCTS] Task created and status loaded for ${product.name}:`, status);
              } else {
                console.error(`[PRODUCTS] Task creation returned null for ${product.name}`);
              }
            } catch (createError) {
              console.error(`[PRODUCTS] Failed to create missing task for ${product.name}:`, createError);
              
              // Try to create task again after a short delay
              setTimeout(async () => {
                try {
                  console.log(`[PRODUCTS] Retrying task creation for ${product.name} after error...`);
                  const retryTask = await productTaskService.createProductTask(
                    user.uid,
                    product.id,
                    product.name,
                    product.totalEarning,
                    product.cycleDays
                  );
                  if (retryTask) {
                    console.log(`[PRODUCTS] Retry successful for ${product.name}:`, retryTask);
                    setProductTasks(prev => new Map(prev.set(product.id, retryTask)));
                    const retryStatus = await productTaskService.canCompleteProductTask(user.uid, product.id);
                    setTaskStatuses(prev => new Map(prev.set(product.id, retryStatus)));
                  }
                } catch (retryError) {
                  console.error(`[PRODUCTS] Retry failed for ${product.name}:`, retryError);
                }
              }, 2000);
            }
          }
        }
      } catch (error) {
        console.error(`[PRODUCTS] Failed to load task for product ${product.id}:`, error);
      }
    }
    
    console.log('[PRODUCTS] Final tasks map:', tasksMap.size, 'tasks loaded');
    console.log('[PRODUCTS] Final statuses map:', statusesMap.size, 'statuses loaded');
    
    setProductTasks(tasksMap);
    setTaskStatuses(statusesMap);
    updateCountdowns();
    
    // Show notification if tasks were loaded
    if (tasksMap.size > 0) {
      console.log('[PRODUCTS] Successfully loaded', tasksMap.size, 'tasks');
      
      // Show success notification
      const specialPlans = products.filter(p => p.planType === 'Special');
      if (specialPlans.length > 0) {
        console.log('[PRODUCTS] Special plans found:', specialPlans.map(p => p.name));
      }
    } else {
      console.warn('[PRODUCTS] No tasks were loaded for any products');
      
      // Retry multiple times with increasing delays for Special plans
      if (retryCount < 3) {
        const delay = (retryCount + 1) * 2000; // 2s, 4s, 6s
        console.log(`[PRODUCTS] No tasks found, retrying after ${delay/1000} seconds... (attempt ${retryCount + 1}/3)`);
        setTimeout(() => {
          loadProductTasks(products, retryCount + 1);
        }, delay);
      } else {
        console.error('[PRODUCTS] Failed to load tasks after 3 attempts');
      }
    }
  };

  const updateCountdowns = () => {
    const countdownsMap = new Map<string, { hours: number; minutes: number }>();
    
    productTasks.forEach((task, productId) => {
      if (task.nextAvailableTime) {
        const now = new Date();
        const timeRemaining = task.nextAvailableTime.getTime() - now.getTime();
        
        if (timeRemaining > 0) {
          const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
          const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
          countdownsMap.set(productId, { hours, minutes });
        }
      }
    });
    
    setCountdowns(countdownsMap);
  };

  const handleCompleteAction = async (productId: string, actionType: string) => {
    if (!user) return;
    
    try {
      const productTaskService = new ProductTaskService();
      const result = await productTaskService.completeTaskAction(user.uid, productId, actionType);
      
      if (result.success) {
        // Update the task in state
        const task = productTasks.get(productId);
        if (task) {
          // Reload the task to get the updated state from database
          const updatedTask = await productTaskService.getProductTask(user.uid, productId);
          if (updatedTask) {
          setProductTasks(new Map(productTasks.set(productId, updatedTask)));
          
          // Update task status
          const status = await productTaskService.canCompleteProductTask(user.uid, productId);
          setTaskStatuses(new Map(taskStatuses.set(productId, status)));
            
            // Show user-facing toast instead of console
            alert('Action completed!');
          } else {
            alert('Action completed!');
          }
        }
        
        // Show success message
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Failed to complete action:', error);
      alert('Failed to complete action. Please try again.');
    }
  };

  const handleCompleteTask = async (productId: string) => {
    if (!user) return;
    
    try {
      const productTaskService = new ProductTaskService();
      const result = await productTaskService.completeProductTask(user.uid, productId);
      
      if (result.success) {
        // Update the task in state
        const task = productTasks.get(productId);
        if (task) {
          // Reload the task to get the updated state from database
          const updatedTask = await productTaskService.getProductTask(user.uid, productId);
          if (updatedTask) {
          setProductTasks(new Map(productTasks.set(productId, updatedTask)));
          
          // Update task status
          const status = await productTaskService.canCompleteProductTask(user.uid, productId);
          setTaskStatuses(new Map(taskStatuses.set(productId, status)));
            
            // Inform user about reward
            alert(`Daily task completed! Reward added to your balance.`);
          } else {
            alert(`Daily task completed! Reward added to your balance.`);
          }
        }
        
        // Show success message
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert('Failed to complete task. Please try again.');
    }
  };

  const handleClaimReturns = async (productId: string) => {
    if (!user) return;

    try {
      const result = await ProductService.claimReturns(user.uid, productId);

      if (result.success) {
        alert(result.message);
        // Refresh the product list to show updated status
        loadPurchasedProducts();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Failed to claim returns:', error);
      alert('Failed to claim returns. Please try again.');
    }
  };

  const getActionButtonText = (productId: string, actionType: string): string => {
    const task = productTasks.get(productId);
    if (!task) return 'Action';
    
    const actionIndex = task.actionTypes.indexOf(actionType);
    if (task.completedActions > actionIndex) {
      return 'Completed';
    }
    
    return ACTION_DESCRIPTIONS[actionType as keyof typeof ACTION_DESCRIPTIONS] || 'Action';
  };

  const isActionCompleted = (productId: string, actionType: string): boolean => {
    const task = productTasks.get(productId);
    if (!task) return false;
    
    const actionIndex = task.actionTypes.indexOf(actionType);
    return task.completedActions > actionIndex;
  };

  const isCycleEnded = (product: PurchasedProduct): boolean => {
    const now = new Date();
    const endDate = new Date(product.endDate);
    return now >= endDate;
  };

  const getActionButtonVariant = (productId: string, actionType: string): "default" | "secondary" | "outline" => {
    if (isActionCompleted(productId, actionType)) {
      return "secondary";
    }
    return "outline";
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your products...</p>
            <p className="text-xs text-muted-foreground mt-2">This may take a few seconds</p>
            <p className="text-xs text-muted-foreground">If this takes too long, please refresh the page</p>
          </div>
        </div>
      </div>
    );
  }

  if (purchasedProducts.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Products Yet</h2>
            <p className="text-muted-foreground mb-4">
              You haven't purchased any investment products yet.
            </p>
            <Button onClick={() => window.history.back()}>
              Browse Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">My Products</h1>
          <Button 
            onClick={() => {
              console.log('[DEBUG] Manual task creation triggered');
              const specialPlans = purchasedProducts.filter(p => p.planType === 'Special');
              if (specialPlans.length > 0) {
                console.log('[DEBUG] Found Special plans:', specialPlans);
                loadProductTasks(specialPlans);
              }
            }}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Debug: Create Tasks
          </Button>
        </div>
        <p className="text-muted-foreground">
          Manage your investments and complete daily tasks to earn rewards
        </p>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active ({purchasedProducts.filter(p => p.status === 'Active').length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({purchasedProducts.filter(p => p.status === 'Completed').length})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({purchasedProducts.filter(p => p.status === 'Completed' && p.daysCompleted >= p.totalDays).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {purchasedProducts
            .filter(product => product.status === 'Active')
            .map(product => {
              const task = productTasks.get(product.id);
              const status = taskStatuses.get(product.id);
              const countdown = countdowns.get(product.id);
              
              // Debug logging for Special plans
              if (product.planType === 'Special') {
                console.log(`[PRODUCTS] Special plan ${product.name}:`, {
                  productId: product.id,
                  hasTask: !!task,
                  task: task,
                  status: status,
                  productData: {
                    name: product.name,
                    planType: product.planType,
                    status: product.status,
                    startDate: product.startDate
                  }
                });
              }
              
              return (
                <Card key={product.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{product.name}</CardTitle>
                      <Badge variant="secondary" className="text-sm">
                        {product.cycleDays} Days
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Product Details */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Investment</p>
                            <p className="text-lg font-semibold">₦{product.price.toLocaleString()}</p>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Daily Income</p>
                            <p className="text-lg font-semibold">₦{product.dailyEarning.toLocaleString()}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Total Return</p>
                            <p className="text-lg font-semibold">₦{product.totalEarning.toLocaleString()}</p>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Start Date</p>
                            <p className="text-sm font-medium">{new Date(product.startDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Daily Task Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">Daily Task</h3>
                          {loadingTasks && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          )}
                        </div>
                        
                        {/* Special Plans: Always show tasks with 24-hour countdown */}
                        {product.planType === 'Special' ? (
                          task ? (
                          <>
                            {/* Task Progress */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span>Task Progress</span>
                                <span>{task.completedActions}/{task.requiredActions} Actions</span>
                              </div>
                              <Progress value={(task.completedActions / task.requiredActions) * 100} className="h-2" />
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-2">
                              {task.actionTypes.map((actionType, index) => {
                                const IconComponent = ACTION_ICONS[actionType as keyof typeof ACTION_ICONS];
                                const isCompleted = isActionCompleted(product.id, actionType);
                                
                                return (
                                  <Button
                                    key={actionType}
                                    variant={getActionButtonVariant(product.id, actionType)}
                                    size="sm"
                                    onClick={() => handleCompleteAction(product.id, actionType)}
                                    disabled={isCompleted}
                                    className="h-10 text-xs"
                                  >
                                    {IconComponent && <IconComponent className="h-3 w-3 mr-1" />}
                                    {getActionButtonText(product.id, actionType)}
                                  </Button>
                                );
                              })}
                            </div>

                            {/* Task Completion */}
                            <div className="pt-3 border-t">
                              {status?.canComplete ? (
                                <Button 
                                  onClick={() => handleCompleteTask(product.id)}
                                  className="w-full"
                                  size="sm"
                                >
                                  <Trophy className="h-4 w-4 mr-2" />
                                  Complete Daily Task (₦{task.dailyReward.toLocaleString()})
                                </Button>
                              ) : (
                                <div className="text-center">
                                  {countdown ? (
                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                      <Clock className="h-4 w-4" />
                                      <span>Locked for {countdown.hours}h {countdown.minutes}m</span>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">{status?.message}</p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Task Stats */}
                            <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Earned Today</p>
                                <p className="text-sm font-medium">₦{task.totalEarned.toLocaleString()}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Expected Total</p>
                                <p className="text-sm font-medium">₦{task.totalExpected.toLocaleString()}</p>
                              </div>
                            </div>
                          </>
                          ) : (
                            // Special plan but no task - show loading or error state
                            <div className="text-center p-4 border rounded-lg">
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <AlertCircle className="h-6 w-6 text-orange-500" />
                                <span className="font-medium text-orange-600">Task Not Found</span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                The daily task system for this Special plan could not be loaded. This might be due to:
                              </p>
                              <ul className="text-xs text-muted-foreground mb-4 text-left space-y-1">
                                <li>• Task creation is still in progress</li>
                                <li>• Database connection issue</li>
                                <li>• Task was not created during purchase</li>
                              </ul>
                              <div className="space-y-2">
                                <Button 
                                  onClick={() => {
                                    console.log('[PRODUCTS] Going back to dashboard to re-purchase');
                                    window.location.href = '/dashboard';
                                  }}
                                  variant="secondary"
                                  size="sm"
                                  className="w-full"
                                >
                                  Back to Dashboard
                                </Button>
                              </div>
                            </div>
                          )
                        ) : product.planType === 'Basic' || product.planType === 'Premium' ? (
                          // Basic and Premium plans: Show claim button when cycle ends
                          isCycleEnded(product) ? (
                            <>
                              {/* Cycle Completed - Show Claim Button */}
                              <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                                <div className="flex items-center justify-center gap-2 mb-3">
                                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                  <span className="font-medium text-green-800 dark:text-green-200">Cycle Completed!</span>
                                </div>
                                <p className="text-sm text-green-600 dark:text-green-300 mb-4">
                                  Your {product.planType} plan cycle has ended. You can now claim your total returns.
                                </p>
                                <div className="space-y-2 mb-4">
                                  <div className="flex justify-between text-sm">
                                    <span>Investment Amount:</span>
                                    <span className="font-medium">₦{product.price.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Total Returns:</span>
                                    <span className="font-medium text-green-600">₦{product.totalEarning.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm font-medium">
                                    <span>Profit:</span>
                                    <span className="text-green-600">₦{(product.totalEarning - product.price).toLocaleString()}</span>
                                  </div>
                                </div>
                                <Button 
                                  onClick={() => handleClaimReturns(product.id)}
                                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                                  size="sm"
                                >
                                  <Trophy className="h-4 w-4 mr-2" />
                                  Claim Returns (₦{product.totalEarning.toLocaleString()})
                                </Button>
                              </div>
                            </>
                          ) : (
                            // Cycle not ended yet - show locked message
                            <div className="text-center p-4 border rounded-lg">
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <Lock className="h-6 w-6 text-muted-foreground" />
                                <span className="font-medium">Cycle in Progress</span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                Your {product.planType} plan is still running. Claim button will appear when cycle ends.
                              </p>
                              <div className="text-xs text-muted-foreground">
                                <p>Cycle Progress: {product.daysCompleted}/{product.totalDays} days</p>
                                <p>End Date: {new Date(product.endDate).toLocaleDateString()}</p>
                                {!isCycleEnded(product) && (
                                  <p className="mt-2 text-orange-500">
                                    ⏰ Cycle ends in {Math.ceil((new Date(product.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        ) : (
                          // Fallback for unknown plan types
                          <div className="text-center p-4 border rounded-lg">
                            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No task available for this product</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          {purchasedProducts
            .filter(product => product.status === 'Completed')
            .map(product => (
              <Card key={product.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{product.name}</CardTitle>
                    <Badge variant="default">Completed</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Investment</p>
                      <p className="text-lg font-semibold">₦{product.price.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Return</p>
                      <p className="text-lg font-semibold">₦{product.totalEarning.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="text-sm">{new Date(product.startDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="text-sm">{new Date(product.endDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="expired" className="space-y-6">
          {purchasedProducts
            .filter(product => product.status === 'Completed' && product.daysCompleted >= product.totalDays)
            .map(product => (
              <Card key={product.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{product.name}</CardTitle>
                    <Badge variant="destructive">Expired</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Investment</p>
                      <p className="text-lg font-semibold">₦{product.price.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Return</p>
                      <p className="text-lg font-semibold">₦{product.totalEarning.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="text-sm">{new Date(product.startDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="text-sm">{new Date(product.endDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
