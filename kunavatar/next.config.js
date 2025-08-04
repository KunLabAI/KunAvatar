/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // 移除已废弃的 appDir 配置
  experimental: {
    // 优化服务器启动性能
    serverMinification: false, // 禁用服务器代码压缩以加快启动
    optimizeServerReact: false, // 禁用服务器React优化以加快启动
    serverComponentsHmrCache: false, // 禁用HMR缓存
  },
  // Electron支持配置 - 使用standalone模式
  output: 'standalone',
  trailingSlash: false,
  // 优化图片处理
  images: {
    unoptimized: true, // 禁用图片优化以减少启动时间
  },
  // 禁用一些不必要的功能以加快启动
  compress: false, // 禁用gzip压缩
  poweredByHeader: false, // 禁用X-Powered-By头
  generateEtags: false, // 禁用ETag生成
  
  // 添加重写规则，确保上传文件在Electron环境下能正确访问
  async rewrites() {
    return [
      {
        source: '/upload/:path*',
        destination: '/api/upload/:path*',
      },
    ];
  },
}

export default nextConfig