#!/usr/bin/env node

/**
 * Set up test account to verify RecEngine functionality
 */

const bcrypt = require('bcrypt');
const { Client } = require('pg');

// Test account information
const TEST_ACCOUNT = {
    email: 'john.doe@example.com',
    password: 'TestRecEngine123',
    first_name: 'John',
    last_name: 'Doe'
};

async function setupTestAccount() {
    console.log('🔧 Setting up RecEngine Test Account');
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
        console.log('✅ Connected to database');

        // Generate password hash
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(TEST_ACCOUNT.password, saltRounds);
        console.log('✅ Password hash generation complete');

        // Update user password
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
            console.log('❌ User not found:', TEST_ACCOUNT.email);
            return;
        }

        const user = result.rows[0];
        console.log('✅ Test account setup complete!');
        console.log('\n📝 Account Information:');
        console.log(`   User ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Password: ${TEST_ACCOUNT.password}`);

        // Check if user has credit cards
        const cardQuery = `
            SELECT uc.id, cc.card_name, cc.issuer 
            FROM user_cards uc 
            JOIN credit_cards cc ON uc.card_id = cc.id 
            WHERE uc.user_id = $1;
        `;
        
        const cardResult = await client.query(cardQuery, [user.id]);
        console.log(`\n💳 User Credit Cards (${cardResult.rows.length} cards):`);
        
        if (cardResult.rows.length === 0) {
            console.log('   (No credit card records)');
        } else {
            cardResult.rows.forEach(card => {
                console.log(`   - ${card.card_name} (${card.issuer})`);
            });
        }

        // Check if user has transaction records
        const transactionQuery = `
            SELECT COUNT(*) as transaction_count 
            FROM transactions 
            WHERE user_id = $1;
        `;
        
        const transactionResult = await client.query(transactionQuery, [user.id]);
        const transactionCount = transactionResult.rows[0].transaction_count;
        console.log(`\n💰 Transaction Records: ${transactionCount} transactions`);

        console.log('\n🎯 Frontend Login Test Guide');
        console.log('====================');
        console.log('');
        console.log('1. Start frontend:');
        console.log('   cd frontend && npm start');
        console.log('');
        console.log('2. Open browser:');
        console.log('   http://localhost:3000');
        console.log('');
        console.log('3. Login with the following account:');
        console.log(`   Email: ${TEST_ACCOUNT.email}`);
        console.log(`   Password: ${TEST_ACCOUNT.password}`);
        console.log('');
        console.log('4. Expected RecEngine features to see:');
        console.log('   ✓ Homepage personalized credit card recommendation carousel');
        console.log('   ✓ Credit card details and ratings');
        console.log('   ✓ Transaction analysis available if transaction records exist');
        console.log('   ✓ RecEngine API calls visible in developer tools Network tab');
        console.log('');
        console.log('5. Check API calls:');
        console.log('   - Press F12 to open developer tools');
        console.log('   - Switch to Network tab');
        console.log('   - Reload the page');
        console.log('   - Look for requests to /api/recommendations/homepage');
        console.log('');
        console.log('6. If you see recommendation features working normally, it means the frontend successfully uses RecEngine!');

    } catch (error) {
        console.error('❌ Error occurred while setting up test account:', error.message);
    } finally {
        await client.end();
    }
}

// Execute script
setupTestAccount();