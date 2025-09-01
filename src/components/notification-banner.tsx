'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SettingsService } from '@/lib/firebase-service';

interface NotificationBannerProps {
  showOnAllPages?: boolean;
  currentPath?: string;
}

export function NotificationBanner({ showOnAllPages = true, currentPath }: NotificationBannerProps) {
  const [banner, setBanner] = useState<{
    enabled: boolean;
    message: string;
    backgroundColor: string;
    textColor: string;
    showOnAllPages: boolean;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const loadBannerSettings = async () => {
      try {
        const settings = await SettingsService.getSettings();
        if (settings.notificationBanner) {
          setBanner(settings.notificationBanner);
          setIsVisible(settings.notificationBanner.enabled);
        }
      } catch (error) {
        console.error('Error loading notification banner settings:', error);
      }
    };

    loadBannerSettings();

    // Listen for settings changes
    const unsubscribe = SettingsService.onSettingsChange((settings) => {
      if (settings.notificationBanner) {
        setBanner(settings.notificationBanner);
        setIsVisible(settings.notificationBanner.enabled);
      }
    });

    return () => unsubscribe();
  }, []);

  // Check if banner should be shown on current page
  const shouldShowOnCurrentPage = () => {
    if (!banner) return false;
    if (banner.showOnAllPages) return true;
    if (!currentPath) return true;
    
    // Add logic here if you want to show banner only on specific pages
    return true;
  };

  if (!banner || !banner.enabled || !isVisible || !shouldShowOnCurrentPage()) {
    return null;
  }

  return (
    <div 
      className="w-full py-3 px-4 text-center relative"
      style={{
        backgroundColor: banner.backgroundColor,
        color: banner.textColor
      }}
    >
      <div className="max-w-7xl mx-auto">
        <p className="text-sm font-medium">{banner.message}</p>
      </div>
      
      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded transition-colors"
        style={{ color: banner.textColor }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
