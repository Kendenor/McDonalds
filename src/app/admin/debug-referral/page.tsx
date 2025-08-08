'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from '@/hooks/use-toast'
import { UserService, ReferralService } from '@/lib/user-service'

export default function DebugReferralPage() {
  const [userId, setUserId] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [userData, setUserData] = useState<any>(null)
  const [referralTree, setReferralTree] = useState<any>(null)
  const { toast } = useToast()

  const testReferralBonus = async () => {
    if (!userId || !depositAmount) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter both user ID and deposit amount.' })
      return
    }

    try {
      const amount = parseFloat(depositAmount)
      console.log('Testing referral bonus for user:', userId, 'amount:', amount)
      
      await ReferralService.processDepositReferralBonus(userId, amount)
      
      toast({ title: 'Success', description: 'Referral bonus test completed. Check console for details.' })
    } catch (error) {
      console.error('Error testing referral bonus:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to test referral bonus.' })
    }
  }

  const loadUserData = async () => {
    if (!userId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a user ID.' })
      return
    }

    try {
      const user = await UserService.getUserById(userId)
      setUserData(user)
      
      if (user) {
        const tree = await ReferralService.getReferralTree(userId)
        setReferralTree(tree)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load user data.' })
    }
  }

  const ensureReferralCodes = async () => {
    try {
      await ReferralService.ensureAllUsersHaveReferralCodes()
      toast({ title: 'Success', description: 'All users now have referral codes.' })
    } catch (error) {
      console.error('Error ensuring referral codes:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to ensure referral codes.' })
    }
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Referral System Debug</CardTitle>
          <CardDescription>Test and debug the referral bonus system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depositAmount">Deposit Amount</Label>
              <Input
                id="depositAmount"
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Enter deposit amount"
              />
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button onClick={loadUserData}>Load User Data</Button>
            <Button onClick={testReferralBonus}>Test Referral Bonus</Button>
            <Button onClick={ensureReferralCodes} variant="outline">Ensure Referral Codes</Button>
          </div>

          {userData && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">User Data:</h3>
              <pre className="text-sm overflow-auto">{JSON.stringify(userData, null, 2)}</pre>
            </div>
          )}

          {referralTree && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">Referral Tree:</h3>
              <div className="space-y-2">
                <div>Level 1 Referrals: {referralTree.level1.length}</div>
                <div>Level 2 Referrals: {referralTree.level2.length}</div>
                <div>Level 3 Referrals: {referralTree.level3.length}</div>
              </div>
              <pre className="text-sm overflow-auto mt-2">{JSON.stringify(referralTree, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
