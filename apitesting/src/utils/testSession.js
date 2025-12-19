/**
 * Session Testing Utility
 * Use this in browser console to test session creation
 */

export const testSession = async () => {
  console.log('🔍 Testing session...');
  
  // Test 1: Check if we can reach the test endpoint
  try {
    const response = await fetch('/api/test-session', {
      method: 'GET',
      credentials: 'include', // Important: include cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('📥 Session test response:', data);
    
    // Check cookies in browser
    const cookies = document.cookie;
    console.log('🍪 Browser cookies:', cookies);
    console.log('🍪 Has ackit.sid:', cookies.includes('ackit.sid'));
    
    return {
      success: true,
      session: data.session,
      cookies: cookies,
      hasSessionCookie: cookies.includes('ackit.sid'),
    };
  } catch (error) {
    console.error('❌ Session test failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Test login and session
export const testLoginAndSession = async (email, password) => {
  console.log('🔍 Testing login and session...');
  
  try {
    // Step 1: Login
    const loginResponse = await fetch('/api/superadmin/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const loginData = await loginResponse.json();
    console.log('📥 Login response:', loginData);
    console.log('📥 Login status:', loginResponse.status);
    console.log('📥 Login headers:', {
      'set-cookie': loginResponse.headers.get('set-cookie'),
      'content-type': loginResponse.headers.get('content-type'),
    });
    
    // Check cookies after login
    const cookiesAfterLogin = document.cookie;
    console.log('🍪 Cookies after login:', cookiesAfterLogin);
    console.log('🍪 Has ackit.sid after login:', cookiesAfterLogin.includes('ackit.sid'));
    
    // Step 2: Test session
    await new Promise(resolve => setTimeout(resolve, 500));
    const sessionTest = await testSession();
    
    return {
      login: {
        success: loginData.success,
        data: loginData,
        status: loginResponse.status,
      },
      cookies: cookiesAfterLogin,
      hasSessionCookie: cookiesAfterLogin.includes('ackit.sid'),
      sessionTest: sessionTest,
    };
  } catch (error) {
    console.error('❌ Login test failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Make functions available globally for browser console
if (typeof window !== 'undefined') {
  window.testSession = testSession;
  window.testLoginAndSession = testLoginAndSession;
}

