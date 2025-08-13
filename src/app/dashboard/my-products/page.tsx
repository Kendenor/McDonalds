
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

    console.log('[PRODUCTS] Setting up real-time listener for user:', user.uid);
    
    const unsubscribe = ProductService.onProductsChange(user.uid, (products) => {
      console.log('[PRODUCTS] Real-time update received:', products.length, 'products');
      setPurchasedProducts(products);
      
      // Load tasks for new products
      if (products.length > 0) {
        loadProductTasks(products);
      }
    });

    return () => {
      console.log('[PRODUCTS] Cleaning up real-time listener');
      unsubscribe();
    };
  }, [user]);

  // Fallback: automatically stop loading after 15 seconds to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.log('[PRODUCTS] Loading timeout reached, forcing loading to false');
        setLoading(false);
        setLoadingTasks(false);
      }, 15000);
      
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  useEffect(() => {
    // Update countdowns every minute
    const interval = setInterval(updateCountdowns, 60000);
    return () => clearInterval(interval);
  }, [productTasks]);

  const loadPurchasedProducts = async () => {
    if (!user) {
      console.log('[PRODUCTS] No user, skipping load');
      return;
    }
    
    try {
      setLoading(true);
      console.log('[PRODUCTS] Starting to load products for user:', user.uid);
      
      // Load products with timeout protection
      const products = await ProductService.getUserProducts(user.uid);
      console.log('[PRODUCTS] Products loaded successfully:', products.length, 'products');
      
      // Set products immediately
      setPurchasedProducts(products);
      
      // If no products, stop loading immediately
      if (products.length === 0) {
        console.log('[PRODUCTS] No products found, setting loading to false');
        setLoading(false);
        return;
      }
      
      // If products exist, load tasks in background
      console.log('[PRODUCTS] Loading tasks for', products.length, 'products');
      setLoadingTasks(true);
      
      try {
        await loadProductTasks(products);
        console.log('[PRODUCTS] Tasks loaded successfully');
      } catch (taskError) {
        console.error('[PRODUCTS] Error loading tasks:', taskError);
      } finally {
        setLoadingTasks(false);
      }
      
      // Always set loading to false after products are loaded
      setLoading(false);
      console.log('[PRODUCTS] All loading completed');
      
    } catch (error) {
      console.error('[PRODUCTS] Failed to load products:', error);
      setPurchasedProducts([]);
      setLoading(false);
    }
  };

  const loadProductTasks = async (products: PurchasedProduct[]) => {
    if (!user) return;
    
    const tasksMap = new Map<string, ProductTask>();
    const statusesMap = new Map<string, TaskStatus>();
    const productTaskService = new ProductTaskService();
    
    for (const product of products) {
      try {
        const task = await productTaskService.getProductTask(user.uid, product.id);
        if (task) {
          tasksMap.set(product.id, task);
          
          // Get task status
          const status = await productTaskService.canCompleteProductTask(user.uid, product.id);
          statusesMap.set(product.id, status);
        }
      } catch (error) {
        console.error(`Failed to load task for product ${product.id}:`, error);
      }
    }
    
    setProductTasks(tasksMap);
    setTaskStatuses(statusesMap);
    updateCountdowns();
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
          const updatedTask = { ...task, completedActions: result.progress / 20 }; // 20% per action
          setProductTasks(new Map(productTasks.set(productId, updatedTask)));
          
          // Update task status
          const status = await productTaskService.canCompleteProductTask(user.uid, productId);
          setTaskStatuses(new Map(taskStatuses.set(productId, status)));
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
          const updatedTask = { 
            ...task, 
            totalEarned: task.totalEarned + (result.reward || 0),
            cycleDaysCompleted: task.cycleDaysCompleted + 1,
            completedActions: 0,
            currentActionStep: 1,
            lastCompletedAt: new Date()
          };
          setProductTasks(new Map(productTasks.set(productId, updatedTask)));
          
          // Update task status
          const status = await productTaskService.canCompleteProductTask(user.uid, productId);
          setTaskStatuses(new Map(taskStatuses.set(productId, status)));
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
                        {product.planType === 'Special' && task ? (
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
                        ) : product.planType === 'Special' && !task ? (
                          // Special plan but no task created yet
                          <div className="text-center p-4 border rounded-lg">
                            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Task system initializing...</p>
                          </div>
                        ) : (product.planType === 'Basic' || product.planType === 'Premium') ? (
                          // Basic and Premium plans: Show tasks when cycle ends
                          isCycleEnded(product) && task ? (
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
                            // Cycle not ended yet - show locked message
                            <div className="text-center p-4 border rounded-lg">
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <Lock className="h-6 w-6 text-muted-foreground" />
                                <span className="font-medium">Tasks Locked</span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                Tasks will be available when your {product.planType} plan cycle ends
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
