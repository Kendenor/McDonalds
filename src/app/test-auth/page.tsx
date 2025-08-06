'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { generateEmailAddress, formatPhoneNumber, getAuthErrorMessage } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function TestAuthPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const { toast } = useToast();

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testPhoneFormatting = () => {
    addResult('Testing phone number formatting...');
    
    const testCases = [
      '08012345678',
      '8012345678', 
      '+2348012345678',
      '2348012345678',
      '080123456789', // too long
      '801234567' // too short
    ];

    testCases.forEach(testCase => {
      try {
        const formatted = formatPhoneNumber(testCase);
        addResult(`✅ ${testCase} -> ${formatted}`);
      } catch (error: any) {
        addResult(`❌ ${testCase} -> ${error.message}`);
      }
    });
  };

  const testEmailGeneration = () => {
    addResult('Testing email generation...');
    
    const testCases = ['8012345678', '08012345678', '+2348012345678'];
    
    testCases.forEach(testCase => {
      try {
        const email = generateEmailAddress(testCase);
        addResult(`✅ ${testCase} -> ${email}`);
      } catch (error: any) {
        addResult(`❌ ${testCase} -> ${error.message}`);
      }
    });
  };

  const testRegistration = async () => {
    if (!phone || !password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter phone number and password.",
      });
      return;
    }

    setIsLoading(true);
    addResult('Testing registration...');

    try {
      const formattedPhone = formatPhoneNumber(phone);
      const email = generateEmailAddress(formattedPhone);
      
      addResult(`Attempting to create account with email: ${email}`);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      addResult(`✅ Registration successful! User ID: ${userCredential.user.uid}`);
      
      // Sign out immediately
      await auth.signOut();
      addResult('Signed out after successful registration');
      
      toast({
        title: "Registration Test Successful",
        description: "Account created and signed out successfully.",
      });
      
         } catch (error: any) {
       const errorMessage = getAuthErrorMessage(error, 'registration');
       
       addResult(`❌ Registration failed: ${error.code} - ${errorMessage}`);
       toast({
         variant: "destructive",
         title: "Registration Test Failed",
         description: errorMessage,
       });
     } finally {
      setIsLoading(false);
    }
  };

  const testLogin = async () => {
    if (!phone || !password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter phone number and password.",
      });
      return;
    }

    setIsLoading(true);
    addResult('Testing login...');

    try {
      const formattedPhone = formatPhoneNumber(phone);
      const email = generateEmailAddress(formattedPhone);
      
      addResult(`Attempting to login with email: ${email}`);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      addResult(`✅ Login successful! User ID: ${userCredential.user.uid}`);
      
      // Sign out
      await auth.signOut();
      addResult('Signed out after successful login');
      
      toast({
        title: "Login Test Successful",
        description: "Login and sign out successful.",
      });
      
         } catch (error: any) {
       const errorMessage = getAuthErrorMessage(error, 'login');
       
       addResult(`❌ Login failed: ${error.code} - ${errorMessage}`);
       toast({
         variant: "destructive",
         title: "Login Test Failed",
         description: errorMessage,
       });
     } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="8012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={testPhoneFormatting} variant="outline">
              Test Phone Formatting
            </Button>
            <Button onClick={testEmailGeneration} variant="outline">
              Test Email Generation
            </Button>
            <Button onClick={testRegistration} disabled={isLoading}>
              {isLoading ? 'Testing...' : 'Test Registration'}
            </Button>
            <Button onClick={testLogin} disabled={isLoading} variant="secondary">
              {isLoading ? 'Testing...' : 'Test Login'}
            </Button>
            <Button onClick={clearResults} variant="destructive">
              Clear Results
            </Button>
          </div>
          
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            {testResults.length === 0 ? (
              <p className="text-gray-500">No test results yet. Run a test to see results here.</p>
            ) : (
              <div className="space-y-1">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 