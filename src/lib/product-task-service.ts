import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { UserService, TransactionService } from './user-service';

// Ensure database is initialized
if (!db) {
  console.error('[TASK] Database not initialized! Firebase may not be ready.');
}

export interface ProductTask {
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
  // Task performance system
  requiredActions: number;
  completedActions: number;
  currentActionStep: number;
  actionTypes: string[];
  lastActionTime: Date | null;
}

export interface TaskAction {
  id: string;
  type: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
}

export class ProductTaskService {
  private collectionName = 'product_tasks';

  async createProductTask(
    userId: string,
    productId: string,
    productName: string,
    totalReturn: number,
    cycleDays: number
  ): Promise<ProductTask> {
    // Check if database is initialized
    if (!db) {
      console.error('[TASK] Database not initialized! Cannot create task.');
      throw new Error('Database not initialized');
    }
    
    console.log(`[TASK] Creating product task for:`, { userId, productId, productName, totalReturn, cycleDays });
    
    const dailyReward = Math.floor(totalReturn / cycleDays);
    const taskId = `${userId}_${productId}`;
    
    // IMPORTANT: Check if task already exists to prevent recreation
    const existingTask = await this.getProductTask(userId, productId);
    if (existingTask) {
      console.log(`[TASK] Task already exists for ${productName}, returning existing task:`, existingTask);
      return existingTask;
    }
    
    console.log(`[TASK] Calculated daily reward: ${dailyReward}, Task ID: ${taskId}`);
    
    const task: ProductTask = {
      id: taskId,
      userId,
      productId,
      productName,
      dailyReward,
      maxCompletions: 1,
      completionsToday: 0,
      lastCompletedAt: null,
      cycleDays,
      cycleDaysCompleted: 0,
      totalEarned: 0,
      totalExpected: totalReturn,
      isExpired: false,
      nextAvailableTime: null,
      // Task performance system
      requiredActions: 5,
      completedActions: 0,
      currentActionStep: 1,
      actionTypes: ['view_earnings', 'check_balance', 'read_news', 'update_profile', 'share_platform'],
      lastActionTime: null
    };

    console.log(`[TASK] Task object created:`, task);

    try {
      console.log(`[TASK] Saving task to Firestore with ID: ${taskId}`);
      
      // Convert Date objects to Firestore timestamps for null values
      const taskData = {
        ...task,
        lastCompletedAt: null,
        nextAvailableTime: null,
        lastActionTime: null
      };
      
      await setDoc(doc(db, this.collectionName, taskId), taskData);
      console.log(`[TASK] Task saved successfully to Firestore`);
      
      // Verify the task was saved by reading it back
      const savedTask = await this.getProductTask(userId, productId);
      console.log(`[TASK] Verification - task read back:`, savedTask ? 'Success' : 'Failed');
      
      if (!savedTask) {
        throw new Error('Task was not saved properly - verification failed');
      }
      
      console.log(`[PRODUCTS] Task creation completed successfully for ${productName}`);
      return task;
    } catch (error) {
      console.error('[TASK] Failed to create product task:', error);
      throw error;
    }
  }

