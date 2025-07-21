#!/usr/bin/env node

/**
 * 創建測試用戶並驗證 RecEngine 功能
 */

const http = require('http');

const BACKEND_URL = 'http://localhost:3001';

// 測試用戶資料
const testUser = {
    email: 'recengine.test@example.com',
    password: 'RecEngine123!',
    name: 'RecEngine Test User'
};

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonBody = JSON.parse(body);
                    resolve({ status: res.statusCode, data: jsonBody, headers: res.headers });
                } catch (error) {
                    resolve({ status: res.statusCode, data: body, headers: res.headers });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function createTestUser() {
    console.log('🧪 創建 RecEngine 測試用戶');
    console.log('================================\n');

    try {
        // 1. 嘗試註冊用戶
        console.log('1. 註冊測試用戶...');
        const registerOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/register',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const registerResult = await makeRequest(registerOptions, testUser);
        
        if (registerResult.status === 201 || registerResult.status === 409) {
            console.log('✅ 用戶已存在或註冊成功');
        } else {
            console.log('❌ 註冊失敗:', registerResult.data);
            return;
        }

        // 2. 登入用戶
        console.log('\n2. 登入測試用戶...');
        const loginOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const loginResult = await makeRequest(loginOptions, {
            email: testUser.email,
            password: testUser.password
        });

        if (loginResult.status !== 200) {
            console.log('❌ 登入失敗:', loginResult.data);
            return;
        }

        const token = loginResult.data.data?.token || loginResult.data.token;
        if (!token) {
            console.log('❌ 無法獲取登入 Token');
            return;
        }

        console.log('✅ 登入成功!');
        console.log('📝 用戶信息:');
        console.log(`   Email: ${testUser.email}`);
        console.log(`   Password: ${testUser.password}`);
        console.log(`   Token: ${token.substring(0, 20)}...`);

        // 3. 測試首頁推薦 API
        console.log('\n3. 測試首頁推薦 API...');
        const homepageOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/recommendations/homepage',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const homepageResult = await makeRequest(homepageOptions);
        console.log(`   狀態碼: ${homepageResult.status}`);
        
        if (homepageResult.status === 200) {
            console.log('✅ 首頁推薦 API 正常工作');
            console.log('   推薦結果預覽:', JSON.stringify(homepageResult.data, null, 2).substring(0, 200) + '...');
        } else {
            console.log('❌ 首頁推薦 API 錯誤:', homepageResult.data);
        }

        // 4. 測試推薦狀態
        console.log('\n4. 測試推薦服務狀態...');
        const statusOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/recommendations/status',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const statusResult = await makeRequest(statusOptions);
        console.log(`   狀態碼: ${statusResult.status}`);
        
        if (statusResult.status === 200) {
            console.log('✅ 推薦服務狀態正常');
            console.log('   服務狀態:', JSON.stringify(statusResult.data, null, 2));
        } else {
            console.log('❌ 推薦服務狀態錯誤:', statusResult.data);
        }

        // 輸出前端使用說明
        console.log('\n🎯 前端測試說明');
        console.log('================');
        console.log('');
        console.log('使用以下帳號登入前端來查看 RecEngine 功能:');
        console.log('');
        console.log(`📧 Email: ${testUser.email}`);
        console.log(`🔐 Password: ${testUser.password}`);
        console.log('');
        console.log('🔍 在前端中你應該看到:');
        console.log('');
        console.log('1. **首頁個人化推薦**');
        console.log('   - 信用卡推薦輪播');
        console.log('   - 個人化評分和推薦理由');
        console.log('   - 自動刷新功能');
        console.log('');
        console.log('2. **交易分析功能**');
        console.log('   - 在交易列表中點擊「分析」按鈕');
        console.log('   - 彈出推薦彈窗');
        console.log('   - 顯示更好的信用卡選擇');
        console.log('');
        console.log('3. **開發者工具檢查**');
        console.log('   - 按 F12 打開開發者工具');
        console.log('   - 查看 Network 標籤中的 API 調用');
        console.log('   - 應該看到對 /api/recommendations/ 的請求');
        console.log('');
        console.log('🚀 快速啟動前端:');
        console.log('   cd frontend && npm start');
        console.log('   打開 http://localhost:3000');

    } catch (error) {
        console.error('❌ 創建測試用戶時發生錯誤:', error.message);
    }
}

// 執行腳本
createTestUser();