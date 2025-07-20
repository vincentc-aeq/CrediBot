#!/usr/bin/env node

/**
 * 設定測試帳號以驗證 RecEngine 功能
 */

const bcrypt = require('bcrypt');
const { Client } = require('pg');

// 測試帳號資訊
const TEST_ACCOUNT = {
    email: 'john.doe@example.com',
    password: 'TestRecEngine123',
    first_name: 'John',
    last_name: 'Doe'
};

async function setupTestAccount() {
    console.log('🔧 設定 RecEngine 測試帳號');
    console.log('===========================\n');

    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'credit_card_recommendations',
        user: 'username',
        password: 'password'
    });

    try {
        await client.connect();
        console.log('✅ 連接到資料庫');

        // 生成密碼雜湊
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(TEST_ACCOUNT.password, saltRounds);
        console.log('✅ 密碼雜湊生成完成');

        // 更新用戶密碼
        const updateQuery = `
            UPDATE users 
            SET password_hash = $1, 
                first_name = $2, 
                last_name = $3, 
                is_active = true,
                email_verified_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE email = $4
            RETURNING id, email, first_name, last_name;
        `;

        const result = await client.query(updateQuery, [
            passwordHash,
            TEST_ACCOUNT.first_name,
            TEST_ACCOUNT.last_name,
            TEST_ACCOUNT.email
        ]);

        if (result.rows.length === 0) {
            console.log('❌ 找不到用戶:', TEST_ACCOUNT.email);
            return;
        }

        const user = result.rows[0];
        console.log('✅ 測試帳號設定完成!');
        console.log('\n📝 帳號資訊:');
        console.log(`   用戶 ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   姓名: ${user.first_name} ${user.last_name}`);
        console.log(`   密碼: ${TEST_ACCOUNT.password}`);

        // 檢查用戶是否有信用卡
        const cardQuery = `
            SELECT uc.id, cc.card_name, cc.issuer 
            FROM user_cards uc 
            JOIN credit_cards cc ON uc.card_id = cc.id 
            WHERE uc.user_id = $1;
        `;
        
        const cardResult = await client.query(cardQuery, [user.id]);
        console.log(`\n💳 用戶信用卡 (${cardResult.rows.length} 張):`);
        
        if (cardResult.rows.length === 0) {
            console.log('   (無信用卡記錄)');
        } else {
            cardResult.rows.forEach(card => {
                console.log(`   - ${card.card_name} (${card.issuer})`);
            });
        }

        // 檢查用戶是否有交易記錄
        const transactionQuery = `
            SELECT COUNT(*) as transaction_count 
            FROM transactions 
            WHERE user_id = $1;
        `;
        
        const transactionResult = await client.query(transactionQuery, [user.id]);
        const transactionCount = transactionResult.rows[0].transaction_count;
        console.log(`\n💰 交易記錄: ${transactionCount} 筆`);

        console.log('\n🎯 前端登入測試指南');
        console.log('====================');
        console.log('');
        console.log('1. 啟動前端:');
        console.log('   cd frontend && npm start');
        console.log('');
        console.log('2. 打開瀏覽器:');
        console.log('   http://localhost:3000');
        console.log('');
        console.log('3. 使用以下帳號登入:');
        console.log(`   Email: ${TEST_ACCOUNT.email}`);
        console.log(`   Password: ${TEST_ACCOUNT.password}`);
        console.log('');
        console.log('4. 預期看到的 RecEngine 功能:');
        console.log('   ✓ 首頁個人化信用卡推薦輪播');
        console.log('   ✓ 信用卡詳情和評分');
        console.log('   ✓ 如果有交易記錄，可以進行交易分析');
        console.log('   ✓ 在開發者工具 Network 標籤中看到 RecEngine API 調用');
        console.log('');
        console.log('5. 檢查 API 調用:');
        console.log('   - 按 F12 打開開發者工具');
        console.log('   - 切換到 Network 標籤');
        console.log('   - 重新載入頁面');
        console.log('   - 查找對 /api/recommendations/homepage 的請求');
        console.log('');
        console.log('6. 如果看到推薦功能正常工作，表示前端成功使用了 RecEngine!');

    } catch (error) {
        console.error('❌ 設定測試帳號時發生錯誤:', error.message);
    } finally {
        await client.end();
    }
}

// 執行腳本
setupTestAccount();