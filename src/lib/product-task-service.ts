import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

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
    const dailyReward = Math.floor(totalReturn / cycleDays);
    const taskId = `${userId}_${productId}`;
    
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

    try {
      await setDoc(doc(db, this.collectionName, taskId), task);
      console.log(`[TASK] Created product task for ${productName}`);
      return task;
    } catch (error) {
      console.error('[ERROR] Failed to create product task:', error);
      throw error;
    }
  }

  async getProductTask(userId: string, productId: string): Promise<ProductTask | null> {
    try {
      const taskId = `${userId}_${productId}`;
      const taskDoc = await getDoc(doc(db, this.collectionName, taskId));
      
      if (taskDoc.exists()) {
        const data = taskDoc.data();
        return {
          ...data,
          lastCompletedAt: data.lastCompletedAt ? new Date(data.lastCompletedAt.toDate()) : null,
          nextAvailableTime: data.nextAvailableTime ? new Date(data.nextAvailableTime.toDate()) : null,
          lastActionTime: data.lastActionTime ? new Date(data.lastActionTime.toDate()) : null
        } as ProductTask;
      }
      return null;
    } catch (error) {
      console.error('[ERROR] Failed to get product task:', error);
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

      // Check if action was already completed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (task.lastActionTime && task.lastActionTime >= today) {
        // Check if this specific action was already completed
        const actionIndex = task.actionTypes.indexOf(actionType);
        if (task.completedActions > actionIndex) {
          return { success: false, message: 'This action was already completed today', progress: task.completedActions };
        }
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

      // Check 24-hour cooldown
      if (task.lastCompletedAt) {
        const now = new Date();
        const timeSinceLastCompletion = now.getTime() - task.lastCompletedAt.getTime();
        const hoursRemaining = 24 - (timeSinceLastCompletion / (1000 * 60 * 60));
        
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

      // Reset actions for next day
      const newCompletedActions = 0;
      const newCurrentActionStep = 1;

      await updateDoc(doc(db, this.collectionName, task.id), {
        totalEarned: newTotalEarned,
        cycleDaysCompleted: newCycleDaysCompleted,
        isExpired,
        nextAvailableTime,
        lastCompletedAt: new Date(),
        completedActions: newCompletedActions,
        currentActionStep: newCurrentActionStep,
        lastActionTime: null
      });

      console.log(`[TASK] Completed daily task for ${task.productName}, earned ₦${task.dailyReward}`);

      return {
        success: true,
        message: `Daily task completed! Earned ₦${task.dailyReward.toLocaleString()}`,
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

      // Check 24-hour cooldown
      if (task.lastCompletedAt) {
        const now = new Date();
        const timeSinceLastCompletion = now.getTime() - task.lastCompletedAt.getTime();
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
}




