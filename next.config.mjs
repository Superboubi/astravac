/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	swcMinify: true,
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		domains: ['localhost', 'astravac.vercel.app'],
	},
	experimental: {
		serverActions: true,
	},
}

export default nextConfig 