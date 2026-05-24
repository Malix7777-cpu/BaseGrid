/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Bypasses strict eslint checks during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Bypasses strict typescript checks during production builds
    ignoreBuildErrors: true,
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(porto|porto\/internal|@coinbase\/wallet-sdk|@metamask\/connect-evm|@safe-global\/safe-apps-sdk|@safe-global\/safe-apps-provider|@base-org\/account|@walletconnect\/ethereum-provider|accounts)$/,
      })
    );
    return config;
  },
};

export default nextConfig;
