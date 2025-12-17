/**
 * Test file to verify Venue ↔ Organization name swap
 * 
 * Tests the new hierarchy:
 * Organization (parent) → Venue (child) → AC Device
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/admin';
let adminToken = '';
let testOrgId = null;
let testVenueId = null;
let testDeviceId = null;

const testAdmin = {
  email: 'admin@test.com',
  password: 'admin123'
};

async function login() {
  try {
    console.log('\n🔐 Logging in...');
    const res = await axios.post(`${BASE_URL}/login`, testAdmin);
    adminToken = res.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function createOrganization() {
  try {
    console.log('\n📦 Creating Organization (parent)...');
    const res = await axios.post(
      `${BASE_URL}/organizations`,
      { name: 'Test Org', batchNumber: 'BATCH001' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testOrgId = res.data.organization?.id || res.data.data?.id;
    console.log('✅ Organization created:', testOrgId);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function createVenue() {
  try {
    console.log('\n🏢 Creating Venue (child, under Organization)...');
    const res = await axios.post(
      `${BASE_URL}/venues`,
      { 
        name: 'Test Venue', 
        organizationSize: 'Medium',
        organizationId: testOrgId,
        temperature: 22
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testVenueId = res.data.venue?.id || res.data.data?.id;
    console.log('✅ Venue created:', testVenueId);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function createDevice() {
  try {
    console.log('\n🔧 Creating AC Device (under Venue)...');
    const res = await axios.post(
      `${BASE_URL}/acs`,
      {
        name: 'Test AC',
        brand: 'Test',
        model: 'Model1',
        ton: '1',
        venueId: testVenueId,
        temperature: 20
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testDeviceId = res.data.ac?.id || res.data.data?.id;
    console.log('✅ Device created:', testDeviceId);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function verifyHierarchy() {
  try {
    console.log('\n🔍 Verifying hierarchy...');
    
    // Get Organization
    const orgRes = await axios.get(
      `${BASE_URL}/organizations/${testOrgId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✅ Organization:', orgRes.data.organization?.name || orgRes.data.data?.name);
    
    // Get Venue
    const venueRes = await axios.get(
      `${BASE_URL}/venues/${testVenueId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const venue = venueRes.data.venue || venueRes.data.data;
    console.log('✅ Venue:', venue?.name);
    console.log('   Organization ID:', venue?.organizationId);
    console.log('   ACs count:', venue?.acs?.length || 0);
    
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function cleanup() {
  try {
    console.log('\n🧹 Cleaning up...');
    if (testDeviceId) {
      await axios.delete(`${BASE_URL}/acs/${testDeviceId}`, 
        { headers: { Authorization: `Bearer ${adminToken}` } });
    }
    if (testVenueId) {
      await axios.delete(`${BASE_URL}/venues/${testVenueId}`, 
        { headers: { Authorization: `Bearer ${adminToken}` } });
    }
    if (testOrgId) {
      await axios.delete(`${BASE_URL}/organizations/${testOrgId}`, 
        { headers: { Authorization: `Bearer ${adminToken}` } });
    }
    console.log('✅ Cleanup done');
  } catch (error) {
    console.error('⚠️ Cleanup error:', error.message);
  }
}

async function runTest() {
  console.log('═══════════════════════════════════════════');
  console.log('🧪 Testing Name Swap: Organization ↔ Venue');
  console.log('═══════════════════════════════════════════');
  
  if (!await login()) return;
  if (!await createOrganization()) return;
  if (!await createVenue()) return;
  if (!await createDevice()) return;
  await verifyHierarchy();
  await cleanup();
  
  console.log('\n✅ Test completed!');
}

runTest().catch(console.error);

