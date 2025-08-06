
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

function McDonaldLogo({ className }: { className?: string }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M15.75 8.25L18.25 10.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M5.75 13.25L8.25 15.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M8 8H13.5C14.8807 8 16 9.11929 16 10.5V10.5C16 11.8807 14.8807 13 13.5 13H8C6.61929 13 5.5 14.1193 5.5 15.5V15.5C5.5 16.8807 6.61929 18 8 18H16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
      </svg>
    </div>
  );
}

export default function AboutPage() {
    return (
        <div className="space-y-6">
            <Card className="bg-card/50">
                <CardHeader className="items-center text-center">
                    <McDonaldLogo className="text-primary w-16 h-16" />
                    <CardTitle className="text-3xl font-bold text-primary">About McDonald's</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                    <p>
                        Welcome to McDonald's, a premier investment platform designed to empower your financial journey. Our mission is to provide accessible, reliable, and profitable investment opportunities for everyone. We believe in harnessing the power of strategic investments to create sustainable growth and long-term value for our clients.
                    </p>
                    <p>
                        Our team of experts carefully curates a diverse range of investment plans, from short-term gains to long-term wealth accumulation, ensuring that there's a perfect fit for every investor's goals. At McDonald's, we prioritize security, transparency, and user experience, utilizing cutting-edge technology to safeguard your assets and provide real-time insights into your portfolio.
                    </p>
                    <p>
                        Join our community of forward-thinking investors and take control of your financial future. With McDonald's, you're not just investing; you're building a legacy.
                    </p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <div className="relative aspect-square w-full rounded-lg overflow-hidden">
                    <Image
                        src="/images/about_1.png.jpg"
                        alt="Office"
                        fill={true}
                        className="object-cover"
                        data-ai-hint="office corporate"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/promo-banner.png';
                        }}
                    />
                </div>
                 <div className="relative aspect-square w-full rounded-lg overflow-hidden">
                    <Image
                        src="/images/about_2.png.jpg"
                        alt="Team meeting"
                        fill={true}
                        className="object-cover"
                        data-ai-hint="team meeting"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/promo-banner.png';
                        }}
                    />
                </div>
                 <div className="relative aspect-square w-full rounded-lg overflow-hidden">
                    <Image
                        src="/images/about_3.png.jpg"
                        alt="Financial chart"
                        fill={true}
                        className="object-cover"
                        data-ai-hint="financial chart"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/promo-banner.png';
                        }}
                    />
                </div>
                 <div className="relative aspect-square w-full rounded-lg overflow-hidden">
                    <Image
                        src="/images/about_1.png.jpg"
                        alt="Business handshake"
                        fill={true}
                        className="object-cover"
                        data-ai-hint="business handshake"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/promo-banner.png';
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
