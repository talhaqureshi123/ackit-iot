#!/usr/bin/env node

/**
 * Quick script to run event system tests
 * Usage: node scripts/run-event-tests.js
 */

const path = require('path');

// Change to backend directory
process.chdir(path.join(__dirname, '..'));

console.log('🧪 Running Event System Tests...\n');

// Import and run tests
const { runAllTests } = require('../tests/eventSystem.test');

runAllTests()
  .then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });

