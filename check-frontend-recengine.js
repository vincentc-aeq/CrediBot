#!/usr/bin/env node

/**
 * 前端 RecEngine 整合驗證腳本
 * 檢查前端是否正確使用 RecEngine 相關功能
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 檢查前端 RecEngine 整合狀態\n');

// 檢查前端文件是否存在 RecEngine 相關代碼
const frontendDir = '/Users/vincent.cho/workspace/learn/CrediBot/frontend/src';
const filesToCheck = [
    'hooks/useRecEngine.ts',
    'components/RecEngine/HomepageCarousel.tsx',
    'components/RecEngine/TransactionRecommendation.tsx'
];

console.log('📁 檢查 RecEngine 相關文件:');
filesToCheck.forEach(file => {
    const fullPath = path.join(frontendDir, file);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${exists ? '✅' : '❌'} ${file} ${exists ? '存在' : '不存在'}`);
    
    if (exists) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // 檢查是否包含 RecEngine API 調用
        const hasApiCalls = content.includes('recengine') || 
                          content.includes('RecEngine') ||
                          content.includes('/recommendations/');
        
        console.log(`     ${hasApiCalls ? '✅' : '❌'} 包含 RecEngine API 調用: ${hasApiCalls}`);
        
        // 檢查特定功能
        if (file.includes('useRecEngine')) {
            const features = [
                'useHomepageRecommendations',
                'analyzeTransaction',
                'usePortfolioOptimization'
            ];
            
            features.forEach(feature => {
                const hasFeature = content.includes(feature);
                console.log(`     ${hasFeature ? '✅' : '❌'} ${feature}: ${hasFeature}`);
            });
        }
    }
});

console.log('\n🔗 檢查 API 端點配置:');

// 檢查後端路由是否有 RecEngine 相關端點
const backendRoutesPath = '/Users/vincent.cho/workspace/learn/CrediBot/backend/src/routes/recommendations.ts';
if (fs.existsSync(backendRoutesPath)) {
    const content = fs.readFileSync(backendRoutesPath, 'utf8');
    
    const endpoints = [
        '/homepage',
        '/transaction-analysis', 
        '/optimization',
        '/estimate-rewards'
    ];
    
    endpoints.forEach(endpoint => {
        const hasEndpoint = content.includes(endpoint);
        console.log(`  ${hasEndpoint ? '✅' : '❌'} ${endpoint} 端點: ${hasEndpoint}`);
    });
} else {
    console.log('  ❌ recommendations.ts 路由文件不存在');
}

console.log('\n📦 檢查 RecEngine 服務檔案:');

// 檢查 RecEngine 服務文件
const recEngineServicePath = '/Users/vincent.cho/workspace/learn/CrediBot/backend/src/services/recengine/RecEngineService.ts';
if (fs.existsSync(recEngineServicePath)) {
    console.log('  ✅ RecEngineService.ts 存在');
    
    const content = fs.readFileSync(recEngineServicePath, 'utf8');
    
    const methods = [
        'classifyTrigger',
        'getPersonalizedRanking',
        'estimateRewards',
        'optimizePortfolio'
    ];
    
    methods.forEach(method => {
        const hasMethod = content.includes(method);
        console.log(`     ${hasMethod ? '✅' : '❌'} ${method} 方法: ${hasMethod}`);
    });
} else {
    console.log('  ❌ RecEngineService.ts 不存在');
}

console.log('\n🎨 前端如何使用 RecEngine:');
console.log(`
📋 使用方式檢查清單:

1. **首頁推薦組件** (HomepageCarousel.tsx)
   - 應該使用 useHomepageRecommendations hook
   - 調用 GET /api/recommendations/homepage
   - 顯示個人化信用卡推薦

2. **交易分析組件** (TransactionRecommendation.tsx)  
   - 應該使用 analyzeTransaction mutation
   - 調用 POST /api/recommendations/transaction-analysis
   - 顯示「更好信用卡」建議彈窗

3. **React Hook** (useRecEngine.ts)
   - 應該封裝所有 RecEngine API 調用
   - 提供 React Query 整合
   - 包含錯誤處理和緩存邏輯

📈 驗證步驟:

1. 啟動前端: npm start (port 3000)
2. 啟動後端: npm run dev (port 3001) 
3. 啟動 RecEngine: python src/api.py (port 8000)
4. 在瀏覽器打開: http://localhost:3000
5. 檢查 Network 標籤是否有 RecEngine API 調用
6. 檢查 Console 是否有相關錯誤

🔧 快速測試:
   curl http://localhost:3001/api/recommendations/status
   curl http://localhost:8000/health
`);

console.log('\n🎯 檢查結果總結:');

// 檢查整合完成度
let integrationScore = 0;
let totalChecks = 0;

// 基本檢查
const basicChecks = [
    { name: 'useRecEngine hook', path: path.join(frontendDir, 'hooks/useRecEngine.ts') },
    { name: 'HomepageCarousel', path: path.join(frontendDir, 'components/RecEngine/HomepageCarousel.tsx') },
    { name: 'RecEngineService', path: '/Users/vincent.cho/workspace/learn/CrediBot/backend/src/services/recengine/RecEngineService.ts' },
    { name: 'Recommendations routes', path: '/Users/vincent.cho/workspace/learn/CrediBot/backend/src/routes/recommendations.ts' }
];

basicChecks.forEach(check => {
    const exists = fs.existsSync(check.path);
    if (exists) integrationScore++;
    totalChecks++;
    console.log(`  ${exists ? '✅' : '❌'} ${check.name}`);
});

const completionRate = Math.round((integrationScore / totalChecks) * 100);
console.log(`\n📊 整合完成度: ${integrationScore}/${totalChecks} (${completionRate}%)`);

if (completionRate >= 75) {
    console.log('🎉 RecEngine 整合狀態良好！');
} else if (completionRate >= 50) {
    console.log('⚠️  RecEngine 整合部分完成，需要進一步設置');
} else {
    console.log('❌ RecEngine 整合不完整，需要重新設置');
}

console.log('\n💡 下一步建議:');
if (completionRate < 100) {
    console.log('1. 確保所有 RecEngine 相關文件都已創建');
    console.log('2. 檢查前端組件是否正確導入和使用 hooks');
    console.log('3. 驗證後端 API 路由是否正確設置');
    console.log('4. 測試前端到後端到 RecEngine 的完整數據流');
}

console.log('5. 使用瀏覽器開發工具檢查網路請求');
console.log('6. 查看 console 日誌確認沒有錯誤');
console.log('7. 測試各種用戶場景（首頁訪問、交易分析等）');