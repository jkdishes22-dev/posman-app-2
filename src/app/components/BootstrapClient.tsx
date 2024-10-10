"use client"; // This should be the first line of the file

import { useEffect } from 'react';

function BootstrapClient() {
  useEffect(() => {
    import('bootstrap/dist/js/bootstrap.bundle.min.js')
      .then(() => {
      })
      .catch((error) => {
        console.error('Error loading Bootstrap:', error);
      });
  }, []);

  return null; 
}

export default BootstrapClient;
