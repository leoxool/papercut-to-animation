const { spawn } = require('child_process');

console.log('================================================');
console.log('   ArtClassroom 后端服务启动器');
console.log('================================================');
console.log('');

// 启动 API 服务器
console.log('🚀 启动 API 服务器 (端口: 3001)...');
const apiServer = spawn('node', ['api-server.js'], {
    stdio: 'inherit',
    cwd: __dirname
});

// 启动 WebSocket 服务器
console.log('🚀 启动 WebSocket 服务器 (端口: 8080)...');
const wsServer = spawn('node', ['websocket-server.js'], {
    stdio: 'inherit',
    cwd: __dirname
});

// 错误处理
apiServer.on('error', (error) => {
    console.error('❌ API 服务器启动失败:', error);
});

wsServer.on('error', (error) => {
    console.error('❌ WebSocket 服务器启动失败:', error);
});

// 退出处理
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    apiServer.kill('SIGINT');
    wsServer.kill('SIGINT');
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

console.log('================================================');
console.log('✅ 所有服务已启动');
console.log('');
console.log('📊 服务状态:');
console.log('   - API 服务器: http://localhost:3001');
console.log('   - WebSocket: ws://localhost:8080');
console.log('');
console.log('💡 提示: 按 Ctrl+C 停止所有服务');
console.log('================================================');
