'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { SettingsService } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';

interface PopupNotificationProps {
  showOnHomePage?: boolean;
  currentPath?: string;
}

export function PopupNotification({ showOnHomePage = true, currentPath }: PopupNotificationProps) {
  const [popup, setPopup] = useState<{
    enabled: boolean;
    title: string;
    message: string;
    showOnHomePage: boolean;
    backgroundColor: string;
    textColor: string;
    buttonText?: string;
    buttonLink?: string;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const loadPopupSettings = async () => {
      try {
        const settings = await SettingsService.getSettings();
        if (settings.popupNotification) {
          setPopup(settings.popupNotification);
          setIsVisible(settings.popupNotification.enabled);
        }
      } catch (error) {
        console.error('Error loading popup notification settings:', error);
      }
    };

    loadPopupSettings();

    // Listen for settings changes
    const unsubscribe = SettingsService.onSettingsChange((settings) => {
      if (settings.popupNotification) {
        setPopup(settings.popupNotification);
        setIsVisible(settings.popupNotification.enabled);
      }
    });

    return () => unsubscribe();
  }, []);

  // Check if popup should be shown on current page
  const shouldShowOnCurrentPage = () => {
    if (!popup) return false;
    if (popup.showOnHomePage && currentPath === '/') return true;
    if (!currentPath) return true;
    
    return false;
  };

  if (!popup || !popup.enabled || !isVisible || !shouldShowOnCurrentPage()) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative"
        style={{
          backgroundColor: popup.backgroundColor,
          color: popup.textColor
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded transition-colors"
          style={{ color: popup.textColor }}
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold">{popup.title}</h2>
          <p className="text-sm leading-relaxed">{popup.message}</p>
          
          {popup.buttonText && popup.buttonLink && (
            <div className="pt-2">
              <Button
                onClick={() => {
                  if (popup.buttonLink?.startsWith('http')) {
                    window.open(popup.buttonLink, '_blank');
                  } else {
                    window.location.href = popup.buttonLink || '/';
                  }
                  setIsVisible(false);
                }}
                className="bg-white text-gray-900 hover:bg-gray-100 px-6 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto"
              >
                {popup.buttonText}
                {popup.buttonLink?.startsWith('http') && <ExternalLink size={16} />}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
