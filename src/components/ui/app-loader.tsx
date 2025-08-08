import { Loader } from 'lucide-react';

interface AppLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function AppLoader({ size = 'md', text, className = '' }: AppLoaderProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative">
        <Loader className={`${sizeClasses[size]} text-primary animate-spin`} />
        <div className={`absolute inset-0 ${sizeClasses[size]} border-2 border-primary/20 rounded-full animate-pulse`} />
      </div>
      {text && (
        <p className={`${textSizes[size]} text-muted-foreground font-medium animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );
}

export function FullScreenLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card p-8 rounded-2xl shadow-2xl border">
        <AppLoader size="lg" text={text} />
      </div>
    </div>
  );
}