  async getProductTask(userId: string, productId: string): Promise<ProductTask | null> {
    // Check if database is initialized
    if (!db) {
      console.error('[TASK] Database not initialized! Cannot get task.');
      return null;
    }
    
    try {
      const taskId = `${userId}_${productId}`;
      console.log(`[TASK] Getting product task with ID: ${taskId}`);
      
      const taskDoc = await getDoc(doc(db, this.collectionName, taskId));
      console.log(`[TASK] Task document exists: ${taskDoc.exists()}`);
      
      if (taskDoc.exists()) {
        const data = taskDoc.data();
        console.log(`[TASK] Task data retrieved:`, data);
        
        // Handle date conversions properly - support both Firestore Timestamp and regular Date objects
        const task = {
          ...data,
          lastCompletedAt: data.lastCompletedAt ? 
            (data.lastCompletedAt.toDate ? data.lastCompletedAt.toDate() : new Date(data.lastCompletedAt)) : null,
          nextAvailableTime: data.nextAvailableTime ? 
            (data.nextAvailableTime.toDate ? data.nextAvailableTime.toDate() : new Date(data.nextAvailableTime)) : null,
          lastActionTime: data.lastActionTime ? 
            (data.lastActionTime.toDate ? data.lastActionTime.toDate() : new Date(data.lastActionTime)) : null
        } as ProductTask;
        
        console.log(`[TASK] Raw data from Firestore:`, data);
        console.log(`[TASK] Processed task object:`, task);
        console.log(`[TASK] Key fields:`, {
          totalEarned: task.totalEarned,
          cycleDaysCompleted: task.cycleDaysCompleted,
          completedActions: task.completedActions,
          lastCompletedAt: task.lastCompletedAt,
          isExpired: task.isExpired
        });
        return task;
      } else {
        console.log(`[TASK] No task document found for ID: ${taskId}`);
        return null;
      }
    } catch (error) {
      console.error('[TASK] Failed to get product task:', error);
      return null;
    }
  }

  async completeTaskAction(
    userId: string,
    productId: string,
    actionType: string
  ): Promise<{ success: boolean; message: string; progress: number }> {
    try {
      const task = await this.getProductTask(userId, productId);
      if (!task) {
        return { success: false, message: 'Task not found', progress: 0 };
      }

      if (task.isExpired) {
        return { success: false, message: 'Product cycle completed, task expired', progress: task.completedActions };
      }

      // Check if action type is valid
      if (!task.actionTypes.includes(actionType)) {
        return { success: false, message: 'Invalid action type', progress: task.completedActions };
      }

      // IMPORTANT: Check if 24-hour cooldown has expired and reset actions if needed
      if (task.completedActions === 5) {
        // Check if user has already completed a task today (within 24 hours)
        if (task.lastCompletedAt) {
          const now = new Date();
          const lastCompletion = new Date(task.lastCompletedAt);
          const timeSinceLastCompletion = now.getTime() - lastCompletion.getTime();
          const hoursRemaining = 24 - (timeSinceLastCompletion / (1000 * 60 * 60));
          
          if (hoursRemaining > 0) {
            const hours = Math.floor(hoursRemaining);
            const minutes = Math.floor((hoursRemaining - hours) * 60);
            return { 
              success: false, 
              message: `Task locked for ${hours}h ${minutes}m. Complete again in 24 hours.`, 
              progress: 5 
            };
          }
          // Note: We don't reset here anymore - let the frontend handle the reset
          // to avoid race conditions and immediate resets
        }
      }

      // Check if action was already completed in current cycle
      const actionIndex = task.actionTypes.indexOf(actionType);
      if (task.completedActions > actionIndex) {
        return { success: false, message: 'This action was already completed in current cycle', progress: task.completedActions };
      }

      // Complete the action
      const newCompletedActions = task.completedActions + 1;
      const progress = Math.floor((newCompletedActions / task.requiredActions) * 100);

      await updateDoc(doc(db, this.collectionName, task.id), {
        completedActions: newCompletedActions,
        currentActionStep: newCompletedActions + 1,
        lastActionTime: new Date()
      });

      console.log(`[TASK] Completed action ${actionType} for ${task.productName}, progress: ${progress}%`);

      return {
        success: true,
        message: `Action completed! Progress: ${newCompletedActions}/${task.requiredActions}`,
        progress
      };
    } catch (error) {
      console.error('[ERROR] Failed to complete task action:', error);
      return { success: false, message: 'Failed to complete action', progress: 0 };
    }
  }

