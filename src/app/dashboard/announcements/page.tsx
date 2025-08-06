'use client'
import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, Calendar, Loader } from "lucide-react"
import { useToast } from '@/hooks/use-toast'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { AnnouncementService, NotificationService } from '@/lib/user-service'

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  isActive: boolean;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const activeAnnouncements = await AnnouncementService.getActiveAnnouncements();
          setAnnouncements(activeAnnouncements);
        } catch (error) {
          console.error('Error loading announcements:', error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to load announcements.' });
        } finally {
          setIsLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, [toast]);

  const markAsRead = async (announcementId: string) => {
    if (!user) return;
    
    try {
      // Create a notification for this announcement
      await NotificationService.createNotification({
        userId: user.uid,
        message: `Announcement: ${announcements.find(a => a.id === announcementId)?.title}`,
        date: new Date().toISOString(),
        read: true,
        type: 'announcement'
      });
      
      toast({ title: 'Marked as read', description: 'Announcement marked as read.' });
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view announcements.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="text-primary" />
        <h1 className="text-2xl font-bold">Announcements</h1>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No announcements</p>
            <p className="text-sm text-muted-foreground">Check back later for updates from the admin team.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="bg-card/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={announcement.isActive ? "default" : "secondary"}>
                      {announcement.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(announcement.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <CardDescription>
                  Posted on {new Date(announcement.date).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-foreground leading-relaxed">{announcement.content}</p>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => markAsRead(announcement.id)}
                    className="text-sm text-primary hover:underline"
                  >
                    Mark as read
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
