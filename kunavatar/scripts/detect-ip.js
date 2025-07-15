import { networkInterfaces } from 'os';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * 自动检测本机局域网IP地址并更新环境配置
 */
function detectLocalIP() {
  const nets = networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // 跳过内部地址和IPv6地址
      if (net.family === 'IPv4' && !net.internal) {
        // 优先选择局域网地址
        if (net.address.startsWith('192.168.') || 
            net.address.startsWith('10.') || 
            net.address.startsWith('172.')) {
          results.push({
            name,
            address: net.address,
            priority: 1 // 局域网地址优先级最高
          });
        } else {
          results.push({
            name,
            address: net.address,
            priority: 2
          });
        }
      }
    }
  }

  // 按优先级排序，返回最佳IP
  results.sort((a, b) => a.priority - b.priority);
  return results.length > 0 ? results[0].address : 'localhost';
}

/**
 * 更新.env.local文件中的应用URL
 */
function updateEnvFile(ip) {
  const envPath = join(process.cwd(), 'kunavatar', '.env.local');
  
  try {
    let envContent = readFileSync(envPath, 'utf8');
    
    // 更新NEXT_PUBLIC_APP_URL
    const newUrl = `http://${ip}:3000`;
    const urlRegex = /NEXT_PUBLIC_APP_URL=.*/;
    
    if (urlRegex.test(envContent)) {
      envContent = envContent.replace(urlRegex, `NEXT_PUBLIC_APP_URL=${newUrl}`);
    } else {
      envContent += `\nNEXT_PUBLIC_APP_URL=${newUrl}\n`;
    }
    
    writeFileSync(envPath, envContent);
    
    console.log('🌐 自动检测到本机IP地址:', ip);
    console.log('📝 已更新环境配置文件');
    console.log('🔗 局域网访问地址:', newUrl);
    console.log('🔗 本地访问地址: http://localhost:3000');
    console.log('');
    
    return newUrl;
  } catch (error) {
    console.error('❌ 更新环境文件失败:', error.message);
    return null;
  }
}

/**
 * 显示网络信息
 */
function displayNetworkInfo() {
  const nets = networkInterfaces();
  console.log('📡 检测到的网络接口:');
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        const type = net.address.startsWith('192.168.') || 
                    net.address.startsWith('10.') || 
                    net.address.startsWith('172.') ? '局域网' : '公网';
        console.log(`  ${name}: ${net.address} (${type})`);
      }
    }
  }
  console.log('');
}

// 主函数
function main() {
  console.log('🚀 KunAvatar 自动网络配置');
  console.log('================================');
  
  displayNetworkInfo();
  
  const localIP = detectLocalIP();
  const appUrl = updateEnvFile(localIP);
  
  if (appUrl) {
    console.log('✅ 网络配置完成！');
    console.log('💡 提示: 确保防火墙允许端口3000的访问');
    console.log('💡 提示: 局域网内其他设备可通过以上地址访问');
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { detectLocalIP, updateEnvFile, displayNetworkInfo };