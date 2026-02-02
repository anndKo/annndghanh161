import { useEffect } from 'react';

/**
 * Hook to block the back button on mobile devices
 * Prevents users from accidentally navigating away from the app
 */
export const useBackButtonBlock = () => {
  useEffect(() => {
    // Push a state so we can intercept back button
    window.history.pushState(null, '', window.location.href);
    
    const handlePopState = (event: PopStateEvent) => {
      // Prevent navigation by pushing state again
      window.history.pushState(null, '', window.location.href);
      event.preventDefault();
    };

    // Handle back button press
    window.addEventListener('popstate', handlePopState);

    // Also handle beforeunload for extra protection
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    // Only add beforeunload on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (isMobile) {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, []);
};

export default useBackButtonBlock;
