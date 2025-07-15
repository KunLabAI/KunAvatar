import { spawn } from 'child_process';
import { detectLocalIP, updateEnvFile, displayNetworkInfo } from './kunavatar/scripts/detect-ip.js';

/**
 * 启动开发服务器前自动配置网络
 */
async function startDevWithAutoConfig() {
  console.log('🚀 KunAvatar 智能启动');
  console.log('================================');
  
  // 显示网络信息
  displayNetworkInfo();
  
  // 检测并更新IP配置
  const localIP = detectLocalIP();
  const appUrl = updateEnvFile(localIP);
  
  if (appUrl) {
    console.log('✅ 网络配置完成！');
    console.log('🔗 局域网访问地址:', appUrl);
    console.log('🔗 本地访问地址: http://localhost:3000');
    console.log('');
    console.log('🚀 正在启动开发服务器...');
    console.log('================================');
  }
  
  // 启动Next.js开发服务器
  const nextDev = spawn('npx', ['next', 'dev', '-H', '0.0.0.0'], {
    stdio: 'inherit',
    shell: true,
    cwd: './kunavatar' // 设置工作目录为kunavatar文件夹
  });
  
  // 处理进程退出
  nextDev.on('close', (code) => {
    console.log(`\n开发服务器已停止 (退出码: ${code})`);
  });
  
  // 处理中断信号
  process.on('SIGINT', () => {
    console.log('\n正在停止开发服务器...');
    nextDev.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    nextDev.kill('SIGTERM');
  });
}

// 启动
startDevWithAutoConfig().catch(console.error);