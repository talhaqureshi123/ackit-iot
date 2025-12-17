# Complete Event Functionality Test

## Overview
This comprehensive test script validates all event management functionality using:
- **Sequelize ORM** for direct database access
- **API calls** for testing endpoints
- **Service layer** for testing business logic
- **Server status checks** before running tests

## Features

✅ **Server Status Check** - Verifies backend server is running  
✅ **Database Connection** - Tests Sequelize connection  
✅ **Direct Database Access** - Uses Sequelize to fetch test data  
✅ **API Testing** - Tests all REST endpoints  
✅ **Service Testing** - Tests business logic directly  
✅ **Authentication** - Proper login for admin and manager  
✅ **Comprehensive Coverage** - All 9 test suites  

## Prerequisites

1. **Backend server must be running** on port 5050
   ```bash
   cd ackitbackend
   node server.js
   ```

2. **Database must be accessible** with proper credentials in `.env`

3. **Test data must exist:**
   - At least one device (AC) in database
   - At least one organization assigned to the manager

## Configuration

### Default Credentials
- **Admin Email:** `usman.abid00321@gmail.com`
- **Admin Password:** `admin123`
- **Manager Email:** `talhaqureshi987@gmail.com`
- **Manager Password:** `manager123`

### Environment Variables
You can override using environment variables:
```bash
export API_BASE_URL=http://10.27.249.140:5050/api
export ADMIN_EMAIL=your-admin@email.com
export ADMIN_PASSWORD=your-password
export MANAGER_EMAIL=your-manager@email.com
export MANAGER_PASSWORD=your-password
```

## Running the Test

### Basic Usage
```bash
cd ackitbackend
node scripts/test-event-functionality-complete.js
```

### With Custom Configuration
```bash
API_BASE_URL=http://10.27.249.140:5050/api \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=password123 \
MANAGER_EMAIL=manager@example.com \
MANAGER_PASSWORD=password123 \
node scripts/test-event-functionality-complete.js
```

## Test Coverage

### Test Suite 1: Create Events
- ✅ Admin creates device event (via service)
- ✅ Admin creates organization event (via API)
- ✅ Manager creates device event (via service)
- ✅ Manager creates event on different device
- ✅ Manager blocked from creating conflicting event

### Test Suite 2: Start Events
- ✅ Admin starts event manually
- ✅ Manager starts event manually
- ✅ Manager blocked when admin event is active

### Test Suite 3: Stop Events
- ✅ Admin stops event manually
- ✅ Manager stops event manually

### Test Suite 4: Disable Events
- ✅ Admin disables event
- ✅ Manager disables event

### Test Suite 5: Enable Events
- ✅ Admin enables event
- ✅ Manager enables event

### Test Suite 6: Update Events
- ✅ Admin updates event (tracks changes)
- ✅ Manager updates event (tracks changes)

### Test Suite 7: Conflict Resolution
- ✅ Manager creates event
- ✅ Admin creates overlapping event (disables manager event)
- ✅ Verify manager event is disabled (via database)

### Test Suite 8: Get Events
- ✅ Admin gets all events
- ✅ Manager gets all events
- ✅ Verify events in database using Sequelize

### Test Suite 9: Delete Events
- ✅ Admin deletes event
- ✅ Manager deletes event

## How It Works

1. **Prerequisites Check**
   - Verifies server is running
   - Tests database connection

2. **Data Fetching**
   - Uses Sequelize to fetch admin, manager, devices, and organizations
   - Validates test data exists

3. **Authentication**
   - Logs in admin and manager via API
   - Maintains session cookies

4. **Testing**
   - Tests via API endpoints
   - Tests via service layer
   - Verifies results in database using Sequelize

5. **Cleanup**
   - Removes all test events from database
   - Closes database connection

## Output

The script provides detailed output:
- ✅ **PASS** - Test passed successfully
- ❌ **FAIL** - Test failed with error message
- 📊 **Summary** - Final test results

## Troubleshooting

### "Backend server is not running"
- Start the server: `cd ackitbackend && node server.js`
- Wait a few seconds for server to initialize

### "Cannot connect to database"
- Check database credentials in `.env` file
- Verify PostgreSQL is running
- Check database connection settings

### "Admin/Manager not found"
- Verify credentials are correct
- Check if users exist in database

### "No devices/organizations found"
- Create at least one device in admin dashboard
- Assign at least one organization to the manager

## Notes

- All test events are automatically cleaned up
- Test events are identified by "TEST" in their name
- The script uses both API and direct database access for comprehensive testing
- Auto start/end functionality is handled by the event scheduler service

