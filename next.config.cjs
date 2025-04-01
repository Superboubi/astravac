/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    domains: ['your-project.supabase.co'],
  }
}

module.exports = nextConfig
