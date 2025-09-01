
import { Suspense } from 'react';
import LoginClient from './LoginClient';
import { AppLoader } from '@/components/ui/app-loader';
import { PopupNotification } from '@/components/popup-notification';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="dark flex items-center justify-center min-h-screen bg-background"><AppLoader size="lg" text="Loading login..." /></div>}>
      <LoginClient />
      <PopupNotification currentPath="/" />
    </Suspense>
  );
}
