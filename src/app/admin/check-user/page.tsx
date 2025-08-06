'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function CheckUserPage() {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<string>('');

  const checkUser = async () => {
    setIsChecking(true);
    setResult('Checking...');
    
    try {
      const methods = await fetchSignInMethodsForEmail(auth, 'mcdonald@gmail.com');
      
      if (methods.length > 0) {
        setResult(`✅ User EXISTS! Sign-in methods: ${methods.join(', ')}`);
        toast({
          title: "User Found",
          description: `The user mcdonald@gmail.com exists with methods: ${methods.join(', ')}`,
        });
      } else {
        setResult('❌ User does NOT exist. You need to create it in Firebase Console.');
        toast({
          variant: "destructive",
          title: "User Not Found",
          description: "The user mcdonald@gmail.com does not exist in Firebase Authentication.",
        });
      }
    } catch (error: any) {
      setResult(`❌ Error checking user: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to check user: ${error.message}`,
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md bg-card border-none shadow-2xl shadow-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Check Admin User</CardTitle>
          <CardDescription>Check if mcdonald@gmail.com exists in Firebase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={checkUser} 
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? 'Checking...' : 'Check User Exists'}
          </Button>
          
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Result:</h3>
            <p className="text-sm">{result}</p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "Check User Exists"</li>
              <li>If user doesn't exist, create it in Firebase Console</li>
              <li>Go to Authentication → Users → Add User</li>
              <li>Email: mcdonald@gmail.com</li>
              <li>Set a password (at least 6 characters)</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 