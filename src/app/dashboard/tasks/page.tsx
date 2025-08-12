'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Gift, Target, Trophy, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { TaskService } from '@/lib/task-service';
import { UserService } from '@/lib/user-service';
import { TransactionService } from '@/lib/user-service';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  taskType: string;
  maxCompletions?: number;
  completionsToday?: number;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<{ completed: number; total: number; totalReward: number }>({ completed: 0, total: 0, totalReward: 0 });
  const [hasActiveProducts, setHasActiveProducts] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Check if user has active products
          const hasProducts = await TaskService.hasActiveProducts(currentUser.uid);
          setHasActiveProducts(hasProducts);
          
          // Create daily tasks if they don't exist
          await TaskService.createDailyTasks(currentUser.uid);
          
          // Load tasks and status
          let userTasks = await TaskService.getUserTasks(currentUser.uid);
          
          // Filter out product daily task if user has no active products
          if (!hasProducts) {
            userTasks = userTasks.filter(task => task.taskType !== 'product_daily_task');
          }
          
          const status = await TaskService.getTodayTaskStatus(currentUser.uid);
          
          setTasks(userTasks);
          setTaskStatus(status);
        } catch (error) {
          console.error('Error loading tasks:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCompleteTask = async (taskId: string, reward: number, taskType: string) => {
    if (!user) return;

    setIsCompleting(taskId);
    try {
      let success = false;
      
      // Handle different task types
      if (taskType === 'product_daily_task') {
        // Use the new completion method for tasks with multiple completions
        success = await TaskService.completeTaskWithCount(taskId);
      } else {
        // Use the old method for single completion tasks
        await TaskService.completeTask(taskId);
        success = true;
      }
      
      if (!success) {
        toast({ 
          variant: 'destructive', 
          title: "Task Limit Reached", 
          description: "You have completed this task the maximum number of times today." 
        });
        return;
      }
      
      // Add reward to user balance
      const userData = await UserService.getUserById(user.uid);
      if (userData) {
        const newBalance = (userData.balance || 0) + reward;
        await UserService.saveUser({ ...userData, balance: newBalance });
      }

      // Create transaction record
      await TransactionService.createTransaction({
        userId: user.uid,
        userEmail: user.email || '',
        type: 'Investment',
        amount: reward,
        status: 'Completed',
        date: new Date().toISOString(),
        description: 'Task completion reward'
      });

      // Update local state
      setTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          if (taskType === 'product_daily_task') {
            const newCompletions = (task.completionsToday || 0) + 1;
            const isCompleted = newCompletions >= (task.maxCompletions || 1);
            return { 
              ...task, 
              completionsToday: newCompletions,
              completed: isCompleted
            };
          } else {
            return { ...task, completed: true };
          }
        }
        return task;
      }));
      
      // Update task status
      const newStatus = await TaskService.getTodayTaskStatus(user.uid);
      setTaskStatus(newStatus);

      toast({ 
        title: "Task Completed!", 
        description: `You earned ₦${reward} for completing this task!` 
      });
    } catch (error) {
      console.error('Error completing task:', error);
      toast({ 
        variant: 'destructive', 
        title: "Error", 
        description: "Failed to complete task. Please try again." 
      });
    } finally {
      setIsCompleting(null);
    }
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'daily_checkin':
        return <Clock className="h-5 w-5" />;
      case 'claim_earnings':
        return <Gift className="h-5 w-5" />;
      case 'refer_friend':
        return <Target className="h-5 w-5" />;
      default:
        return <Trophy className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Progress Summary */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <Trophy className="h-6 w-6" />
            Daily Tasks Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {taskStatus.completed}/{taskStatus.total}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">Tasks Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.round((taskStatus.completed / taskStatus.total) * 100)}%
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">Completion Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ₦{taskStatus.totalReward.toLocaleString()}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">Total Earned</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Today's Tasks</h2>
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tasks available today. Check back tomorrow!</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className={`transition-all duration-200 ${task.completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/40' : 'hover:shadow-md'}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${task.completed ? 'bg-green-100 dark:bg-green-800/40' : 'bg-blue-100 dark:bg-blue-800/40'}`}>
                      {getTaskIcon(task.taskType)}
                    </div>
                    <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{task.title}</h3>
                          {task.completed && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-3">{task.description}</p>
                        
                        {/* Show completion progress for multi-completion tasks */}
                        {task.maxCompletions && task.maxCompletions > 1 && (
                          <div className="mb-3">
                            <div className="flex justify-between items-center text-sm mb-1">
                              <span className="text-muted-foreground">Progress:</span>
                              <span className="font-medium">
                                {task.completionsToday || 0}/{task.maxCompletions}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${Math.min(((task.completionsToday || 0) / task.maxCompletions) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-yellow-600" />
                            <span className="font-medium text-yellow-600 dark:text-yellow-400">
                              ₦{task.reward.toLocaleString()} per completion
                            </span>
                          </div>
                          {task.maxCompletions && task.maxCompletions > 1 && (
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-600 dark:text-blue-400">
                                Max: ₦{(task.reward * (task.maxCompletions || 1)).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    {task.completed ? (
                      <div className="text-center">
                        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">Completed!</p>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleCompleteTask(task.id, task.reward, task.taskType)}
                        disabled={isCompleting === task.id || task.completed}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isCompleting === task.id ? (
                          <Loader className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        {task.maxCompletions && task.maxCompletions > 1 
                          ? `Complete (${(task.completionsToday || 0) + 1}/${task.maxCompletions})`
                          : 'Complete Task'
                        }
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Product Daily Task Info */}
      {hasActiveProducts && (
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-700/40">
          <CardHeader>
            <CardTitle className="text-purple-700 dark:text-purple-300">🚀 Product Daily Task Benefits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-purple-700 dark:text-purple-300">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>Complete 5 times daily for maximum earnings</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span>Earn ₦200 per completion (₦1,000 total daily)</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Available until your product cycle completes</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span>Resets every 24 hours at midnight</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips Section */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/40">
        <CardHeader>
          <CardTitle className="text-blue-700 dark:text-blue-300">💡 Tips for Success</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <p>• Complete all daily tasks to maximize your earnings</p>
          <p>• Tasks reset every day at midnight</p>
          <p>• Rewards are automatically added to your balance</p>
          <p>• Keep checking in daily to maintain your streak</p>
          {hasActiveProducts && (
            <p>• Product Daily Task gives you 5x earning potential daily!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
