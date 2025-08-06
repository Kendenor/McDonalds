'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ClearDataPage() {
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);

  const clearLocalStorage = () => {
    try {
      // Clear all localStorage data
      localStorage.clear();
      toast({
        title: "LocalStorage Cleared",
        description: "All localStorage data has been removed.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear localStorage.",
      });
    }
  };

  const clearFirebaseData = async () => {
    setIsClearing(true);
    try {
      // Clear transactions
      const transactionsSnapshot = await getDocs(collection(db, 'transactions'));
      for (const doc of transactionsSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // Clear users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      for (const doc of usersSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // Clear data collection
      const dataSnapshot = await getDocs(collection(db, 'data'));
      for (const doc of dataSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      toast({
        title: "Firebase Data Cleared",
        description: "All Firebase data has been removed.",
      });
    } catch (error) {
      console.error('Error clearing Firebase data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear Firebase data.",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to clear ALL data? This action cannot be undone.')) {
      return;
    }
    
    setIsClearing(true);
    try {
      await clearFirebaseData();
      clearLocalStorage();
      toast({
        title: "All Data Cleared",
        description: "Both localStorage and Firebase data have been cleared.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear all data.",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Clear Data</CardTitle>
          <CardDescription>Clear existing data to fix duplicate key issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button 
              onClick={clearLocalStorage} 
              variant="outline" 
              className="w-full"
            >
              Clear LocalStorage Only
            </Button>
            
            <Button 
              onClick={clearFirebaseData} 
              variant="outline" 
              className="w-full"
              disabled={isClearing}
            >
              {isClearing ? 'Clearing...' : 'Clear Firebase Data Only'}
            </Button>
            
            <Button 
              onClick={clearAllData} 
              variant="destructive" 
              className="w-full"
              disabled={isClearing}
            >
              {isClearing ? 'Clearing All...' : 'Clear ALL Data'}
            </Button>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <h3 className="font-semibold mb-2 text-red-600 dark:text-red-400">⚠️ Warning:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-600 dark:text-red-400">
              <li>This will permanently delete all data</li>
              <li>Users, transactions, and settings will be lost</li>
              <li>You'll need to re-register users</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "Clear ALL Data" to remove duplicate keys</li>
              <li>Refresh the admin dashboard</li>
              <li>The duplicate key error should be gone</li>
              <li>New data will be created with unique IDs</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 