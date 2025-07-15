/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // 移除已废弃的 appDir 配置
  experimental: {
    // 其他实验性功能可以在这里配置
  },
}

export default nextConfig