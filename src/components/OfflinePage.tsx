import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

export const OfflinePage: React.FC = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center">
        <div className="mx-auto h-24 w-24 text-gray-400 mb-6">
          <WifiOff className="h-full w-full" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          You're Offline
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
          It looks like you've lost your internet connection. 
          Please check your connection and try again.
        </p>
        
        <Button
          onClick={handleRefresh}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          HarvestChain works offline for basic features
        </p>
      </div>
    </div>
  );
};
