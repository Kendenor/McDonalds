
'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Loader } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { UserService, ReferralService } from '@/lib/user-service';

function TeamTable({ level, teamData }: { level: 'level1' | 'level2' | 'level3', teamData: any }) {
    const users = teamData[level] || [];
    
    if (users.length === 0) {
        return (
             <Card className="bg-card/50 mt-4">
                <CardContent className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                        <User size={40} className="text-primary"/>
                    </div>
                    <h3 className="text-lg font-semibold">No Users Yet</h3>
                    <p className="text-muted-foreground text-sm">No users have been referred at this level yet.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-card/50 mt-4 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deposited</TableHead>
                        <TableHead className="text-right">Join Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user: any) => (
                         <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.phone}</TableCell>
                            <TableCell>
                                <Badge variant={user.status === 'Active' ? 'default' : 'destructive'}>
                                    {user.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={user.hasDeposited ? 'default' : 'secondary'}>
                                    {user.hasDeposited ? 'Yes' : 'No'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {new Date(user.regDate).toLocaleDateString()}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    )
}

export default function MyTeamPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [teamData, setTeamData] = useState<{ level1: any[]; level2: any[]; level3: any[] }>({ level1: [], level2: [], level3: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if(currentUser) {
                try {
                        const referralTree = await ReferralService.getReferralTree(currentUser.uid);
                    setTeamData(referralTree);
                } catch (error) {
                    console.error('Error loading team data:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        });
        return () => unsubscribe();
    }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
        <div>
            <Tabs defaultValue="level1" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-card/50">
                    <TabsTrigger value="level1">Level 1</TabsTrigger>
                    <TabsTrigger value="level2">Level 2</TabsTrigger>
                    <TabsTrigger value="level3">Level 3</TabsTrigger>
                </TabsList>
                <TabsContent value="level1">
                    <TeamTable level="level1" teamData={teamData}/>
                </TabsContent>
                <TabsContent value="level2">
                     <TeamTable level="level2" teamData={teamData}/>
                </TabsContent>
                <TabsContent value="level3">
                    <TeamTable level="level3" teamData={teamData}/>
                </TabsContent>
            </Tabs>
        </div>
    </div>
  );
}