  async completeProductTask(
    userId: string,
    productId: string
  ): Promise<{ success: boolean; message: string; reward?: number }> {
    try {
      const task = await this.getProductTask(userId, productId);
      if (!task) {
        return { success: false, message: 'Task not found' };
      }

      if (task.isExpired) {
        return { success: false, message: 'Product cycle completed, task expired' };
      }

      // Check if all actions are completed
      if (task.completedActions < task.requiredActions) {
        const remaining = task.requiredActions - task.completedActions;
        return { 
          success: false, 
          message: `Complete ${remaining} more action${remaining > 1 ? 's' : ''} to earn your daily reward` 
        };
      }

      // STRICT 24-hour cooldown check
      if (task.lastCompletedAt) {
        const now = new Date();
        const lastCompletion = new Date(task.lastCompletedAt);
        const timeSinceLastCompletion = now.getTime() - lastCompletion.getTime();
        const hoursRemaining = 24 - (timeSinceLastCompletion / (1000 * 60 * 60));
        
        console.log(`[TASK] Cooldown check: Last completion: ${lastCompletion}, Now: ${now}, Hours remaining: ${hoursRemaining}`);
        
        if (hoursRemaining > 0) {
          const hours = Math.floor(hoursRemaining);
          const minutes = Math.floor((hoursRemaining - hours) * 60);
          return { 
            success: false, 
            message: `Task locked for ${hours}h ${minutes}m. Complete again in 24 hours.` 
          };
        }
      }

      // Complete the task and give reward
      const newTotalEarned = task.totalEarned + task.dailyReward;
      const newCycleDaysCompleted = task.cycleDaysCompleted + 1;
      const isExpired = newCycleDaysCompleted >= task.cycleDays;

      // Calculate next available time (24 hours from now)
      const nextAvailableTime = new Date();
      nextAvailableTime.setHours(nextAvailableTime.getHours() + 24);

      // IMPORTANT: Keep actions at 5 (completed) but lock the task for 24 hours
      // User will need to wait 24 hours before they can start the 5 actions again
      const newCompletedActions = 5; // Keep at 5 to show all actions are done
      const newCurrentActionStep = 5; // Keep at step 5

      // Use Firestore timestamp for lastCompletedAt
      const now = new Date();
      const firestoreTimestamp = {
        seconds: Math.floor(now.getTime() / 1000),
        nanoseconds: (now.getTime() % 1000) * 1000000
      };

      console.log(`[TASK] Updating task with:`, {
        currentTotalEarned: task.totalEarned,
        dailyReward: task.dailyReward,
        newTotalEarned,
        newCycleDaysCompleted,
        isExpired,
        lastCompletedAt: firestoreTimestamp
      });

      await updateDoc(doc(db, this.collectionName, task.id), {
        totalEarned: newTotalEarned,
        cycleDaysCompleted: newCycleDaysCompleted,
        isExpired,
        nextAvailableTime,
        lastCompletedAt: firestoreTimestamp,
        completedActions: newCompletedActions, // Keep at 5
        currentActionStep: newCurrentActionStep, // Keep at 5
        lastActionTime: null
      });

      console.log(`[TASK] Task completed and locked for 24 hours. Next available: ${nextAvailableTime}`);

      // Credit user balance immediately and record transaction
      const user = await UserService.getUserById(userId);
      if (user) {
        const updatedUser = { ...user, balance: (user.balance || 0) + task.dailyReward };
        await UserService.saveUser(updatedUser);

        await TransactionService.createTransaction({
          userId: userId,
          userEmail: user.email || '',
          type: 'Investment',
          amount: task.dailyReward,
          status: 'Completed',
          date: new Date().toISOString(),
          description: `Daily task reward for ${task.productName}`
        });
      }

      return {
        success: true,
        message: `Daily task completed! Earned ₦${task.dailyReward.toLocaleString()}. Task locked for 24 hours.`,
        reward: task.dailyReward
      };
    } catch (error) {
      console.error('[ERROR] Failed to complete product task:', error);
      return { success: false, message: 'Failed to complete task' };
    }
  }

