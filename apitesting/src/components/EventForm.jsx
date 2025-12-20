import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

const EventForm = React.memo(({ onSubmit, onCancel, event = null, acs = [] }) => {
  // Initialize form data - only set from event prop on mount if event exists
  // Only device events are supported now
  const [formData, setFormData] = useState(() => {
    if (event?.id) {
      return {
        name: event.name || '',
        deviceId: event.deviceId ? String(event.deviceId) : '',
        startTime: event.startTime ? (() => {
          // Convert UTC time from backend to PKT for datetime-local input
          const date = new Date(event.startTime);
          // Get PKT date components (explicitly use Asia/Karachi timezone)
          const pktDateStr = date.toLocaleString('en-US', {
            timeZone: 'Asia/Karachi',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          // Parse the PKT string: "MM/DD/YYYY, HH:MM"
          const [datePart, timePart] = pktDateStr.split(', ');
          const [month, day, year] = datePart.split('/');
          const [hours, minutes] = timePart.split(':');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        })() : '',
        endTime: event.endTime ? (() => {
          // Convert UTC time from backend to PKT for datetime-local input
          const date = new Date(event.endTime);
          // Get PKT date components (explicitly use Asia/Karachi timezone)
          const pktDateStr = date.toLocaleString('en-US', {
            timeZone: 'Asia/Karachi',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          // Parse the PKT string: "MM/DD/YYYY, HH:MM"
          const [datePart, timePart] = pktDateStr.split(', ');
          const [month, day, year] = datePart.split('/');
          const [hours, minutes] = timePart.split(':');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        })() : '',
        temperature: event.temperature || ''
      };
    }
    // For new events, check if deviceId is pre-selected (for creating event from device card)
    return {
      name: '',
      deviceId: event?.deviceId ? String(event.deviceId) : '',
      startTime: '',
      endTime: '',
      temperature: '',
      isRecurring: false,
      recurringStartDate: '',
      recurringEndDate: '',
      timeStart: '',
      timeEnd: '',
      daysOfWeek: []
    };
  });

  // Track the last event ID and deviceId we've initialized from - only update when they actually change
  const lastEventIdRef = useRef(event?.id);
  const lastDeviceIdRef = useRef(event?.deviceId);
  const isInitialMount = useRef(true);

  // Update form data when event prop changes (for editing or pre-selecting device)
  // Only update when switching to a different event or device, NOT on every render
  useEffect(() => {
    // Skip on initial mount - form data is already initialized
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastEventIdRef.current = event?.id;
      lastDeviceIdRef.current = event?.deviceId;
      return;
    }

    const currentEventId = event?.id;
    const prevEventId = lastEventIdRef.current;
    const currentDeviceId = event?.deviceId;
    const prevDeviceId = lastDeviceIdRef.current;
    
    // Update if event ID changed OR if deviceId changed (for pre-selecting device in new event)
    if (currentEventId !== prevEventId || (currentDeviceId !== prevDeviceId && !currentEventId)) {
      lastEventIdRef.current = currentEventId;
      lastDeviceIdRef.current = currentDeviceId;
      
      if (currentEventId) {
        // Loading an existing event for editing
        setFormData({
          name: event.name || '',
          deviceId: event.deviceId ? String(event.deviceId) : '',
          startTime: event.startTime ? (() => {
            // Convert UTC time from backend to PKT for datetime-local input
            // datetime-local input doesn't support timezone, so we need to show PKT time
            const date = new Date(event.startTime);
            // Get PKT date components (explicitly use Asia/Karachi timezone)
            const pktDateStr = date.toLocaleString('en-US', {
              timeZone: 'Asia/Karachi',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
            // Parse the PKT string: "MM/DD/YYYY, HH:MM"
            const [datePart, timePart] = pktDateStr.split(', ');
            const [month, day, year] = datePart.split('/');
            const [hours, minutes] = timePart.split(':');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
          })() : '',
          endTime: event.endTime ? (() => {
            // Convert UTC time from backend to PKT for datetime-local input
            const date = new Date(event.endTime);
            // Get PKT date components (explicitly use Asia/Karachi timezone)
            const pktDateStr = date.toLocaleString('en-US', {
              timeZone: 'Asia/Karachi',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
            // Parse the PKT string: "MM/DD/YYYY, HH:MM"
            const [datePart, timePart] = pktDateStr.split(', ');
            const [month, day, year] = datePart.split('/');
            const [hours, minutes] = timePart.split(':');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
          })() : '',
          temperature: event.temperature || '',
          isRecurring: event.isRecurring || false,
          recurringStartDate: event.recurringStartDate || '',
          recurringEndDate: event.recurringEndDate || '',
          timeStart: event.timeStart || '',
          timeEnd: event.timeEnd || '',
          daysOfWeek: event.daysOfWeek || []
        });
      } else if (prevEventId !== null && currentEventId === null) {
        // Switching from editing to creating new event
        // Preserve deviceId if it was pre-selected
        setFormData({
          name: '',
          deviceId: event?.deviceId ? String(event.deviceId) : '',
          startTime: '',
          endTime: '',
          temperature: '',
          isRecurring: false,
          recurringStartDate: '',
          recurringEndDate: '',
          timeStart: '',
          timeEnd: '',
          daysOfWeek: []
        });
      } else if (!currentEventId && currentDeviceId !== prevDeviceId) {
        // Creating new event with pre-selected deviceId changed
        // Update only deviceId, preserve other form fields
        setFormData(prev => ({
          ...prev,
          deviceId: event?.deviceId ? String(event.deviceId) : ''
        }));
      }
      // If both are null (creating new event), don't reset - let user keep typing
    }
  }, [event?.id, event?.deviceId, event]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || formData.name.trim() === '') {
      toast.error('Event name is required');
      return;
    }
    
    // Validation for recurring vs non-recurring events
    if (formData.isRecurring) {
      // Recurring event validation
      if (!formData.recurringStartDate) {
        toast.error('Recurring start date is required');
        return;
      }
      
      if (!formData.recurringEndDate) {
        toast.error('Recurring end date is required');
        return;
      }
      
      if (!formData.timeStart) {
        toast.error('Start time is required for recurring events');
        return;
      }
      
      if (!formData.timeEnd) {
        toast.error('End time is required for recurring events');
        return;
      }
      
      if (formData.daysOfWeek.length === 0) {
        toast.error('Please select at least one day of the week');
        return;
      }
      
      // Validate date range
      const startDate = new Date(formData.recurringStartDate);
      const endDate = new Date(formData.recurringEndDate);
      if (endDate < startDate) {
        toast.error('Recurring end date must be after start date');
        return;
      }
      
      // Validate time range
      const [startHour, startMin] = formData.timeStart.split(':').map(Number);
      const [endHour, endMin] = formData.timeEnd.split(':').map(Number);
      if (endHour < startHour || (endHour === startHour && endMin <= startMin)) {
        toast.error('End time must be after start time');
        return;
      }
    } else {
      // Non-recurring event validation
      if (!formData.startTime) {
        toast.error('Start time is required');
        return;
      }
      
      if (!formData.endTime) {
        toast.error('End time is required');
        return;
      }
    }
    
    // For non-recurring events, parse datetime-local inputs
    let startTimeUTC = '';
    let endTimeUTC = '';
    
    if (!formData.isRecurring) {
      // datetime-local input provides time in format "YYYY-MM-DDTHH:mm" 
      // IMPORTANT: We need to treat this input as Pakistan/Karachi time (PKT, UTC+5)
      // Parse the datetime-local value and explicitly convert from PKT to UTC
      const parsePakistanDateTimeToUTC = (dateTimeString) => {
        // Format: "YYYY-MM-DDTHH:mm" (datetime-local input - NO timezone info)
        // CRITICAL: datetime-local input is timezone-agnostic, so we MUST treat it as PKT
        const [datePart, timePart] = dateTimeString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // Method: Create a date string with explicit PKT timezone (+05:00)
        // This tells JavaScript: "This time is in PKT, convert it to UTC"
        // PKT = UTC+5, so PKT 13:32 = UTC 08:32
        const pktDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:00`;
        
        // Parse with explicit timezone - JavaScript will convert PKT to UTC
        const dateWithTimezone = new Date(pktDateString);
        
        if (isNaN(dateWithTimezone.getTime())) {
          console.error('❌ Failed to parse PKT date:', dateTimeString);
          throw new Error('Invalid date format');
        }
        
        // Verify the conversion
        // If input is 13:32 PKT, UTC should be 08:32 (13:32 - 5 hours)
        const utcHours = dateWithTimezone.getUTCHours();
        const utcMinutes = dateWithTimezone.getUTCMinutes();
        const expectedUTCHours = hours >= 5 ? (hours - 5) : (hours + 24 - 5);
        
        // Debug log
        console.log('🕐 PKT to UTC Conversion:', {
          input: dateTimeString,
          interpretedAsPKT: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} PKT`,
          convertedToUTC: `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')} UTC`,
          expectedUTC: `${String(expectedUTCHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} UTC`,
          isoString: dateWithTimezone.toISOString(),
          verification: utcHours === expectedUTCHours ? '✅ Correct' : '❌ Mismatch'
        });
        
        // Double-check: Convert back to PKT to verify
        const backToPKT = dateWithTimezone.toLocaleString('en-US', {
          timeZone: 'Asia/Karachi',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        console.log('   Verification (UTC back to PKT):', backToPKT);
        
        return dateWithTimezone; // Date object stores UTC internally
      };
      
      const startTimeUTC_Date = parsePakistanDateTimeToUTC(formData.startTime);
      const endTimeUTC_Date = parsePakistanDateTimeToUTC(formData.endTime);
      
      if (isNaN(startTimeUTC_Date.getTime())) {
        toast.error('Invalid start time');
        return;
      }
      
      if (isNaN(endTimeUTC_Date.getTime())) {
        toast.error('Invalid end time');
        return;
      }
      
      if (endTimeUTC_Date <= startTimeUTC_Date) {
        toast.error('End time must be after start time');
        return;
      }
      
      // Convert to ISO string for backend (already in UTC)
      startTimeUTC = startTimeUTC_Date.toISOString();
      endTimeUTC = endTimeUTC_Date.toISOString();
      
      // CRITICAL VERIFICATION: Convert back to PKT to ensure it matches input
      const verifyStartPKT = new Date(startTimeUTC).toLocaleString('en-US', { 
        timeZone: 'Asia/Karachi', 
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false 
      });
      const verifyEndPKT = new Date(endTimeUTC).toLocaleString('en-US', { 
        timeZone: 'Asia/Karachi', 
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false 
      });
      
      // Extract time part for comparison
      const inputStartTime = formData.startTime.split('T')[1];
      const verifyStartTime = verifyStartPKT.split(', ')[1]?.substring(0, 5); // HH:MM
      
      // Debug logging - shows timezone conversion
      console.log('⏰ Time Conversion (PKT → UTC):');
      console.log('  📥 Form input (startTime - PKT):', formData.startTime, `(${inputStartTime})`);
      console.log('  🔄 UTC for backend:', startTimeUTC);
      console.log('  ✅ Verification - UTC back to PKT:', verifyStartPKT, `(${verifyStartTime})`);
      console.log('  🎯 Match:', inputStartTime === verifyStartTime ? '✅ CORRECT' : '❌ MISMATCH');
      console.log('  📥 Form input (endTime - PKT):', formData.endTime);
      console.log('  🔄 UTC for backend:', endTimeUTC);
      console.log('  ✅ Verification - UTC back to PKT:', verifyEndPKT);
      
      // Warn if conversion doesn't match
      if (inputStartTime !== verifyStartTime) {
        console.warn('⚠️ TIMEZONE CONVERSION MISMATCH!');
        console.warn('   Input time:', inputStartTime);
        console.warn('   Converted back:', verifyStartTime);
        console.warn('   This means the time will display incorrectly!');
      }
    } else {
      // For recurring events, use dummy startTime/endTime (required by backend validation)
      // Backend will recalculate these based on first occurrence
      const now = new Date();
      startTimeUTC = now.toISOString();
      endTimeUTC = new Date(now.getTime() + 3600000).toISOString(); // 1 hour later
    }
    
    if (!formData.deviceId) {
      toast.error('Please select a device');
      return;
    }
    
    // Validate temperature is provided (required)
    if (!formData.temperature || formData.temperature === '') {
      toast.error('Temperature is required');
      return;
    }

    const temperature = parseInt(formData.temperature);
    if (isNaN(temperature) || temperature < 16 || temperature > 30) {
      toast.error('Temperature must be between 16 and 30 degrees (integer only)');
      return;
    }

    // Prepare submit data - only device events are supported
    // powerOn is always true (events turn device ON when event starts)
    const submitData = {
      name: formData.name.trim(),
      eventType: 'device', // Always device
      startTime: startTimeUTC, // Required by backend, will be recalculated for recurring events
      endTime: endTimeUTC, // Required by backend, will be recalculated for recurring events
      deviceId: parseInt(formData.deviceId),
      organizationId: null, // No organization events
      temperature: temperature, // Temperature is required
      powerOn: true, // Event will turn device ON when it starts
      isRecurring: formData.isRecurring
    };
    
    // Add recurring event fields if this is a recurring event
    if (formData.isRecurring) {
      submitData.recurringType = 'weekly';
      submitData.daysOfWeek = formData.daysOfWeek.map(Number); // Ensure numbers
      submitData.recurringStartDate = formData.recurringStartDate;
      submitData.recurringEndDate = formData.recurringEndDate;
      submitData.timeStart = formData.timeStart.includes(':') && formData.timeStart.split(':').length === 2 
        ? `${formData.timeStart}:00` // Add seconds if not present
        : formData.timeStart;
      submitData.timeEnd = formData.timeEnd.includes(':') && formData.timeEnd.split(':').length === 2
        ? `${formData.timeEnd}:00` // Add seconds if not present
        : formData.timeEnd;
    }
    
    console.log('Submitting event data:', submitData);
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Event Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Select Device *</label>
        <select
          value={formData.deviceId}
          onChange={(e) => setFormData({...formData, deviceId: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
          >
            <option value="">Select a device</option>
            {Array.isArray(acs) && acs.length > 0 ? acs.map(ac => (
              <option key={ac.id} value={ac.id}>{ac.name || `Device #${ac.id}`}</option>
            )) : (
              <option value="" disabled>No devices available</option>
            )}
          </select>
          {Array.isArray(acs) && acs.length === 0 && (
            <p className="mt-1 text-sm text-red-600">No devices available. Please create a device first.</p>
          )}
        <p className="mt-1 text-xs text-gray-500">Event will automatically turn device ON when it starts and OFF when it completes</p>
        </div>

      {/* Show datetime inputs only for non-recurring events */}
      {!formData.isRecurring && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Time *</label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({...formData, startTime: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required={!formData.isRecurring}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="mt-1 text-xs text-gray-500">Event start date and time</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">End Time *</label>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => setFormData({...formData, endTime: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required={!formData.isRecurring}
              min={formData.startTime || new Date().toISOString().slice(0, 16)}
            />
            <p className="mt-1 text-xs text-gray-500">Event end date and time (must be after start time)</p>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Temperature (°C) *</label>
        <input
          type="number"
          min="16"
          max="30"
          step="1"
          value={formData.temperature}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '') {
              setFormData({...formData, temperature: ''});
            } else {
              const temp = parseInt(value);
              if (!isNaN(temp)) {
                setFormData({...formData, temperature: temp});
              }
            }
          }}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Required (16-30°C)"
          required
        />
        <p className="mt-1 text-xs text-gray-500">Required: Temperature will be set when event is created and device will be turned OFF. (Integer only, no decimals)</p>
      </div>

      {/* Recurring Event Toggle */}
      <div className="border-t pt-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isRecurring"
            checked={formData.isRecurring}
            onChange={(e) => setFormData({...formData, isRecurring: e.target.checked, daysOfWeek: []})}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isRecurring" className="ml-2 block text-sm font-medium text-gray-700">
            Make this a recurring event (weekly schedule)
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-500">Enable to create a weekly recurring schedule</p>
      </div>

      {/* Recurring Event Fields */}
      {formData.isRecurring && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Recurring Start Date *</label>
              <input
                type="date"
                value={formData.recurringStartDate}
                onChange={(e) => setFormData({...formData, recurringStartDate: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required={formData.isRecurring}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Recurring End Date *</label>
              <input
                type="date"
                value={formData.recurringEndDate}
                onChange={(e) => setFormData({...formData, recurringEndDate: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required={formData.isRecurring}
                min={formData.recurringStartDate || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Daily Start Time *</label>
              <input
                type="time"
                value={formData.timeStart}
                onChange={(e) => setFormData({...formData, timeStart: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required={formData.isRecurring}
              />
              <p className="mt-1 text-xs text-gray-500">Time when event starts each day</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Daily End Time *</label>
              <input
                type="time"
                value={formData.timeEnd}
                onChange={(e) => setFormData({...formData, timeEnd: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required={formData.isRecurring}
                min={formData.timeStart}
              />
              <p className="mt-1 text-xs text-gray-500">Time when event ends each day</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week *</label>
            <div className="grid grid-cols-7 gap-2">
              {[
                { value: 0, label: 'Sun' },
                { value: 1, label: 'Mon' },
                { value: 2, label: 'Tue' },
                { value: 3, label: 'Wed' },
                { value: 4, label: 'Thu' },
                { value: 5, label: 'Fri' },
                { value: 6, label: 'Sat' }
              ].map(day => (
                <label key={day.value} className="flex flex-col items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.daysOfWeek.includes(day.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          daysOfWeek: [...formData.daysOfWeek, day.value].sort()
                        });
                      } else {
                        setFormData({
                          ...formData,
                          daysOfWeek: formData.daysOfWeek.filter(d => d !== day.value)
                        });
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="mt-1 text-xs text-gray-700">{day.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">Select the days when this event should occur</p>
          </div>
        </>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel || (() => {})}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {event?.id ? 'Update Event' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: return true if props are EQUAL (should NOT re-render)
  // Return false if props are DIFFERENT (should re-render)
  
  // Only re-render if event ID actually changes
  const eventIdChanged = prevProps.event?.id !== nextProps.event?.id;
  
  // If event ID changed, we need to re-render
  if (eventIdChanged) {
    return false; // Props are different, should re-render
  }
  
  // If event IDs are the same, don't re-render (ignore other prop changes)
  // We intentionally ignore changes to acs/organizations/onSubmit/onCancel
  // as they're recreated on each render but don't affect form state
  return true; // Props are equal (for our purposes), should NOT re-render
});

EventForm.displayName = 'EventForm';

export default EventForm;

