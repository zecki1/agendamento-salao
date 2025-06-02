/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: process.env.NEXT_IGNORE_TYPE_ERRORS === '1',
    },
    images: {
        // domains: [], // 'domains' is deprecated, use 'remotePatterns' instead. Kept commented for reference.
        remotePatterns: [
            {
                protocol: "https",
                hostname: "r8yuwlnjsxoodaki.public.blob.vercel-storage.com",
                port: "",
                pathname: "/avatars/**",
            },
            {
                protocol: "https",
                hostname: "*.public.blob.vercel-storage.com", // Using wildcard hostname
                port: "",
                pathname: "/avatars/**",
            },
        ],
    },
};

module.exports = nextConfig;

