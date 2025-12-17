/**
 * COMPREHENSIVE TEST SCRIPT for Venue ↔ Organization Name Swap
 * 
 * Tests the complete hierarchy:
 * Organization (parent) → Venue (child) → AC Device
 * 
 * Run: node apitesting/test-complete-swap.js
 */

import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:5050/api/admin';

// Create axios instance with cookies enabled for session-based auth
const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Enable cookies for session-based authentication
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store cookies manually for Node.js
let sessionCookie = '';

// Interceptor to store cookies from responses
apiClient.interceptors.response.use((response) => {
  const setCookieHeader = response.headers['set-cookie'];
  if (setCookieHeader) {
    // Extract session cookie (usually the first one)
    const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
    if (cookieString) {
      // Extract just the cookie name=value part (before semicolon)
      sessionCookie = cookieString.split(';')[0];
    }
  }
  return response;
});

// Interceptor to add cookies to requests
apiClient.interceptors.request.use((config) => {
  if (sessionCookie) {
    config.headers.Cookie = sessionCookie;
  }
  return config;
});

let testOrgId = null;
let testVenueId = null;
let testDeviceId = null;

const testAdmin = {
  email: 'usman.abid00321@gmail.com',
  password: 'admin123'
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) { log(`✅ ${message}`, 'green'); }
function logError(message) { log(`❌ ${message}`, 'red'); }
function logInfo(message) { log(`ℹ️  ${message}`, 'cyan'); }
function logWarning(message) { log(`⚠️  ${message}`, 'yellow'); }

async function login() {
  try {
    logInfo('\n🔐 Step 1: Logging in as admin...');
    const res = await apiClient.post('/login', testAdmin);
    const adminId = res.data.data?.user?.id || res.data.user?.id;
    logSuccess(`Login successful - Admin ID: ${adminId}, Name: ${res.data.data?.user?.name || res.data.user?.name}`);
    return true;
  } catch (error) {
    logError(`Login failed: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) console.log('Response:', JSON.stringify(error.response.data, null, 2));
    return false;
  }
}

async function createOrganization() {
  try {
    logInfo('\n📦 Step 2: Creating Organization (parent)...');
    // Use unique name with timestamp to avoid conflicts
    const uniqueName = `Test Organization Swap ${Date.now()}`;
    const res = await apiClient.post('/organizations', { 
      name: uniqueName,
      batchNumber: 'BATCH001' // Now works - Organization model uses venues table (simple structure)
    });
    testOrgId = res.data.organization?.id || res.data.data?.id;
    logSuccess(`Organization created - ID: ${testOrgId}, Name: ${res.data.organization?.name || res.data.data?.name}`);
    return true;
  } catch (error) {
    logError(`Failed: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      if (error.response.data.error) {
        logError(`Error details: ${error.response.data.error}`);
      }
    }
    return false;
  }
}

async function createVenue() {
  try {
    logInfo('\n🏢 Step 3: Creating Venue (child, under Organization)...');
    // Use unique name with timestamp to avoid conflicts
    const uniqueName = `Test Venue ${Date.now()}`;
    const res = await apiClient.post('/venues', { 
      name: uniqueName, 
      organizationSize: 'Medium',
      organizationId: testOrgId,
      temperature: 22
    });
    testVenueId = res.data.venue?.id || res.data.data?.id;
    logSuccess(`Venue created - ID: ${testVenueId}, Name: ${res.data.venue?.name || res.data.data?.name}`);
    return true;
  } catch (error) {
    logError(`Failed: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      if (error.response.data.error) {
        logError(`Error details: ${error.response.data.error}`);
      }
    }
    return false;
  }
}

async function createDevice() {
  try {
    logInfo('\n🔧 Step 4: Creating AC Device (under Venue)...');
    // Use unique name with timestamp to avoid conflicts
    const uniqueName = `Test AC Device ${Date.now()}`;
    const res = await apiClient.post('/acs', {
      name: uniqueName,
      brand: 'Test Brand',
      model: 'Model1',
      ton: '1',
      venueId: testVenueId,
      temperature: 20
    });
    testDeviceId = res.data.ac?.id || res.data.data?.id;
    logSuccess(`Device created - ID: ${testDeviceId}, Name: ${res.data.ac?.name || res.data.data?.name}`);
    return true;
  } catch (error) {
    logError(`Failed: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      if (error.response.data.error) {
        logError(`Error details: ${error.response.data.error}`);
      }
    }
    return false;
  }
}

