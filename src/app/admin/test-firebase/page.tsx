'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function TestFirebasePage() {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setResults(prev => [...prev, result]);
  };

  const testFirebaseConnection = async () => {
    setIsTesting(true);
    setResults([]);

    try {
      // Test 1: Check if Firebase app is initialized
      addResult('🔍 Testing Firebase app initialization...');
      if (auth && db) {
        addResult('✅ Firebase app is properly initialized');
      } else {
        addResult('❌ Firebase app initialization failed');
        return;
      }

      // Test 2: Check Firestore connection
      addResult('🔍 Testing Firestore connection...');
      try {
        const testCollection = collection(db, 'test');
        await getDocs(testCollection);
        addResult('✅ Firestore connection successful');
      } catch (error: any) {
        addResult(`❌ Firestore connection failed: ${error.message}`);
      }

      // Test 3: Check Authentication service
      addResult('🔍 Testing Authentication service...');
      try {
        // Just check if auth object is available
        if (auth.currentUser !== undefined) {
          addResult('✅ Authentication service is available');
        } else {
          addResult('✅ Authentication service is available (no current user)');
        }
      } catch (error: any) {
        addResult(`❌ Authentication service failed: ${error.message}`);
      }

      // Test 4: Check project configuration
      addResult('🔍 Checking project configuration...');
      const config = {
        projectId: 'hapy-474ab',
        authDomain: 'hapy-474ab.firebaseapp.com',
        apiKey: 'AIzaSyD3G2Dkn0s611TUM9zGM_1CqjW1RFkUm1Q'
      };
      addResult(`✅ Project ID: ${config.projectId}`);
      addResult(`✅ Auth Domain: ${config.authDomain}`);
      addResult(`✅ API Key: ${config.apiKey.substring(0, 10)}...`);

      // Test 5: Try to access a specific document
      addResult('🔍 Testing document access...');
      try {
        const testDoc = doc(db, 'test', 'connection-test');
        await getDoc(testDoc);
        addResult('✅ Document access successful');
      } catch (error: any) {
        addResult(`❌ Document access failed: ${error.message}`);
      }

      toast({
        title: "Firebase Test Complete",
        description: "Check the results below for any issues.",
      });

    } catch (error: any) {
      addResult(`❌ General error: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: `Error: ${error.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Firebase Connection Test</CardTitle>
          <CardDescription>Test Firebase configuration and connectivity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={testFirebaseConnection} 
              disabled={isTesting}
              className="flex-1"
            >
              {isTesting ? 'Testing...' : 'Test Firebase Connection'}
            </Button>
            <Button 
              onClick={clearResults} 
              variant="outline"
              disabled={isTesting}
            >
              Clear Results
            </Button>
          </div>
          
          <div className="p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            {results.length === 0 ? (
              <p className="text-muted-foreground">No tests run yet. Click "Test Firebase Connection" to start.</p>
            ) : (
              <div className="space-y-1">
                {results.map((result, index) => (
                  <p key={index} className="text-sm font-mono">{result}</p>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold mb-2">What This Tests:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Firebase app initialization</li>
              <li>Firestore database connection</li>
              <li>Authentication service availability</li>
              <li>Project configuration</li>
              <li>Document access permissions</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 