import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Quote form allows up to 5 files * 10 MB each, capped at 25 MB
      // total per submission. Default is 1 MB, which is too small.
      bodySizeLimit: '26mb',
    },
  },
};

export default nextConfig;
