import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add your existing configuration here if needed
    dest: 'public',
    // disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // scope: '/app',
  sw: 'sw.js',
  //...
};

export default withPWA(nextConfig);
