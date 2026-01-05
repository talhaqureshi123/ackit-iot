# Dashboard Refactoring Guide

## Overview
This guide explains the refactoring of common components from `AdminDashboard.jsx` and `ManagerDashboard.jsx` into reusable components.

## Folder Structure
```
apitesting/src/components/dashboard/
├── index.js                    # Export all dashboard components
├── TemperatureControl.jsx     # ✅ Created - Reusable temperature control
├── PowerToggle.jsx            # ✅ Created - Reusable power toggle
├── OrganizationCard.jsx       # ⏳ TODO - Extract organization card
├── VenueCard.jsx              # ⏳ TODO - Extract venue card
├── ACCard.jsx                  # ⏳ TODO - Extract AC device card
├── DashboardView.jsx          # ⏳ TODO - Extract dashboard overview
├── EventsView.jsx             # ⏳ TODO - Extract events management view
└── EnergyConsumptionView.jsx  # ⏳ TODO - Extract energy consumption view
```

## Completed Components

### 1. TemperatureControl
**Location:** `components/dashboard/TemperatureControl.jsx`

**Props:**
- `type`: 'organization' | 'venue' | 'ac'
- `id`: Entity ID
- `currentTemperature`: Current temperature value
- `localTemperature`: Local state temperature (optional)
- `isLoading`: Loading state
- `isDisabled`: Disabled state
- `hasMixedTemperatures`: Show "Set All" button
- `hasEvent`: Event is active
- `eventTemperature`: Temperature from active event
- `onTemperatureChange`: Callback for local state update
- `onTemperatureSet`: Callback for API call
- `onTemperatureSubmit`: Callback for form submit
- `minTemp`: Minimum temperature (default: 16)
- `maxTemp`: Maximum temperature (default: 30)
- `size`: 'compact' | 'large'

**Usage:**
```jsx
import { TemperatureControl } from '../components/dashboard';

<TemperatureControl
  type="organization"
  id={org.id}
  currentTemperature={org.temperature ?? 16}
  localTemperature={localTemperatures[`organization-${org.id}`]}
  isLoading={temperatureLoading[`organization-${org.id}`]}
  isDisabled={user?.status === 'suspended'}
  hasMixedTemperatures={org.hasMixedTemperatures}
  onTemperatureChange={handleTemperatureChange}
  onTemperatureSet={handleSetTemperature}
  onTemperatureSubmit={handleTemperatureSubmit}
/>
```

### 2. PowerToggle
**Location:** `components/dashboard/PowerToggle.jsx`

**Props:**
- `isOn`: Power state
- `isLoading`: Loading state
- `isDisabled`: Disabled state
- `onToggle`: Toggle callback
- `label`: Label text (default: 'Power')
- `type`: 'toggle' | 'button'
- `size`: 'compact' | 'large'

**Usage:**
```jsx
import { PowerToggle } from '../components/dashboard';

<PowerToggle
  isOn={org.isOrganizationOn === true || org.isOrganizationOn === 'true'}
  isLoading={false}
  isDisabled={user?.status === 'suspended'}
  onToggle={(newState) => handleToggleOrganizationPower(org.id, newState)}
  label="Power"
  type="toggle"
/>
```

## TODO: Components to Extract

### 3. OrganizationCard
**Current Location:** 
- `AdminDashboard.jsx` (lines ~2589-2863)
- `ManagerDashboard.jsx` (lines ~2017-2230)

**Common Features:**
- Alert banner
- Organization name and icon
- Status badges (active, mixed temps, events)
- Temperature control (use TemperatureControl component)
- Power toggle (use PowerToggle component)
- Venue count
- Action buttons (View, Assign - admin only)

**Differences:**
- Admin: Shows manager assignment, has "Assign" button
- Manager: Simpler, no assignment features

### 4. VenueCard
**Current Location:**
- `AdminDashboard.jsx` (lines ~2865-3155)
- `ManagerDashboard.jsx` (similar structure)

