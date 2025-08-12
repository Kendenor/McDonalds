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
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<{ completed: number; total: number; totalReward: number }>({ completed: 0, total: 0, totalReward: 0 });
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Create daily tasks if they don't exist
          await TaskService.createDailyTasks(currentUser.uid);
          
          // Load tasks and status
          const userTasks = await TaskService.getUserTasks(currentUser.uid);
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

  const handleCompleteTask = async (taskId: string, reward: number) => {
    if (!user) return;

    setIsCompleting(taskId);
    try {
      // Complete the task
      await TaskService.completeTask(taskId);
      
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
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, completed: true } : task
      ));
      
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
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-yellow-600 dark:text-yellow-400">
                            ₦{task.reward.toLocaleString()} Reward
                          </span>
                        </div>
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
                        onClick={() => handleCompleteTask(task.id, task.reward)}
                        disabled={isCompleting === task.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isCompleting === task.id ? (
                          <Loader className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Complete Task
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
        </CardContent>
      </Card>
    </div>
  );
}
