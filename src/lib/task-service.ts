import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';

// Helper function to check if we're on client side
function isClientSide() {
  return typeof window !== 'undefined';
}

// Task Service
export class TaskService {
  private static COLLECTION = 'tasks';

  // Get user's daily tasks
  static async getUserTasks(userId: string): Promise<any[]> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get user tasks');
      return [];
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(collection(db, this.COLLECTION), where('userId', '==', userId), where('dateKey', '==', today));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user tasks:', error);
      return [];
    }
  }

  // Create or update daily tasks for user
  static async createDailyTasks(userId: string): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot create daily tasks');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if tasks already exist for today
      const existingTasks = await this.getUserTasks(userId);
      if (existingTasks.length > 0) return;

      // Create default daily tasks
      const dailyTasks = [
        {
          userId,
          dateKey: today,
          taskType: 'daily_checkin',
          title: 'Daily Check-in',
          description: 'Check in to earn daily bonus',
          reward: 50,
          completed: false,
          createdAt: serverTimestamp()
        },
        {
          userId,
          dateKey: today,
          taskType: 'claim_earnings',
          title: 'Claim Daily Earnings',
          description: 'Claim earnings from your active investments',
          reward: 25,
          completed: false,
          createdAt: serverTimestamp()
        },
        {
          userId,
          dateKey: today,
          taskType: 'refer_friend',
          title: 'Refer a Friend',
          description: 'Share your referral link with friends',
          reward: 100,
          completed: false,
          createdAt: serverTimestamp()
        }
      ];

      // Add tasks to Firestore
      for (const task of dailyTasks) {
        await addDoc(collection(db, this.COLLECTION), task);
      }
    } catch (error) {
      console.error('Error creating daily tasks:', error);
    }
  }

  // Complete a task
  static async completeTask(taskId: string): Promise<void> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot complete task');
      return;
    }
    try {
      const taskDoc = doc(db, this.COLLECTION, taskId);
      await updateDoc(taskDoc, {
        completed: true,
        completedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error completing task:', error);
    }
  }

  // Get task completion status for today
  static async getTodayTaskStatus(userId: string): Promise<{ completed: number; total: number; totalReward: number }> {
    if (!isClientSide()) {
      console.warn('Firebase not initialized on server, cannot get task status');
      return { completed: 0, total: 0, totalReward: 0 };
    }
    try {
      const tasks = await this.getUserTasks(userId);
      const completed = tasks.filter(task => task.completed).length;
      const total = tasks.length;
      const totalReward = tasks.reduce((sum, task) => sum + (task.completed ? task.reward : 0), 0);
      
      return { completed, total, totalReward };
    } catch (error) {
      console.error('Error getting task status:', error);
      return { completed: 0, total: 0, totalReward: 0 };
    }
  }
}
