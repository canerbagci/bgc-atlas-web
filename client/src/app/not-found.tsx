import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-lg">
        <CardContent className="p-12 text-center">
          {/* Animated DNA Helix */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="text-8xl font-bold text-blue-600">
                404
              </div>
              <div className="absolute -top-2 -right-2 text-2xl animate-spin">
                🧬
              </div>
            </div>
          </div>
          
          {/* Main Message */}
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Page Not Found
          </h1>
          
          <div className="text-lg text-gray-600 mb-8">
            <p>
              The page you are looking for could not be found.
            </p>
            <p className="text-base mt-2">
              Please check the URL or navigate back to continue browsing the BGC Atlas.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg" className="w-full sm:w-auto">
                Return to Home
              </Button>
            </Link>
            <Link href="/browse">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Browse Database
              </Button>
            </Link>
          </div>
          
          {/* Footer Message */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Error 404 - Page Not Found
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}