  async canCompleteProductTask(
    userId: string,
    productId: string
  ): Promise<{ 
    canComplete: boolean; 
    message: string; 
    hoursRemaining?: number; 
    minutesRemaining?: number;
    progress: number;
    remainingActions: number;
  }> {
    try {
      const task = await this.getProductTask(userId, productId);
      if (!task) {
        return { 
          canComplete: false, 
          message: 'Task not found',
          progress: 0,
          remainingActions: 0
        };
      }

      if (task.isExpired) {
        return { 
          canComplete: false, 
          message: 'Product cycle completed, task expired',
          progress: 0,
          remainingActions: 0
        };
      }

      // Check if all actions are completed
      if (task.completedActions < task.requiredActions) {
        const remaining = task.requiredActions - task.completedActions;
        const progress = Math.floor((task.completedActions / task.requiredActions) * 100);
        return { 
          canComplete: false, 
          message: `Complete ${remaining} more action${remaining > 1 ? 's' : ''} to earn your daily reward`,
          progress,
          remainingActions: remaining
        };
      }

      // If all actions are completed (5/5), check if 24-hour cooldown has expired
      if (task.completedActions === 5) {
        // Check if user has already completed a task today (within 24 hours)
      if (task.lastCompletedAt) {
        const now = new Date();
          const lastCompletion = new Date(task.lastCompletedAt);
          const timeSinceLastCompletion = now.getTime() - lastCompletion.getTime();
        const hoursRemaining = 24 - (timeSinceLastCompletion / (1000 * 60 * 60));
          
          if (hoursRemaining > 0) {
            const hours = Math.floor(hoursRemaining);
            const minutes = Math.floor((hoursRemaining - hours) * 60);
            return { 
              canComplete: false, 
              message: `Task locked for ${hours}h ${minutes}m. Complete again in 24 hours.`,
              hoursRemaining: hours,
              minutesRemaining: minutes,
              progress: 100,
              remainingActions: 0
            };
          } else {
            // 24 hours have passed, actions should be reset for next cycle
            console.log(`[TASK] 24-hour cooldown expired for ${task.productName}, actions should be reset`);
            return { 
              canComplete: false, 
              message: `Actions reset for next cycle! Complete 5 actions again to earn your daily reward.`,
              progress: 0,
              remainingActions: 5
            };
          }
        } else {
          // First time completing task - allow completion
          return { 
            canComplete: true, 
            message: 'Ready to complete daily task!',
            progress: 100,
            remainingActions: 0
          };
        }
      }

      // STRICT 24-hour cooldown check
      if (task.lastCompletedAt) {
        const now = new Date();
        const lastCompletion = new Date(task.lastCompletedAt);
        const timeSinceLastCompletion = now.getTime() - lastCompletion.getTime();
        const hoursRemaining = 24 - (timeSinceLastCompletion / (1000 * 60 * 60));
        
        console.log(`[TASK] Status check - Cooldown: Last completion: ${lastCompletion}, Now: ${now}, Hours remaining: ${hoursRemaining}`);
        
        if (hoursRemaining > 0) {
          const hours = Math.floor(hoursRemaining);
          const minutes = Math.floor((hoursRemaining - hours) * 60);
          return { 
            canComplete: false, 
            message: `Task locked for ${hours}h ${minutes}m. Complete again in 24 hours.`,
            hoursRemaining: hours,
            minutesRemaining: minutes,
            progress: 100,
            remainingActions: 0
          };
        }
      }

      return { 
        canComplete: true, 
        message: 'Ready to complete daily task!',
        progress: 100,
        remainingActions: 0
      };
    } catch (error) {
      console.error('[ERROR] Failed to check task completion status:', error);
      return { 
        canComplete: false, 
        message: 'Error checking task status',
        progress: 0,
        remainingActions: 0
      };
    }
  }

