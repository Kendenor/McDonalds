'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

export default function TestImagesPage() {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Basic Plan Images Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
              <div key={num} className="space-y-2">
                <h4 className="font-semibold">Basic {num}</h4>
                <div className="relative aspect-square w-full rounded-lg overflow-hidden">
                  <Image
                    src={`/images/basic_${num}.png.jpg`}
                    alt={`Basic ${num}`}
                    fill={true}
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/promo-banner.png';
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 