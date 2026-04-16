/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
  async headers() {
    return [
      {
        source: '/api/auth/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
}
module.exports = nextConfig
