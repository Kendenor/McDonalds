'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Smartphone, Monitor, Apple, Play } from "lucide-react";

export default function DownloadsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-yellow-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Download className="h-8 w-8 text-red-600" />
            <h1 className="text-4xl font-bold text-gray-900">Download McDonald&apos;s App</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get the McDonald&apos;s app on your device for the best experience. Order ahead, 
            get exclusive deals, and earn rewards with every purchase!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Mobile App */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="h-6 w-6 text-red-600" />
                <CardTitle>Mobile App</CardTitle>
              </div>
              <CardDescription>
                Download our mobile app for iOS and Android devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Version:</span>
                <Badge variant="secondary">v1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Size:</span>
                <span className="text-sm text-gray-600">~25 MB</span>
              </div>
              
              <div className="space-y-2">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/downloads/android/McDonald-App.apk';
                    link.download = 'McDonald-App.apk';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Download for Android (APK)
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/downloads/ios/McDonald-App.ipa';
                    link.download = 'McDonald-App.ipa';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Apple className="h-4 w-4 mr-2" />
                  Download for iOS (TestFlight)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Web App */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Monitor className="h-6 w-6 text-red-600" />
                <CardTitle>Web App</CardTitle>
              </div>
              <CardDescription>
                Access the McDonald&apos;s app directly in your browser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Platform:</span>
                <Badge variant="secondary">Any Device</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Requirements:</span>
                <span className="text-sm text-gray-600">Modern Browser</span>
              </div>
              
              <div className="space-y-2">
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Open Web App
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    if ('serviceWorker' in navigator) {
                      // Install as PWA
                      alert('Add to Home Screen for app-like experience!');
                    }
                  }}
                >
                  Install as PWA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>App Features</CardTitle>
            <CardDescription>
              Everything you need for the perfect McDonald&apos;s experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="bg-red-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <span className="text-red-600 text-xl">🍟</span>
                </div>
                <h3 className="font-semibold mb-1">Order Ahead</h3>
                <p className="text-sm text-gray-600">Skip the line and order your favorites</p>
              </div>
              
              <div className="text-center p-4">
                <div className="bg-yellow-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <span className="text-yellow-600 text-xl">🎁</span>
                </div>
                <h3 className="font-semibold mb-1">Exclusive Deals</h3>
                <p className="text-sm text-gray-600">Get app-only promotions and discounts</p>
              </div>
              
              <div className="text-center p-4">
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <span className="text-green-600 text-xl">⭐</span>
                </div>
                <h3 className="font-semibold mb-1">Earn Rewards</h3>
                <p className="text-sm text-gray-600">Collect points with every purchase</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Installation Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Installation Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-green-600 mb-2">📱 Android (APK):</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 ml-4">
                <li>Enable &quot;Unknown Sources&quot; in Settings &gt; Security</li>
                <li>Download the APK file from the link above</li>
                <li>Open the downloaded file and tap &quot;Install&quot;</li>
                <li>Once installed, you can find the app in your app drawer</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">🍎 iOS (TestFlight):</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 ml-4">
                <li>Install TestFlight from the App Store if you haven&apos;t already</li>
                <li>Download the IPA file or use the TestFlight invitation link</li>
                <li>Open with TestFlight to install the beta version</li>
                <li>The app will appear on your home screen</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
