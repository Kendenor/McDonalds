'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function SimpleTestPage() {
  const { toast } = useToast();
  const [results, setResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setResults(prev => [...prev, result]);
  };

  const runSimpleTest = async () => {
    setResults([]);
    
    try {
      // Test 1: Check if Firebase objects exist
      addResult('🔍 Checking Firebase objects...');
      if (auth && db) {
        addResult('✅ Firebase objects exist');
      } else {
        addResult('❌ Firebase objects missing');
        return;
      }

      // Test 2: Check auth state
      addResult('🔍 Checking auth state...');
      const currentUser = auth.currentUser;
      addResult(`✅ Auth state: ${currentUser ? 'Logged in' : 'Not logged in'}`);

      // Test 3: Simple Firestore operation (without rules)
      addResult('🔍 Testing basic Firestore...');
      try {
        // This should work even with restrictive rules
        const testDoc = db.collection('test').doc('simple-test');
        addResult('✅ Firestore object created');
      } catch (error: any) {
        addResult(`❌ Firestore object creation failed: ${error.message}`);
      }

      toast({
        title: "Simple Test Complete",
        description: "Check results below",
      });

    } catch (error: any) {
      addResult(`❌ General error: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: `Error: ${error.message}`,
      });
    }
  };

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Simple Firebase Test</CardTitle>
          <CardDescription>Basic connectivity test</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runSimpleTest} className="w-full">
            Run Simple Test
          </Button>
          
          <div className="p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
            <h3 className="font-semibold mb-2">Results:</h3>
            {results.length === 0 ? (
              <p className="text-muted-foreground">No test run yet.</p>
            ) : (
              <div className="space-y-1">
                {results.map((result, index) => (
                  <p key={index} className="text-sm font-mono">{result}</p>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 