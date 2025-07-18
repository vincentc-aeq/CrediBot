const { AuthService } = require('./dist/services/AuthService.js');

async function testRegister() {
  try {
    console.log('Testing user registration...');
    
    const authService = new AuthService();
    
    const userData = {
      email: "testuser@example.com",
      password: "TestPassword123!",
      firstName: "Test",
      lastName: "User"
    };
    
    const result = await authService.register(userData);
    console.log('✅ Registration successful:', result);
    
  } catch (error) {
    console.error('❌ Registration failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  process.exit(0);
}

testRegister();