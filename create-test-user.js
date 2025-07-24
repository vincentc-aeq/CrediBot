#!/usr/bin/env node

/**
 * Create test user and verify RecEngine functionality
 */

const http = require('http');

const BACKEND_URL = 'http://localhost:3001';

// Test user data
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
    console.log('🧪 Creating RecEngine Test User');
    console.log('================================\n');

    try {
        // 1. Try to register user
        console.log('1. Registering test user...');
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
            console.log('✅ User already exists or registration successful');
        } else {
            console.log('❌ Registration failed:', registerResult.data);
            return;
        }

        // 2. Login user
        console.log('\n2. Logging in test user...');
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
            console.log('❌ Login failed:', loginResult.data);
            return;
        }

        const token = loginResult.data.data?.token || loginResult.data.token;
        if (!token) {
            console.log('❌ Unable to get login token');
            return;
        }

        console.log('✅ Login successful!');
        console.log('📝 User information:');
        console.log(`   Email: ${testUser.email}`);
        console.log(`   Password: ${testUser.password}`);
        console.log(`   Token: ${token.substring(0, 20)}...`);

        // 3. Test homepage recommendation API
        console.log('\n3. Testing homepage recommendation API...');
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
        console.log(`   Status code: ${homepageResult.status}`);
        
        if (homepageResult.status === 200) {
            console.log('✅ Homepage recommendation API working normally');
            console.log('   Recommendation preview:', JSON.stringify(homepageResult.data, null, 2).substring(0, 200) + '...');
        } else {
            console.log('❌ Homepage recommendation API error:', homepageResult.data);
        }

        // 4. Test recommendation status
        console.log('\n4. Testing recommendation service status...');
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
        console.log(`   Status code: ${statusResult.status}`);
        
        if (statusResult.status === 200) {
            console.log('✅ Recommendation service status normal');
            console.log('   Service status:', JSON.stringify(statusResult.data, null, 2));
        } else {
            console.log('❌ Recommendation service status error:', statusResult.data);
        }

        // Output frontend usage instructions
        console.log('\n🎯 Frontend Testing Instructions');
        console.log('================');
        console.log('');
        console.log('Use the following account to login to frontend and view RecEngine features:');
        console.log('');
        console.log(`📧 Email: ${testUser.email}`);
        console.log(`🔐 Password: ${testUser.password}`);
        console.log('');
        console.log('🔍 In the frontend you should see:');
        console.log('');
        console.log('1. **Homepage Personalized Recommendations**');
        console.log('   - Credit card recommendation carousel');
        console.log('   - Personalized scores and recommendation reasons');
        console.log('   - Auto-refresh functionality');
        console.log('');
        console.log('2. **Transaction Analysis Feature**');
        console.log('   - Click "Analyze" button in transaction list');
        console.log('   - Recommendation popup appears');
        console.log('   - Shows better credit card options');
        console.log('');
        console.log('3. **Developer Tools Check**');
        console.log('   - Press F12 to open developer tools');
        console.log('   - Check API calls in Network tab');
        console.log('   - Should see requests to /api/recommendations/');
        console.log('');
        console.log('🚀 Quick start frontend:');
        console.log('   cd frontend && npm start');
        console.log('   Open http://localhost:3000');

    } catch (error) {
        console.error('❌ Error occurred while creating test user:', error.message);
    }
}

// Execute script
createTestUser();