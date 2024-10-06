"use client"; // This should be the first line of the file

import { useEffect } from 'react';

function BootstrapClient() {
  useEffect(() => {
    // Import Bootstrap JavaScript only on the client-side
    import('bootstrap/dist/js/bootstrap.bundle.min.js')
      .then(() => {
        // You can perform any additional initialization if needed
      })
      .catch((error) => {
        console.error('Error loading Bootstrap:', error);
      });
  }, []);

  return null; // This component doesn't render anything
}

export default BootstrapClient;