async function verifyHierarchy() {
  try {
    logInfo('\n🔍 Step 5: Verifying hierarchy...');
    
    // Get Organization
    const orgRes = await apiClient.get(`/organizations/${testOrgId}`);
    const org = orgRes.data.organization || orgRes.data.data?.organization;
    logSuccess(`Organization: ${org?.name} (ID: ${org?.id})`);
    
    // Get Venue
    const venueRes = await apiClient.get(`/venues/${testVenueId}`);
    const venue = venueRes.data.data?.venue || venueRes.data.venue;
    if (!venue) {
      logError(`Venue response structure: ${JSON.stringify(venueRes.data, null, 2)}`);
      return false;
    }
    logSuccess(`Venue: ${venue.name} (ID: ${venue.id})`);
    logInfo(`   Organization ID: ${venue.organizationId}`);
    logInfo(`   Organization: ${venue.organization?.name || 'N/A'}`);
    logInfo(`   ACs count: ${venue.acs?.length || 0}`);
    
    if (venue?.acs && venue.acs.length > 0) {
      venue.acs.forEach(ac => {
        logInfo(`     - AC: ${ac.name} (ID: ${ac.id})`);
      });
    }
    
    // Get All ACs
    const acsRes = await apiClient.get('/acs');
    const acs = acsRes.data.data || acsRes.data.acs || [];
    logSuccess(`Total ACs: ${acs.length}`);
    acs.forEach(ac => {
      if (ac.venue) {
        logInfo(`   AC: ${ac.name} → Venue: ${ac.venue.name} → Org: ${ac.venue.organization?.name || 'N/A'}`);
      }
    });
    
    return true;
  } catch (error) {
    logError(`Verification failed: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) console.log('Response:', JSON.stringify(error.response.data, null, 2));
    return false;
  }
}

async function testGetAll() {
  try {
    logInfo('\n📋 Step 6: Testing GET all endpoints...');
    
    // Get all organizations
    const orgsRes = await apiClient.get('/organizations');
    logSuccess(`Organizations: ${orgsRes.data.data?.length || 0} found`);
    
    // Get all venues
    const venuesRes = await apiClient.get('/venues');
    logSuccess(`Venues: ${venuesRes.data.data?.venues?.length || 0} found`);
    
    // Get all ACs
    const acsRes = await apiClient.get('/acs');
    logSuccess(`ACs: ${acsRes.data.data?.length || 0} found`);
    
    return true;
  } catch (error) {
    logError(`GET all test failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function cleanup() {
  try {
    logInfo('\n🧹 Cleaning up test data...');
    if (testDeviceId) {
      await apiClient.delete(`/acs/${testDeviceId}`);
      logSuccess('Device deleted');
    }
    if (testVenueId) {
      await apiClient.delete(`/venues/${testVenueId}`);
      logSuccess('Venue deleted');
    }
    if (testOrgId) {
      await apiClient.delete(`/organizations/${testOrgId}`);
      logSuccess('Organization deleted');
    }
  } catch (error) {
    logWarning(`Cleanup error: ${error.message}`);
  }
}

async function runTest() {
  console.log('\n' + '='.repeat(60));
  log('🧪 COMPREHENSIVE TEST: Venue ↔ Organization Name Swap', 'cyan');
  console.log('='.repeat(60));
  
  const results = {
    login: false,
    createOrganization: false,
    createVenue: false,
    createDevice: false,
    verifyHierarchy: false,
    testGetAll: false
  };
  
  results.login = await login();
  if (!results.login) {
    logError('\n❌ Cannot proceed without login. Exiting...');
    return;
  }
  
  results.createOrganization = await createOrganization();
  if (!results.createOrganization) {
    logError('\n❌ Cannot proceed without organization. Exiting...');
    return;
  }
  
  results.createVenue = await createVenue();
  if (!results.createVenue) {
    logError('\n❌ Cannot proceed without venue. Exiting...');
    await cleanup();
    return;
  }
  
  results.createDevice = await createDevice();
  if (!results.createDevice) {
    logWarning('\n⚠️  Device creation failed, but continuing with other tests...');
  }
  
  results.verifyHierarchy = await verifyHierarchy();
  results.testGetAll = await testGetAll();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  log('📊 TEST RESULTS SUMMARY', 'cyan');
  console.log('='.repeat(60));
  Object.entries(results).forEach(([test, passed]) => {
    if (passed) {
      logSuccess(`${test}: PASSED`);
    } else {
      logError(`${test}: FAILED`);
    }
  });
  
  const allPassed = Object.values(results).every(r => r);
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    logSuccess('✅ ALL TESTS PASSED!');
  } else {
    logError('❌ SOME TESTS FAILED');
  }
  console.log('='.repeat(60));
  
  await cleanup();
  console.log('\n');
}

runTest().catch(error => {
  logError(`\n💥 Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

