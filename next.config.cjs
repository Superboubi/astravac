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
		domains: ['localhost', 'astravac.vercel.app', 'astravac.astravacances.fr'],
	},
	experimental: {
		serverActions: true,
	},
}

module.exports = nextConfig 