**Common Features:**
- Alert banner
- Venue name and icon
- Status badges
- Temperature control
- Power toggle
- AC count
- Action buttons

### 5. ACCard
**Current Location:**
- `AdminDashboard.jsx` (lines ~3157-3406)
- `ManagerDashboard.jsx` (similar structure)

**Common Features:**
- Alert banner
- Device name and icon
- Status badges (ON/OFF, Locked/Unlocked)
- Temperature control
- Power toggle (button style)
- Venue info
- Action buttons (Event, View, Delete - admin only)

### 6. DashboardView
**Current Location:**
- `AdminDashboard.jsx` (lines ~3909+)
- `ManagerDashboard.jsx` (similar structure)

**Common Features:**
- KPI cards (Total Managers, Total ACs, Total Venues, etc.)
- Statistics display
- Loading state

### 7. EventsView
**Current Location:**
- `AdminDashboard.jsx` (lines ~3410+)
- `ManagerDashboard.jsx` (similar structure)

**Common Features:**
- Event list/table
- Create event button
- Event filters
- Event status management

### 8. EnergyConsumptionView
**Current Location:**
- `AdminDashboard.jsx` (Energy tab)
- `ManagerDashboard.jsx` (Energy tab)

**Common Features:**
- Energy consumption table
- Download modal (monthly/yearly PDF)
- Filters (year, month, organization, venue, device)

## Refactoring Steps

### Step 1: Update Existing Dashboards to Use New Components

**AdminDashboard.jsx:**
```jsx
// Add import
import { TemperatureControl, PowerToggle } from '../components/dashboard';

// Replace inline temperature controls with:
<TemperatureControl
  type="organization"
  id={org.id}
  currentTemperature={org.temperature ?? 16}
  localTemperature={localTemperatures[`organization-${org.id}`]}
  isLoading={temperatureLoading[`organization-${org.id}`]}
  isDisabled={user?.status === 'suspended'}
  hasMixedTemperatures={org.hasMixedTemperatures}
  onTemperatureChange={handleTemperatureChange}
  onTemperatureSet={handleSetTemperature}
  onTemperatureSubmit={handleTemperatureSubmit}
/>

// Replace inline power toggles with:
<PowerToggle
  isOn={org.isOrganizationOn === true || org.isOrganizationOn === 'true'}
  isDisabled={user?.status === 'suspended'}
  onToggle={(newState) => handleToggleOrganizationPower(org.id, newState)}
  label="Power"
/>
```

**ManagerDashboard.jsx:**
```jsx
// Same imports and usage as AdminDashboard
// Note: Manager uses 'unlocked' status check instead of 'active'
```

### Step 2: Extract Card Components

1. Create `OrganizationCard.jsx` with props for:
   - Organization data
   - Events data
   - Alerts data
   - Managers data (for admin)
   - User status
   - Callback functions
   - Role ('admin' | 'manager')

2. Create `VenueCard.jsx` similarly

3. Create `ACCard.jsx` similarly

### Step 3: Extract View Components

1. Create `DashboardView.jsx` for the main dashboard overview
2. Create `EventsView.jsx` for event management
3. Create `EnergyConsumptionView.jsx` for energy reports

### Step 4: Clean Up Dashboard Files

After extracting components:
- Remove duplicate code from both dashboards
- Import and use the new components
- Pass necessary props and callbacks
- Test functionality

## Benefits

1. **Code Reusability**: Single source of truth for common UI components
2. **Maintainability**: Fix bugs once, apply everywhere
3. **Consistency**: Same UI/UX across Admin and Manager dashboards
4. **Smaller Files**: Dashboard files become more manageable
5. **Better Testing**: Components can be tested in isolation

## Notes

- Admin has `suspended` status, Manager has `unlocked`/`locked`/`restricted` status
- Admin has additional features (assign orgs, delete devices, etc.)
- Some components need role-based props to show/hide features
- All callbacks should be passed as props for flexibility





