'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useToast } from '@/hooks/use-toast';

// Custom hook for real-time countdown and auto-reset
function useSpecialPlanCountdown(task: any, productId: string) {
  const [countdown, setCountdown] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    console.log('[COUNTDOWN-HOOK] Hook triggered for:', { 
      productId, 
      task: task ? { 
        productName: task.productName, 
        completedActions: task.completedActions, 
        lastCompletedAt: task.lastCompletedAt,
        lastCompletedAtType: typeof task.lastCompletedAt
      } : null 
    });
    
    try {
      // Validate task data before proceeding
      if (!task || !productId || typeof productId !== 'string') {
        console.log('[COUNTDOWN] Invalid task or productId:', { task, productId });
        setCountdown(null);
        return;
      }

            console.log('[COUNTDOWN-HOOK] Validation check:', {
        completedActions: task.completedActions,
        completedActionsType: typeof task.completedActions,
        completedActionsEquals5: task.completedActions === 5,
        hasLastCompletedAt: !!task.lastCompletedAt,
        lastCompletedAt: task.lastCompletedAt,
        lastCompletedAtType: typeof task.lastCompletedAt
      });

      if (task.completedActions !== 5 || !task.lastCompletedAt) {
        console.log('[COUNTDOWN] Task validation failed:', { 
          completedActions: task.completedActions,
          completedActionsType: typeof task.completedActions,
          completedActionsEquals5: task.completedActions === 5,
          hasLastCompletedAt: !!task.lastCompletedAt,
          lastCompletedAt: task.lastCompletedAt,
          lastCompletedAtType: typeof task.lastCompletedAt
        });
        setCountdown(null);
        return;
      }
      
      console.log('[COUNTDOWN-HOOK] Task validation passed, proceeding with countdown calculation');

      const updateCountdown = () => {
        console.log('[COUNTDOWN-HOOK] updateCountdown function called');
        try {
          const now = new Date();
          let lastCompletion: Date;

          // Handle different date formats safely
          console.log('[COUNTDOWN-HOOK] Parsing lastCompletedAt:', {
            type: typeof task.lastCompletedAt,
            value: task.lastCompletedAt,
            isDate: task.lastCompletedAt instanceof Date,
            hasSeconds: task.lastCompletedAt && typeof task.lastCompletedAt === 'object' && 'seconds' in task.lastCompletedAt
          });
          
          if (typeof task.lastCompletedAt === 'string') {
            lastCompletion = new Date(task.lastCompletedAt);
            console.log('[COUNTDOWN-HOOK] Parsed as string:', lastCompletion);
          } else if (task.lastCompletedAt instanceof Date) {
            lastCompletion = task.lastCompletedAt;
            console.log('[COUNTDOWN-HOOK] Already a Date:', lastCompletion);
          } else if (task.lastCompletedAt && typeof task.lastCompletedAt === 'object' && 'seconds' in task.lastCompletedAt) {
            // Handle Firestore Timestamp
            lastCompletion = new Date((task.lastCompletedAt as any).seconds * 1000);
            console.log('[COUNTDOWN-HOOK] Parsed as Firestore Timestamp:', lastCompletion);
          } else {
            console.log('[COUNTDOWN] Invalid lastCompletedAt format:', task.lastCompletedAt);
            return;
          }

          // Validate the date
          if (isNaN(lastCompletion.getTime())) {
            console.log('[COUNTDOWN] Invalid date:', lastCompletion);
            return;
          }

          const timeSinceLastCompletion = now.getTime() - lastCompletion.getTime();
          
          // Check if the task was just completed (within 5 seconds)
          // If so, start countdown from 24 hours
          const justCompleted = timeSinceLastCompletion < 5000; // 5 seconds
          
          let hoursRemaining: number;
          if (justCompleted) {
            // Task was just completed, start countdown from 24 hours
            hoursRemaining = 24;
            console.log('[COUNTDOWN-HOOK] Task just completed, starting countdown from 24 hours');
          } else {
            // Calculate remaining time based on actual elapsed time
            hoursRemaining = 24 - (timeSinceLastCompletion / (1000 * 60 * 60));
            console.log('[COUNTDOWN-HOOK] Calculating remaining time based on elapsed time');
          }

          console.log(`[COUNTDOWN-HOOK] ${task.productName}:`, {
            lastCompletion: lastCompletion.toISOString(),
            now: now.toISOString(),
            timeSinceLastCompletion: timeSinceLastCompletion / (1000 * 60 * 60),
            hoursRemaining,
            timeSinceLastCompletionMs: timeSinceLastCompletion,
            justCompleted
          });

          if (hoursRemaining <= 0) {
            // Countdown expired, reset the task
            setCountdown({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
            console.log(`[COUNTDOWN-HOOK] Countdown expired for ${task.productName}`);
            
            // Auto-reset the task in the background
            const resetTask = async () => {
              try {
                if (!auth.currentUser?.uid) {
                  console.log('[COUNTDOWN] No user logged in, skipping auto-reset');
                  return;
                }
                const taskService = new ProductTaskService();
                await taskService.checkAndResetActionsAfterCooldown(auth.currentUser.uid, productId);
                console.log(`[COUNTDOWN] Auto-reset completed for ${task.productName}`);
              } catch (error) {
                console.error(`[COUNTDOWN] Auto-reset failed for ${task.productName}:`, error);
              }
            };
            resetTask();
          } else {
            const totalMinutes = Math.floor(hoursRemaining * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const totalSeconds = Math.floor(hoursRemaining * 3600);
            const seconds = totalSeconds % 60;
            
            setCountdown({ hours, minutes, seconds, isExpired: false });
            console.log(`[COUNTDOWN-HOOK] Set countdown for ${task.productName}:`, { hours, minutes, seconds, hoursRemaining });
          }
        } catch (error) {
          console.error('[COUNTDOWN] Error in updateCountdown:', error);
          setCountdown(null);
        }
      };

      // Update countdown immediately
      updateCountdown();

      // Update countdown every second
      const interval = setInterval(updateCountdown, 1000);

      return () => clearInterval(interval);
    } catch (error) {
      console.error('[COUNTDOWN] Hook error:', error);
      setCountdown(null);
    }
  }, [task, productId]);

  return countdown;
}

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
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [purchasedProducts, setPurchasedProducts] = useState<PurchasedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [productTasks, setProductTasks] = useState<Map<string, ProductTask>>(new Map());
  const [taskStatuses, setTaskStatuses] = useState<Map<string, TaskStatus>>(new Map());
  const [countdowns, setCountdowns] = useState<Map<string, { hours: number; minutes: number; seconds: number }>>(new Map());
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [completingActions, setCompletingActions] = useState<Map<string, Set<string>>>(new Map());
  const [taskMessage, setTaskMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        try {
      setUser(currentUser);
      if (currentUser) {
        loadPurchasedProducts();
          }
        } catch (error) {
          console.error('[AUTH] Error in auth state change handler:', error);
          setError('Authentication error occurred');
      }
    });
    return () => unsubscribe();
    } catch (error) {
      console.error('[AUTH] Error setting up auth listener:', error);
      setError('Failed to initialize authentication');
    }
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
        
        // For Special plans, ensure tasks are created immediately
        const specialPlans = products.filter(p => p.planType === 'Special');
        if (specialPlans.length > 0) {
          console.log('[PRODUCTS] Found Special plans, ensuring tasks exist immediately...');
          
          // Immediate task creation for Special plans
          specialPlans.forEach(async (product) => {
            // Check if task exists in database, not just in local state
            try {
              const productTaskService = new ProductTaskService();
              const existingTask = await productTaskService.getProductTask(user.uid, product.id);
              
              if (existingTask) {
                console.log(`[PRODUCTS] Task already exists in database for ${product.name}:`, existingTask);
                
                // Update UI with existing task
                setProductTasks(prev => new Map(prev.set(product.id, existingTask)));
                
                // Get and set task status
                const status = await productTaskService.canCompleteProductTask(user.uid, product.id);
                setTaskStatuses(prev => new Map(prev.set(product.id, status)));
                
                console.log(`[PRODUCTS] Existing task status set for ${product.name}:`, status);
              } else if (!productTasks.has(product.id)) {
                console.log(`[PRODUCTS] Creating new task for ${product.name}`);
                try {
                  const newTask = await productTaskService.createProductTask(
                    user.uid,
                    product.id,
                    product.name,
                    product.totalEarning,
                    product.cycleDays
                  );
                  
                  if (newTask) {
                    console.log(`[PRODUCTS] Task created immediately for ${product.name}:`, newTask);
                    
                    // Update UI immediately
                    setProductTasks(prev => new Map(prev.set(product.id, newTask)));
                    
                    // Get and set task status
                    const status = await productTaskService.canCompleteProductTask(user.uid, product.id);
                    setTaskStatuses(prev => new Map(prev.set(product.id, status)));
                    
                    console.log(`[PRODUCTS] Task status set for ${product.name}:`, status);
                  }
                } catch (error) {
                  console.error(`[PRODUCTS] Failed to create task immediately for ${product.name}:`, error);
                }
              }
            } catch (error) {
              console.error(`[PRODUCTS] Failed to check existing task for ${product.name}:`, error);
            }
          });
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

  // Auto-check for missing tasks every 3 seconds for Special plans
  useEffect(() => {
    if (!user || purchasedProducts.length === 0) return;
    
    let isMounted = true; // Track if component is still mounted
    
    const interval = setInterval(async () => {
      if (!isMounted) return;
      
      try {
      const specialPlans = purchasedProducts.filter(p => p.planType === 'Special');
      if (specialPlans.length > 0) {
        // Check if any Special plans are missing tasks
        const missingTasks = specialPlans.filter(product => !productTasks.has(product.id));
        if (missingTasks.length > 0) {
          console.log('[PRODUCTS] Auto-check: Found Special plans missing tasks:', missingTasks.map(p => p.name));
          
            // Process missing tasks sequentially to avoid race conditions
            for (const product of missingTasks) {
              if (!isMounted) break; // Stop if component unmounted
              
              try {
                console.log(`[PRODUCTS] Auto-checking for missing task for ${product.name}`);
              const productTaskService = new ProductTaskService();
              const existingTask = await productTaskService.getProductTask(user.uid, product.id);
                
                if (!isMounted) break; // Check again before updating state
              
              if (existingTask) {
                console.log(`[PRODUCTS] Auto-check found existing task for ${product.name}:`, existingTask);
                
                // Update UI with existing task
                setProductTasks(prev => new Map(prev.set(product.id, existingTask)));
                
                // Get and set task status
                const status = await productTaskService.canCompleteProductTask(user.uid, product.id);
                  if (isMounted) {
                setTaskStatuses(prev => new Map(prev.set(product.id, status)));
                console.log(`[PRODUCTS] Auto-check task status set for ${product.name}:`, status);
                  }
              } else {
                console.log(`[PRODUCTS] Auto-check: No existing task found, creating new one for ${product.name}`);
                try {
                  const newTask = await productTaskService.createProductTask(
                    user.uid,
                    product.id,
                    product.name,
                    product.totalEarning,
                    product.cycleDays
                  );
                    
                    if (!isMounted) break; // Check again before updating state
                  
                  if (newTask) {
                    console.log(`[PRODUCTS] Auto-created task for ${product.name}:`, newTask);
                    
                    // Update UI immediately
                    setProductTasks(prev => new Map(prev.set(product.id, newTask)));
                    
                    // Get and set task status
                    const status = await productTaskService.canCompleteProductTask(user.uid, product.id);
                      if (isMounted) {
                    setTaskStatuses(prev => new Map(prev.set(product.id, status)));
                    console.log(`[PRODUCTS] Auto-check task status set for ${product.name}:`, status);
                      }
                  }
                } catch (error) {
                  console.error(`[PRODUCTS] Failed to auto-create task for ${product.name}:`, error);
                }
              }
            } catch (error) {
              console.error(`[PRODUCTS] Failed to auto-check task for ${product.name}:`, error);
            }
        }
          }
        }
      } catch (error) {
        console.error('[PRODUCTS] Auto-check error:', error);
      }
    }, 3000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, purchasedProducts, productTasks]);

  // Real-time countdown timer - update every second for better UX
  useEffect(() => {
    if (productTasks.size === 0) return;
    
    const interval = setInterval(() => {
      updateCountdowns();
    }, 1000); // Update every second for real-time countdown
    
    // Initial update
    updateCountdowns();
    
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
        
        // Initialize countdowns after tasks are loaded
        setTimeout(() => {
          updateCountdowns();
        }, 100);
        
        // Additional immediate task creation for Special plans
        const specialPlans = products.filter(p => p.planType === 'Special');
        if (specialPlans.length > 0) {
          console.log('[PRODUCTS] Initial load: Checking for Special plan tasks...');
          
          for (const product of specialPlans) {
            try {
              const productTaskService = new ProductTaskService();
              const existingTask = await productTaskService.getProductTask(user.uid, product.id);
              
              if (existingTask) {
                console.log(`[PRODUCTS] Found existing task during initial load for ${product.name}:`, existingTask);
                
                // Update UI with existing task
                setProductTasks(prev => new Map(prev.set(product.id, existingTask)));
                
                // Get and set task status
                const status = await productTaskService.canCompleteProductTask(user.uid, product.id);
                setTaskStatuses(prev => new Map(prev.set(product.id, status)));
                
                console.log(`[PRODUCTS] Existing task status set during initial load for ${product.name}:`, status);
              } else if (!productTasks.has(product.id)) {
                console.log(`[PRODUCTS] Creating new task during initial load for ${product.name}`);
                try {
                  const newTask = await productTaskService.createProductTask(
                    user.uid,
                    product.id,
                    product.name,
                    product.totalEarning,
                    product.cycleDays
                  );
                  
                  if (newTask) {
                    console.log(`[PRODUCTS] Task created during initial load for ${product.name}`);
                    
                    // Update UI immediately
                    setProductTasks(prev => new Map(prev.set(product.id, newTask)));
                    
                    // Get and set task status
                    const status = await productTaskService.canCompleteProductTask(user.uid, product.id);
                    setTaskStatuses(prev => new Map(prev.set(product.id, status)));
                    
                    console.log(`[PRODUCTS] New task status set during initial load for ${product.name}:`, status);
                    
                    // Update countdowns after task creation
                    setTimeout(() => {
                      updateCountdowns();
                    }, 100);
                  }
                } catch (error) {
                  console.error(`[PRODUCTS] Failed to create task during initial load for ${product.name}:`, error);
                }
              }
            } catch (error) {
              console.error(`[PRODUCTS] Failed to check existing task during initial load for ${product.name}:`, error);
            }
          }
        }
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
    
    try {
    console.log('[PRODUCTS] Loading tasks for', products.length, 'products (attempt', retryCount + 1, ')');
    
    const tasksMap = new Map<string, ProductTask>();
    const statusesMap = new Map<string, TaskStatus>();
    const productTaskService = new ProductTaskService();
    
    for (const product of products) {
      try {
          if (!user?.uid) {
            console.log('[PRODUCTS] User no longer logged in, stopping task loading');
            break;
          }
          
        console.log(`[PRODUCTS] Loading task for product: ${product.name} (${product.id})`);
        console.log(`[PRODUCTS] Product details:`, {
          id: product.id,
          name: product.name,
          planType: product.planType,
          status: product.status,
          totalEarning: product.totalEarning,
          cycleDays: product.cycleDays
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
            console.log(`[PRODUCTS] Creating task with params:`, {
              userId: user.uid,
              productId: product.id,
              productName: product.name,
              totalReturn: product.totalEarning,
              cycleDays: product.cycleDays
            });
            
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
                
                // Immediately update the UI for this product
                setProductTasks(prev => new Map(prev.set(product.id, newTask)));
                setTaskStatuses(prev => new Map(prev.set(product.id, status)));
              } else {
                console.error(`[PRODUCTS] Task creation returned null for ${product.name}`);
              }
            } catch (createError) {
              console.error(`[PRODUCTS] Failed to create missing task for ${product.name}:`, createError);
              console.error(`[PRODUCTS] Error details:`, createError);
              
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
                  console.error(`[PRODUCTS] Retry error details:`, retryError);
                }
              }, 2000);
            }
          }
        }
      } catch (error) {
        console.error(`[PRODUCTS] Failed to load task for product ${product.id}:`, error);
        console.error(`[PRODUCTS] Error details:`, error);
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
  } catch (error) {
    console.error('[PRODUCTS] Failed to load product tasks:', error);
    setError('Failed to load product tasks. Please try again.');
    }
  };



  const updateCountdowns = () => {
    try {
    const countdownsMap = new Map<string, { hours: number; minutes: number; seconds: number }>();
    
    console.log('[COUNTDOWN] Updating countdowns for', productTasks.size, 'tasks');
    
    productTasks.forEach((task, productId) => {
      console.log(`[COUNTDOWN] Checking task for ${task.productName}:`, {
        completedActions: task.completedActions,
        lastCompletedAt: task.lastCompletedAt,
        nextAvailableTime: task.nextAvailableTime
      });
      
      // Check if task is locked (completed actions = 5 and has lastCompletedAt)
      if (task.completedActions === 5 && task.lastCompletedAt) {
        const now = new Date();
        let lastCompletion: Date;
        
        // Handle different date formats safely
        if (typeof task.lastCompletedAt === 'string') {
          lastCompletion = new Date(task.lastCompletedAt);
        } else if (task.lastCompletedAt instanceof Date) {
          lastCompletion = task.lastCompletedAt;
        } else if (task.lastCompletedAt && typeof task.lastCompletedAt === 'object' && 'seconds' in task.lastCompletedAt) {
          // Handle Firestore Timestamp
          lastCompletion = new Date((task.lastCompletedAt as any).seconds * 1000);
        } else {
          console.log(`[COUNTDOWN] Invalid lastCompletedAt format for ${task.productName}:`, task.lastCompletedAt);
          return;
        }
        
        // Validate the date before using it
        if (isNaN(lastCompletion.getTime())) {
          console.log(`[COUNTDOWN] Invalid date created for ${task.productName}:`, {
            lastCompletedAt: task.lastCompletedAt,
            lastCompletion: lastCompletion,
            lastCompletedAtType: typeof task.lastCompletedAt
          });
          return;
        }
        
        const timeSinceLastCompletion = now.getTime() - lastCompletion.getTime();
        const hoursRemaining = 24 - (timeSinceLastCompletion / (1000 * 60 * 60));
        
        // If the task was just completed (within 5 seconds), it means the countdown should start from 24 hours
        // If it's been more than 5 seconds, use the calculated time
        const adjustedHoursRemaining = timeSinceLastCompletion < 5000 ? 24 : hoursRemaining;
        
        console.log(`[COUNTDOWN] Task locked for ${task.productName}:`, {
          lastCompletion: lastCompletion.toISOString(),
          now: now.toISOString(),
          timeSinceLastCompletion: timeSinceLastCompletion / (1000 * 60 * 60),
          hoursRemaining,
          adjustedHoursRemaining,
          completedActions: task.completedActions,
          hasLastCompletedAt: !!task.lastCompletedAt,
          lastCompletedAtType: typeof task.lastCompletedAt,
          lastCompletedAtValue: task.lastCompletedAt,
          timeSinceLastCompletionMs: timeSinceLastCompletion
        });
        
        if (adjustedHoursRemaining > 0) {
          const totalMinutes = Math.floor(adjustedHoursRemaining * 60);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          const totalSeconds = Math.floor(adjustedHoursRemaining * 3600);
          const seconds = totalSeconds % 60;
          
          countdownsMap.set(productId, { hours, minutes, seconds });
          console.log(`[COUNTDOWN] Set countdown for ${task.productName}:`, { 
            hours, 
            minutes, 
            seconds,
            hoursRemaining,
            totalMinutes,
            totalSeconds
          });
        } else {
          console.log(`[COUNTDOWN] Hours remaining is not positive for ${task.productName}: ${hoursRemaining}`);
          // Clear countdown when time has expired
          if (countdownsMap.has(productId)) {
            countdownsMap.delete(productId);
            console.log(`[COUNTDOWN] Cleared expired countdown for ${task.productName}`);
          }
          
          // Auto-reset the task when countdown expires
          if (user?.uid) {
            console.log(`[COUNTDOWN] Auto-resetting task for ${task.productName} as countdown has expired`);
            const resetTask = async () => {
              try {
                const productTaskService = new ProductTaskService();
                await productTaskService.checkAndResetActionsAfterCooldown(user.uid, productId);
                console.log(`[COUNTDOWN] Auto-reset completed for ${task.productName}`);
                
                // Refresh the task data
                setTimeout(() => {
                  loadProductTasks(purchasedProducts);
                }, 1000);
              } catch (error) {
                console.error(`[COUNTDOWN] Auto-reset failed for ${task.productName}:`, error);
              }
            };
            resetTask();
          }
        }
      } else {
        console.log(`[COUNTDOWN] Task not locked for ${task.productName}:`, {
          completedActions: task.completedActions,
          hasLastCompletedAt: !!task.lastCompletedAt
        });
      }
      
      // Also check nextAvailableTime for legacy support
      if (task.nextAvailableTime) {
        try {
        const now = new Date();
          
          // Validate nextAvailableTime before using it
          if (isNaN(task.nextAvailableTime.getTime())) {
            console.log(`[COUNTDOWN] Invalid nextAvailableTime for ${task.productName}:`, task.nextAvailableTime);
            return;
          }
          
        const timeRemaining = task.nextAvailableTime.getTime() - now.getTime();
        
        if (timeRemaining > 0) {
          const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
          const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
            
            // Only set countdown if we don't already have one from lastCompletedAt
            if (!countdownsMap.has(productId)) {
          countdownsMap.set(productId, { hours, minutes, seconds });
          console.log(`[COUNTDOWN] Set countdown (legacy) for ${task.productName}:`, { hours, minutes, seconds });
            }
          }
        } catch (error) {
          console.error(`[COUNTDOWN] Error processing nextAvailableTime for ${task.productName}:`, error);
        }
      }
    });
    
    console.log('[COUNTDOWN] Final countdowns map:', countdownsMap);
    setCountdowns(countdownsMap);
    } catch (error) {
      console.error('[COUNTDOWN] Error updating countdowns:', error);
      // Don't set error state here as it's not critical for the main functionality
    }
  };

  const handleCompleteAction = async (productId: string, actionType: string) => {
    if (!user) return;
    
    // Prevent double clicking on the same action
    const actionKey = `${productId}-${actionType}`;
    if (completingActions.get(productId)?.has(actionType)) {
      return;
    }
    
    // Set loading state for this action
    setCompletingActions(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(productId)) {
        newMap.set(productId, new Set());
      }
      newMap.get(productId)!.add(actionType);
      return newMap;
    });
    
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
            
            // Show user-facing message in console
            console.log('Action completed successfully!');
          } else {
            console.log('Action completed successfully!');
          }
        }
        
        // Show success message to user
        setTaskMessage({ type: 'success', message: result.message });
        setTimeout(() => setTaskMessage(null), 3000); // Clear after 3 seconds
      } else {
        // Show error message to user
        setTaskMessage({ type: 'error', message: result.message });
        setTimeout(() => setTaskMessage(null), 3000); // Clear after 3 seconds
      }
    } catch (error) {
      console.error('Failed to complete action:', error);
      console.error('Action completion error. Please check console for details.');
    } finally {
      // Clear loading state for this action
      setCompletingActions(prev => {
        const newMap = new Map(prev);
        if (newMap.has(productId)) {
          newMap.get(productId)!.delete(actionType);
        }
        return newMap;
      });
    }
  };

  const handleCompleteTask = async (productId: string) => {
    if (!user) return;
    
    // Prevent double clicking
    if (completingTasks.has(productId)) {
      return;
    }
    
    // Set loading state
    setCompletingTasks(prev => new Set(prev).add(productId));
    
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
            
            // CRITICAL: Update countdowns immediately after task completion
            // This ensures the timer shows up right away
            
            // Immediate countdown calculation for this specific task
            if (updatedTask.completedActions === 5 && updatedTask.lastCompletedAt) {
              const now = new Date();
              const lastCompletion = new Date(updatedTask.lastCompletedAt);
              const timeSinceLastCompletion = now.getTime() - lastCompletion.getTime();
              const hoursRemaining = 24 - (timeSinceLastCompletion / (1000 * 60 * 60));
              
              console.log(`[IMMEDIATE COUNTDOWN] Debug info for ${updatedTask.productName}:`, {
                now: now.toISOString(),
                lastCompletion: lastCompletion.toISOString(),
                timeSinceLastCompletion: timeSinceLastCompletion / (1000 * 60 * 60),
                hoursRemaining,
                completedActions: updatedTask.completedActions,
                hasLastCompletedAt: !!updatedTask.lastCompletedAt
              });
              
              if (hoursRemaining > 0) {
                const hours = Math.floor(hoursRemaining);
                const minutes = Math.floor((hoursRemaining - hours) * 60);
                const seconds = Math.floor(((hoursRemaining - hours) * 60 - minutes) * 60);
                
                // Set countdown immediately for this task
                setCountdowns(prev => {
                  const newCountdowns = new Map(prev);
                  newCountdowns.set(productId, { hours, minutes, seconds });
                  console.log(`[IMMEDIATE COUNTDOWN] Set countdown for ${updatedTask.productName}:`, { hours, minutes, seconds });
                  return newCountdowns;
                });
              } else {
                console.log(`[IMMEDIATE COUNTDOWN] Hours remaining is not positive: ${hoursRemaining}`);
              }
            } else {
              console.log(`[IMMEDIATE COUNTDOWN] Task not ready for countdown:`, {
                completedActions: updatedTask.completedActions,
                hasLastCompletedAt: !!updatedTask.lastCompletedAt
              });
            }
            
            setTimeout(() => {
              updateCountdowns();
              // Force a second update after a short delay to ensure countdown is set
              setTimeout(() => {
                updateCountdowns();
              }, 500);
              // Force a third update after 1 second to ensure countdown is set
              setTimeout(() => {
                updateCountdowns();
              }, 1000);
            }, 100);
            
            // Inform user about reward
            console.log(`Daily task completed! Reward added to your balance. Task locked for 24 hours.`);
      } else {
            console.log(`Daily task completed! Reward added to your balance. Task locked for 24 hours.`);
          }
        }
        
        // Show success message to user
        setTaskMessage({ type: 'success', message: result.message });
        setTimeout(() => setTaskMessage(null), 5000); // Clear after 5 seconds
      } else {
        // Show error message to user with debug info
        const currentTask = productTasks.get(productId);
        const debugInfo = currentTask ? 
          ` (Actions: ${currentTask.completedActions}/${currentTask.requiredActions}, Last Completed: ${currentTask.lastCompletedAt ? new Date(currentTask.lastCompletedAt).toISOString() : 'Never'})` : 
          '';
        
        setTaskMessage({ 
          type: 'error', 
          message: `${result.message}${debugInfo}` 
        });
        setTimeout(() => setTaskMessage(null), 8000); // Clear after 8 seconds for longer debug info
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
      // Show user-friendly error message
      console.error('Task completion error. Please check console for details.');
    } finally {
      // Clear loading state
      setCompletingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const handleClaimReturns = async (productId: string) => {
    if (!user) return;

    try {
      // Find the product to determine its type
      const product = purchasedProducts.find(p => p.id === productId);
      if (!product) {
        alert('Product not found');
        return;
      }

      if (product.planType === 'Special') {
        // For Special plans, check if task is completed and claim daily reward
        const task = productTasks.get(productId);
        if (!task) {
          alert('Task not found for this Special plan');
          return;
        }

        if (task.completedActions < task.requiredActions) {
          alert('Complete all 5 actions first to claim your daily reward');
          return;
        }

        // Check if 24-hour cooldown has expired
        if (task.lastCompletedAt) {
          const now = new Date();
          const lastCompletion = new Date(task.lastCompletedAt);
          const timeSinceLastCompletion = now.getTime() - lastCompletion.getTime();
          
          // Check if the task was just completed (within 5 seconds)
          // If so, start countdown from 24 hours
          const justCompleted = timeSinceLastCompletion < 5000; // 5 seconds
          
          let hoursRemaining: number;
          if (justCompleted) {
            // Task was just completed, start countdown from 24 hours
            hoursRemaining = 24;
            console.log('[COUNTDOWN-HOOK] Task just completed, starting countdown from 24 hours');
          } else {
            // Calculate remaining time based on actual elapsed time
            hoursRemaining = 24 - (timeSinceLastCompletion / (1000 * 60 * 60));
            console.log('[COUNTDOWN-HOOK] Calculating remaining time based on elapsed time');
          }
          
          if (hoursRemaining > 0) {
            const hours = Math.floor(hoursRemaining);
            const minutes = Math.floor((hoursRemaining - hours) * 60);
            alert(`Task locked for ${hours}h ${minutes}m. Complete again in 24 hours.`);
            return;
          }
        }

        // Complete the task and claim reward
        const productTaskService = new ProductTaskService();
        const result = await productTaskService.completeProductTask(user.uid, productId);

        if (result.success) {
          alert(result.message);
          // Refresh the product list and tasks
          loadPurchasedProducts();
        } else {
          alert(result.message);
        }
      } else {
        // For Basic and Premium plans, use the existing claim mechanism
      const result = await ProductService.claimReturns(user.uid, productId);

      if (result.success) {
        alert(result.message);
        // Refresh the product list to show updated status
        loadPurchasedProducts();
      } else {
        alert(result.message);
        }
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
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 rounded-lg border bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="font-medium">Error: {error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
      
      {/* Task Message Display */}
      {taskMessage && (
        <div className={`mb-4 p-4 rounded-lg border ${
          taskMessage.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' 
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {taskMessage.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span className="font-medium">{taskMessage.message}</span>
          </div>
        </div>
      )}
      
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
                              
                              {/* Countdown Display for Special Plans */}
                              {/* Debug: Show countdown info */}
                              <div className="text-xs text-gray-500 mb-2 p-2 bg-gray-100 rounded">
                                <p>Debug: Task completedActions = {task.completedActions}</p>
                                <p>Debug: Task lastCompletedAt = {task.lastCompletedAt ? 'exists' : 'null'}</p>
                                <p>Debug: Countdown hook result = {countdown ? JSON.stringify(countdown) : 'null'}</p>
                                <p>Debug: Should show countdown = {countdown && countdown.hours > 0 ? 'YES' : 'NO'}</p>
                              </div>
                              
                              {countdown && countdown.hours > 0 ? (
                                <div className="text-center space-y-3">
                                  <div className="flex items-center justify-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                                    <Clock className="h-4 w-4" />
                                    <span className="font-medium">⏰ Task Locked - Countdown Active</span>
                                  </div>
                                  
                                  {/* Real-time Countdown Display */}
                                  <div className="p-4 rounded-lg border transition-all duration-500 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-red-800">
                                    <div className="text-center">
                                      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                                        {countdown.hours.toString().padStart(2, '0')}:{countdown.minutes.toString().padStart(2, '0')}:{countdown.seconds.toString().padStart(2, '0')}
                                      </div>
                                      <div className="text-sm text-orange-500 dark:text-orange-300 font-medium">
                                        Hours : Minutes : Seconds Remaining
                                      </div>
                                      {countdown.hours === 0 && countdown.minutes <= 5 && (
                                        <div className="text-xs text-red-600 dark:text-red-400 font-bold mt-1 animate-pulse">
                                          ⚡ Almost ready! Get prepared for next task cycle!
                                </div>
                              )}
                                    </div>
                                  </div>
                                  
                                  {/* Progress Bar for Visual Feedback */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>Time Remaining</span>
                                      <span>{Math.round((countdown.hours * 60 + countdown.minutes) / 24 / 60 * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                      <div 
                                        className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-1000"
                                        style={{ 
                                          width: `${Math.max(0, Math.round((countdown.hours * 60 + countdown.minutes) / 24 / 60 * 100))}%` 
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                  
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground">
                                      🔒 Complete 5 actions again after countdown expires
                                    </p>
                                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                      Next task cycle will be available soon!
                                    </p>
                                  </div>
                                  
                                  {/* Debug Info */}
                                  <div className="text-xs text-gray-500 border-t pt-2">
                                    <p>Debug: lastCompletedAt = {task.lastCompletedAt ? new Date(task.lastCompletedAt).toISOString() : 'null'}</p>
                                    <p>Debug: countdown = {JSON.stringify(countdown)}</p>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => {
                                        console.log('[DEBUG] Task data:', task);
                                        console.log('[DEBUG] Countdown data:', countdown);
                                        updateCountdowns();
                                      }}
                                    >
                                      Refresh Countdown
                                    </Button>
                                  </div>
                                </div>
                              ) : task.completedActions === 5 && task.lastCompletedAt ? (
                                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border">
                                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                    ✅ Task ready! You can now complete 5 actions again.
                                  </p>
                                </div>
                              ) : null}
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-2">
                              {task.actionTypes.map((actionType, index) => {
                                const IconComponent = ACTION_ICONS[actionType as keyof typeof ACTION_ICONS];
                                const isCompleted = isActionCompleted(product.id, actionType);
                                const isTaskLocked = countdown && countdown.hours > 0; // Task is locked if countdown exists
                                
                                const isActionCompleting = completingActions.get(product.id)?.has(actionType);
                                
                                return (
                                  <Button
                                    key={actionType}
                                    variant={getActionButtonVariant(product.id, actionType)}
                                    size="sm"
                                    onClick={() => handleCompleteAction(product.id, actionType)}
                                    disabled={isCompleted || isTaskLocked || isActionCompleting}
                                    className={`h-10 text-xs ${isTaskLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {IconComponent && <IconComponent className="h-3 w-3 mr-1" />}
                                    {isTaskLocked ? 'Locked' : isActionCompleting ? 'Completing...' : getActionButtonText(product.id, actionType)}
                                  </Button>
                                );
                              })}
                            </div>

                            {/* Task Completion */}
                            <div className="pt-3 border-t">
                              {/* PRIORITY 1: Show countdown if task is locked (completedActions === 5 and has lastCompletedAt) */}
                              {task.completedActions === 5 && task.lastCompletedAt ? (
                                (() => {
                                  try {
                                    // Calculate countdown on-the-fly
                                    const now = new Date();
                                    
                                    // Handle different date formats safely
                                    let lastCompletion;
                                    try {
                                      if (typeof task.lastCompletedAt === 'string') {
                                        lastCompletion = new Date(task.lastCompletedAt);
                                      } else if (task.lastCompletedAt instanceof Date) {
                                        lastCompletion = task.lastCompletedAt;
                                      } else if (task.lastCompletedAt && typeof task.lastCompletedAt === 'object' && 'seconds' in task.lastCompletedAt) {
                                        // Handle Firestore Timestamp
                                        lastCompletion = new Date((task.lastCompletedAt as any).seconds * 1000);
                                      } else {
                                        // Fallback: assume task was just completed
                                        lastCompletion = new Date(Date.now() - 1000); // 1 second ago
                                      }
                                      
                                      // Validate the parsed date
                                      if (isNaN(lastCompletion.getTime())) {
                                        console.log(`[COUNTDOWN ERROR] Invalid date parsed for ${task.productName}:`, {
                                          lastCompletedAt: task.lastCompletedAt,
                                          lastCompletedAtType: typeof task.lastCompletedAt,
                                          parsedDate: lastCompletion
                                        });
                                        // Fallback: assume task was just completed
                                        lastCompletion = new Date(Date.now() - 1000); // 1 second ago
                                      }
                                    } catch (error) {
                                      console.error(`[COUNTDOWN ERROR] Failed to parse date for ${task.productName}:`, error);
                                      // Fallback: assume task was just completed
                                      lastCompletion = new Date(Date.now() - 1000); // 1 second ago
                                    }
                                    
                                    const timeSinceLastCompletion = now.getTime() - lastCompletion.getTime();
                                    const hoursRemaining = 24 - (timeSinceLastCompletion / (1000 * 60 * 60));
                                    
                                    // Validate the date before using toISOString
                                    if (isNaN(lastCompletion.getTime())) {
                                      console.log(`[COUNTDOWN ERROR] Invalid date for ${task.productName}:`, {
                                        lastCompletion,
                                        lastCompletedAt: task.lastCompletedAt,
                                        lastCompletedAtType: typeof task.lastCompletedAt
                                      });
                                      // Fallback: assume task was just completed
                                      lastCompletion = new Date(Date.now() - 1000); // 1 second ago
                                    }
                                    
                                    // Add debug info to see what's happening
                                    console.log(`[COUNTDOWN DEBUG] ${task.productName}:`, {
                                      now: now.toISOString(),
                                      lastCompletion: lastCompletion.toISOString(),
                                      timeSinceLastCompletion: timeSinceLastCompletion / (1000 * 60 * 60),
                                      hoursRemaining,
                                      completedActions: task.completedActions,
                                      hasLastCompletedAt: !!task.lastCompletedAt,
                                      lastCompletedAtType: typeof task.lastCompletedAt,
                                      lastCompletedAtValue: task.lastCompletedAt
                                    });
                                    
                                    // Check if task was just completed (within last 5 minutes)
                                    const justCompleted = timeSinceLastCompletion < 5 * 60 * 1000; // 5 minutes in milliseconds
                                  
                                  // Use the countdown hook result if available, otherwise fall back to calculated values
                                  const countdownData = countdown ? {
                                    hours: countdown.hours,
                                    minutes: countdown.minutes,
                                    seconds: countdown.seconds
                                  } : {
                                    hours: Math.floor(hoursRemaining),
                                    minutes: Math.floor((hoursRemaining - Math.floor(hoursRemaining)) * 60),
                                    seconds: Math.floor(((hoursRemaining - Math.floor(hoursRemaining)) * 60 - Math.floor((hoursRemaining - Math.floor(hoursRemaining)) * 60)) * 60)
                                  };

                                  if (countdownData && countdownData.hours > 0) {
                                    // Show countdown using the hook result
                                    return (
                                      <div className="text-center space-y-3">
                                        <div className="flex items-center justify-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                                          <Clock className="h-4 w-4" />
                                          <span className="font-medium">⏰ Task Locked - Countdown Active</span>
                                        </div>
                                        
                                        {/* Enhanced Countdown Display */}
                                        <div className={`p-4 rounded-lg border transition-all duration-500 ${
                                          countdownData.hours === 0 && countdownData.minutes <= 5 
                                            ? 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-800 animate-pulse' 
                                            : 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-red-800'
                                        }`}>
                                          <div className="text-center">
                                            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                                              {countdownData.hours.toString().padStart(2, '0')}:{countdownData.minutes.toString().padStart(2, '0')}:{countdownData.seconds.toString().padStart(2, '0')}
                                            </div>
                                            <div className="text-sm text-orange-500 dark:text-orange-300 font-medium">
                                              Hours : Minutes : Seconds Remaining
                                            </div>
                                            {countdownData.hours === 0 && countdownData.minutes <= 5 && (
                                              <div className="text-xs text-red-600 dark:text-red-400 font-bold mt-1 animate-pulse">
                                                ⚡ Almost ready! Get prepared for next task cycle!
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Progress Bar for Visual Feedback */}
                                        <div className="space-y-1">
                                          <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Time Remaining</span>
                                            <span>{Math.round((countdownData.hours * 60 + countdownData.minutes) / 24 / 60 * 100)}%</span>
                                          </div>
                                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div 
                                              className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-1000"
                                              style={{ 
                                                width: `${Math.max(0, Math.round((countdownData.hours * 60 + countdownData.minutes) / 24 / 60 * 100))}%` 
                                              }}
                                            ></div>
                                          </div>
                                        </div>
                                        
                                        <div className="text-center">
                                          <p className="text-xs text-muted-foreground">
                                            🔒 Complete 5 actions again after countdown expires
                                          </p>
                                          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                            {countdownData.hours === 0 && countdownData.minutes <= 5 
                                              ? '⚡ Next task cycle will be available very soon!' 
                                              : 'Next task cycle will be available soon!'
                                            }
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  } else if (hoursRemaining > 0) {
                                  } else {
                                    return (
                                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border">
                                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                          ✅ Task ready! You can now complete 5 actions again.
                                        </p>
                                      </div>
                                    );
                                  }
                                  } catch (error) {
                                    console.error('[COUNTDOWN ERROR] Failed to calculate countdown:', error);
                                    // Fallback: show error message
                                    return (
                                      <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border">
                                        <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                          ⚠️ Error calculating countdown. Please refresh the page.
                                        </p>
                                      </div>
                                    );
                                  }
                                })()
                              ) : status?.canComplete ? (
                                /* PRIORITY 2: Show complete button if task can be completed */
                                <Button 
                                  onClick={() => handleCompleteTask(product.id)}
                                  className="w-full"
                                  size="sm"
                                  disabled={completingTasks.has(product.id)}
                                >
                                  <Trophy className="h-4 w-4 mr-2" />
                                  {completingTasks.has(product.id) ? 'Completing...' : `Complete Daily Task (₦${task.dailyReward.toLocaleString()})`}
                                </Button>
                              ) : (
                                /* PRIORITY 3: Show status message if neither countdown nor completion is possible */
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">{status?.message}</p>
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
                            
                            {/* Debug Info - Remove in production */}
                            {process.env.NODE_ENV === 'development' && (
                              <div className="pt-3 border-t">
                                <details className="text-xs text-muted-foreground">
                                  <summary className="cursor-pointer">Debug Info</summary>
                                  <div className="mt-2 space-y-1 text-left">
                                    <p>completedActions: {task.completedActions}</p>
                                    <p>lastCompletedAt: {task.lastCompletedAt ? new Date(task.lastCompletedAt).toISOString() : 'null'}</p>
                                    <p>countdown: {countdown ? `${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s` : 'null'}</p>
                                    <p>status.canComplete: {status?.canComplete ? 'true' : 'false'}</p>
                                    <p>status.message: {status?.message}</p>
                                    <p>Task Locked: {task.completedActions === 5 && task.lastCompletedAt ? 'YES' : 'NO'}</p>
                                    <p>Countdown Ready: {countdown ? 'YES' : 'NO'}</p>
                                  </div>
                                  <div className="mt-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        console.log('[DEBUG] Current task state:', task);
                                        console.log('[DEBUG] Current countdowns:', countdowns);
                                        updateCountdowns();
                                      }}
                                    >
                                      Test Countdown
                                    </Button>
                                  </div>
                                </details>
                              </div>
                            )}
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
