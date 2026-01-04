const axios = require('axios');
require('dotenv').config({ path: './config/environment/.env' });

const BACKEND_IP = process.env.BACKEND_IP || '192.168.0.101';
const BACKEND_PORT = process.env.BACKEND_PORT || 5050;
const BASE_URL = `http://${BACKEND_IP}:${BACKEND_PORT}`;

// Test credentials
const testCredentials = {
  superadmin: {
    email: 'talhaabid400@gmail.com',
    password: 'superadmin123'
  },
  admin: {
    email: 'talhaqureshi00123@gmail.com',
    password: 'admin123' // Update with actual admin password
  },
  manager: {
    email: 'talhaqureshi987@gmail.com',
    password: 'manager123' // Update with actual manager password
  }
};

async function testLogin(role, email, password) {
  console.log(`\n🧪 Testing ${role.toUpperCase()} Login...`);
  console.log(`   Email: ${email}`);
  
  try {
    let endpoint = '';
    if (role === 'superadmin') {
      endpoint = `${BASE_URL}/api/superadmin/login`;
    } else if (role === 'admin') {
      endpoint = `${BASE_URL}/api/admin/login`;
    } else if (role === 'manager') {
      endpoint = `${BASE_URL}/api/manager/login`;
    }
    
    console.log(`   Endpoint: ${endpoint}`);
    
    const response = await axios.post(endpoint, {
      email: email.trim(),
      password: password.trim()
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   ✅ Success: ${response.data.success}`);
    
    if (response.data.success && response.data.data) {
      const user = response.data.data.user || response.data.user;
      if (user) {
        console.log(`   ✅ User ID: ${user.id}`);
        console.log(`   ✅ User Name: ${user.name}`);
        console.log(`   ✅ User Email: ${user.email}`);
        console.log(`   ✅ User Role: ${user.role || 'NOT PROVIDED'}`);
        
        if (!user.role) {
          console.log(`   ⚠️  WARNING: Role not returned in response!`);
        } else {
          const normalizedRole = user.role.toString().toLowerCase().trim();
          console.log(`   ✅ Normalized Role: ${normalizedRole}`);
          
          // Check if role matches expected
          if (normalizedRole !== role.toLowerCase()) {
            console.log(`   ⚠️  WARNING: Role mismatch! Expected: ${role}, Got: ${normalizedRole}`);
          }
        }
      } else {
        console.log(`   ❌ ERROR: User data not found in response`);
        console.log(`   Response structure:`, JSON.stringify(response.data, null, 2));
      }
    } else {
      console.log(`   ❌ ERROR: Login failed`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    }
    
    return { success: true, response };
  } catch (error) {
    if (error.response) {
      console.log(`   ❌ Status: ${error.response.status}`);
      console.log(`   ❌ Message: ${error.response.data?.message || error.message}`);
      console.log(`   ❌ Response:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
    return { success: false, error };
  }
}

async function runTests() {
  console.log('🚀 Starting Login Endpoint Tests...');
  console.log(`📍 Backend URL: ${BASE_URL}`);
  console.log('='.repeat(60));
  
  // Test SuperAdmin
  await testLogin('superadmin', testCredentials.superadmin.email, testCredentials.superadmin.password);
  
  // Test Admin
  await testLogin('admin', testCredentials.admin.email, testCredentials.admin.password);
  
  // Test Manager
  await testLogin('manager', testCredentials.manager.email, testCredentials.manager.password);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
}

runTests().catch(console.error);