  async checkAndExpireTasks(): Promise<void> {
    try {
      const tasksQuery = query(collection(db, this.collectionName));
      const querySnapshot = await getDocs(tasksQuery);
      
      const updatePromises: Promise<void>[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.cycleDaysCompleted >= data.cycleDays && !data.isExpired) {
          updatePromises.push(
            updateDoc(doc.ref, { isExpired: true })
          );
        }
      });
      
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log(`[TASK] Expired ${updatePromises.length} completed tasks`);
      }
    } catch (error) {
      console.error('[ERROR] Failed to check and expire tasks:', error);
    }
  }

  async getProductTaskProgress(
    userId: string,
    productId: string
  ): Promise<{
    progress: number;
    remainingDays: number;
    totalEarned: number;
    totalExpected: number;
    isExpired: boolean;
    completedActions: number;
    requiredActions: number;
  } | null> {
    try {
      const task = await this.getProductTask(userId, productId);
      if (!task) return null;

      const progress = Math.floor((task.cycleDaysCompleted / task.cycleDays) * 100);
      const remainingDays = Math.max(0, task.cycleDays - task.cycleDaysCompleted);

      return {
        progress,
        remainingDays,
        totalEarned: task.totalEarned,
        totalExpected: task.totalExpected,
        isExpired: task.isExpired,
        completedActions: task.completedActions,
        requiredActions: task.requiredActions
      };
    } catch (error) {
      console.error('[ERROR] Failed to get task progress:', error);
      return null;
    }
  }

  async resetDailyActions(userId: string, productId: string): Promise<void> {
    try {
      const taskId = `${userId}_${productId}`;
      await updateDoc(doc(db, this.collectionName, taskId), {
        completedActions: 0,
        currentActionStep: 1,
        lastActionTime: null
      });
      console.log(`[TASK] Reset daily actions for product ${productId}`);
    } catch (error) {
      console.error('[ERROR] Failed to reset daily actions:', error);
    }
  }

  // Get all tasks for a user
  async getUserProductTasks(userId: string): Promise<ProductTask[]> {
    try {
      const tasksQuery = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(tasksQuery);
      
      const tasks = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          lastCompletedAt: data.lastCompletedAt ? new Date(data.lastCompletedAt.toDate()) : null,
          nextAvailableTime: data.nextAvailableTime ? new Date(data.nextAvailableTime.toDate()) : null,
          lastActionTime: data.lastActionTime ? new Date(data.lastActionTime.toDate()) : null
        } as ProductTask;
      });

      // Note: Reset logic is now handled in the frontend to avoid race conditions
      // and ensure proper 24-hour cooldown enforcement
      
      return tasks;
    } catch (error) {
      console.error('[ERROR] Failed to get user product tasks:', error);
      return [];
    }
  }

  // Get active (non-expired) tasks for a user
  async getUserActiveTasks(userId: string): Promise<ProductTask[]> {
    try {
      const allTasks = await this.getUserProductTasks(userId);
      return allTasks.filter(task => !task.isExpired);
    } catch (error) {
      console.error('[ERROR] Failed to get user active tasks:', error);
      return [];
    }
  }

  // Get user's total earnings from all product tasks
  async getUserTotalEarnings(userId: string): Promise<{
    totalEarned: number;
    totalExpected: number;
    activeProducts: number;
    completedProducts: number;
  }> {
    try {
      const allTasks = await this.getUserProductTasks(userId);
      
      const totalEarned = allTasks.reduce((sum, task) => sum + task.totalEarned, 0);
      const totalExpected = allTasks.reduce((sum, task) => sum + task.totalExpected, 0);
      const activeProducts = allTasks.filter(task => !task.isExpired).length;
      const completedProducts = allTasks.filter(task => task.isExpired).length;
      
      return {
        totalEarned,
        totalExpected,
        activeProducts,
        completedProducts
      };
    } catch (error) {
      console.error('[ERROR] Failed to get user total earnings:', error);
      return {
        totalEarned: 0,
        totalExpected: 0,
        activeProducts: 0,
        completedProducts: 0
      };
    }
  }

  // Get tasks that are ready for completion (all actions done, cooldown expired)
  async getReadyTasks(userId: string): Promise<ProductTask[]> {
    try {
      const activeTasks = await this.getUserActiveTasks(userId);
      const readyTasks: ProductTask[] = [];
      
      for (const task of activeTasks) {
        const status = await this.canCompleteProductTask(userId, task.productId);
        if (status.canComplete) {
          readyTasks.push(task);
        }
      }
      
      return readyTasks;
    } catch (error) {
      console.error('[ERROR] Failed to get ready tasks:', error);
      return [];
    }
  }

  // Batch complete multiple task actions for a product
  async batchCompleteActions(
    userId: string,
    productId: string,
    actionTypes: string[]
  ): Promise<{ success: boolean; message: string; completedActions: number; failedActions: string[] }> {
    try {
      const task = await this.getProductTask(userId, productId);
      if (!task) {
        return { 
          success: false, 
          message: 'Task not found', 
          completedActions: 0, 
          failedActions: [] 
        };
      }

      if (task.isExpired) {
        return { 
          success: false, 
          message: 'Product cycle completed, task expired', 
          completedActions: 0, 
          failedActions: actionTypes 
        };
      }

      const failedActions: string[] = [];
      let completedActions = task.completedActions;

      for (const actionType of actionTypes) {
        if (task.actionTypes.includes(actionType)) {
          const result = await this.completeTaskAction(userId, productId, actionType);
          if (result.success) {
            completedActions = result.progress * task.requiredActions / 100;
          } else {
            failedActions.push(actionType);
          }
        } else {
          failedActions.push(actionType);
        }
      }

      const success = failedActions.length === 0;
      const message = success 
        ? `Successfully completed ${actionTypes.length} actions`
        : `Completed ${actionTypes.length - failedActions.length} actions, failed: ${failedActions.join(', ')}`;

      return {
        success,
        message,
        completedActions: Math.floor(completedActions),
        failedActions
      };
    } catch (error) {
      console.error('[ERROR] Failed to batch complete actions:', error);
      return {
        success: false,
        message: 'Failed to batch complete actions',
        completedActions: 0,
        failedActions: actionTypes
      };
    }
  }

  // Check if a task is currently locked (within 24-hour cooldown)
  async isTaskLocked(userId: string, productId: string): Promise<{
    isLocked: boolean;
    hoursRemaining: number;
    minutesRemaining: number;
    message: string;
  }> {
    try {
      const task = await this.getProductTask(userId, productId);
      if (!task || !task.lastCompletedAt) {
        return { isLocked: false, hoursRemaining: 0, minutesRemaining: 0, message: 'Task not found or never completed' };
      }

      const now = new Date();
      const lastCompletion = new Date(task.lastCompletedAt);
      const timeSinceLastCompletion = now.getTime() - lastCompletion.getTime();
      const hoursRemaining = 24 - (timeSinceLastCompletion / (1000 * 60 * 60));
      
      if (hoursRemaining > 0) {
        const hours = Math.floor(hoursRemaining);
        const minutes = Math.floor((hoursRemaining - hours) * 60);
        return {
          isLocked: true,
          hoursRemaining: hours,
          minutesRemaining: minutes,
          message: `Task locked for ${hours}h ${minutes}m`
        };
      }
      
      return { isLocked: false, hoursRemaining: 0, minutesRemaining: 0, message: 'Task ready to complete' };
    } catch (error) {
      console.error('[ERROR] Failed to check task lock status:', error);
      return { isLocked: false, hoursRemaining: 0, minutesRemaining: 0, message: 'Error checking status' };
    }
  }

  // Check if 24-hour cooldown has expired and reset actions for next cycle
  async checkAndResetActionsAfterCooldown(userId: string, productId: string): Promise<{
    wasReset: boolean;
    message: string;
  }> {
    try {
      const task = await this.getProductTask(userId, productId);
      if (!task || !task.lastCompletedAt) {
        return { wasReset: false, message: 'Task not found or never completed' };
      }

      const now = new Date();
      const lastCompletion = new Date(task.lastCompletedAt);
      const timeSinceLastCompletion = now.getTime() - lastCompletion.getTime();
      const hoursRemaining = 24 - (timeSinceLastCompletion / (1000 * 60 * 60));
      
      // If 24 hours have passed, reset actions for next cycle
      if (hoursRemaining <= 0 && task.completedActions === 5) {
        console.log(`[TASK] 24-hour cooldown expired for ${task.productName}, resetting actions for next cycle`);
        
        await updateDoc(doc(db, this.collectionName, task.id), {
          completedActions: 0,
          currentActionStep: 1,
          lastActionTime: null
        });
        
        return { 
          wasReset: true, 
          message: `Actions reset for next cycle! Complete 5 actions again to earn your daily reward.` 
        };
      }
      
      return { wasReset: false, message: 'Cooldown not expired yet' };
    } catch (error) {
      console.error('[ERROR] Failed to check and reset actions:', error);
      return { wasReset: false, message: 'Error checking cooldown status' };
    }
  }

  // Get task statistics for analytics
  async getTaskStatistics(userId: string): Promise<{
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    averageProgress: number;
    totalActionsCompleted: number;
    totalActionsRequired: number;
    estimatedCompletionTime: string;
  }> {
    try {
      const allTasks = await this.getUserProductTasks(userId);
      const activeTasks = allTasks.filter(task => !task.isExpired);
      const completedTasks = allTasks.filter(task => task.isExpired);
      
      const totalActionsCompleted = allTasks.reduce((sum, task) => sum + task.completedActions, 0);
      const totalActionsRequired = allTasks.reduce((sum, task) => sum + task.requiredActions, 0);
      
      const averageProgress = allTasks.length > 0 
        ? Math.floor(allTasks.reduce((sum, task) => sum + (task.completedActions / task.requiredActions), 0) / allTasks.length * 100)
        : 0;
      
      // Estimate completion time based on current progress
      const estimatedCompletionTime = this.estimateCompletionTime(activeTasks);
      
      return {
        totalTasks: allTasks.length,
        activeTasks: activeTasks.length,
        completedTasks: completedTasks.length,
        averageProgress,
        totalActionsCompleted,
        totalActionsRequired,
        estimatedCompletionTime
      };
    } catch (error) {
      console.error('[ERROR] Failed to get task statistics:', error);
      return {
        totalTasks: 0,
        activeTasks: 0,
        completedTasks: 0,
        averageProgress: 0,
        totalActionsCompleted: 0,
        totalActionsRequired: 0,
        estimatedCompletionTime: 'Unknown'
      };
    }
  }

  // Private helper method to estimate completion time
  private estimateCompletionTime(activeTasks: ProductTask[]): string {
    if (activeTasks.length === 0) return 'No active tasks';
    
    const now = new Date();
    let totalDays = 0;
    
    for (const task of activeTasks) {
      if (task.lastCompletedAt) {
        const timeSinceLastCompletion = now.getTime() - task.lastCompletedAt.getTime();
        const hoursRemaining = 24 - (timeSinceLastCompletion / (1000 * 60 * 60));
        
        if (hoursRemaining > 0) {
          totalDays += hoursRemaining / 24;
        }
      }
      
      // Add remaining cycle days
      totalDays += task.cycleDays - task.cycleDaysCompleted;
    }
    
    const averageDays = totalDays / activeTasks.length;
    
    if (averageDays < 1) {
      return 'Less than 1 day';
    } else if (averageDays < 7) {
      return `${Math.ceil(averageDays)} days`;
    } else {
      const weeks = Math.ceil(averageDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''}`;
    }
  }

  // Delete a product task (for cleanup purposes)
  async deleteProductTask(userId: string, productId: string): Promise<boolean> {
    try {
      const taskId = `${userId}_${productId}`;
      await deleteDoc(doc(db, this.collectionName, taskId));
      console.log(`[TASK] Deleted product task for ${productId}`);
      return true;
    } catch (error) {
      console.error('[ERROR] Failed to delete product task:', error);
      return false;
    }
  }

  // Reset task cooldown (for testing purposes - remove in production)
  async resetTaskCooldown(userId: string, productId: string): Promise<boolean> {
    try {
      const taskId = `${userId}_${productId}`;
      await updateDoc(doc(db, this.collectionName, taskId), {
        lastCompletedAt: null,
        nextAvailableTime: null
      });
      console.log(`[TASK] Reset cooldown for product ${productId}`);
      return true;
    } catch (error) {
      console.error('[ERROR] Failed to reset task cooldown:', error);
      return false;
    }
  }
}




