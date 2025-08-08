import { Suspense } from 'react';
import RegisterClient from './RegisterClient';
import { AppLoader } from '@/components/ui/app-loader';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="dark flex items-center justify-center min-h-screen bg-background"><AppLoader size="lg" text="Loading registration..." /></div>}>
      <RegisterClient />
    </Suspense>
  );
}
