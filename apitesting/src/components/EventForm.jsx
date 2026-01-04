import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

const EventForm = React.memo(({ onSubmit, onCancel, event = null, acs = [], eventType = null, disableDeviceSelection = false }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Initialize form data - only set from event prop on mount if event exists
  // Only device events are supported now
  const [formData, setFormData] = useState(() => {
    // Debug: Log when form initializes
    if (event?.deviceId) {
      console.log('🔧 [EventForm] Initializing with deviceId:', event.deviceId, 'Type:', typeof event.deviceId);
    }
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
    // Set isRecurring based on eventType prop if provided
    // For device-power type, default to non-recurring (single day), user can toggle to recurring for multiple days
    const isRecurring = eventType === 'recurring' || (event?.isRecurring === true);
    return {
      name: '',
      deviceId: event?.deviceId ? String(event.deviceId) : '',
      startTime: '',
      endTime: '',
      temperature: eventType === 'device-power' ? '' : '', // Temperature not required for device-power
      controlDevicePower: eventType === 'device-power' ? true : (event?.controlDevicePower || false),
      deviceOnTime: event?.deviceOnTime || '',
      deviceOffTime: event?.deviceOffTime || '',
      isRecurring: isRecurring,
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
          isRecurring: eventType === 'recurring' || false,
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
          deviceId: event?.deviceId ? String(event.deviceId) : '',
          isRecurring: eventType === 'recurring' || prev.isRecurring
        }));
      } else if (!currentEventId && currentDeviceId && !prevDeviceId) {
        // First time setting deviceId for new event
        setFormData(prev => ({
          ...prev,
          deviceId: event?.deviceId ? String(event.deviceId) : prev.deviceId,
          isRecurring: eventType === 'recurring' || prev.isRecurring
        }));
      }
      // If both are null (creating new event), don't reset - let user keep typing
    }
  }, [event?.id, event?.deviceId, event, eventType]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('⚠️ [EventForm] Form submission already in progress, ignoring duplicate submit');
      return;
    }
    
    setIsSubmitting(true);
    
    // Validation
    if (!formData.name || formData.name.trim() === '') {
      toast.error('Event name is required');
      setIsSubmitting(false);
      return;
    }
    
    // Validation for recurring vs non-recurring events
    if (formData.isRecurring) {
      // Recurring event validation
      if (!formData.recurringStartDate) {
        toast.error('Recurring start date is required');
        setIsSubmitting(false);
        return;
      }
      
      if (!formData.recurringEndDate) {
        toast.error('Recurring end date is required');
        setIsSubmitting(false);
        return;
      }
      
      if (!formData.timeStart) {
        toast.error('Start time is required for recurring events');
        setIsSubmitting(false);
        return;
      }
      
      if (!formData.timeEnd) {
        toast.error('End time is required for recurring events');
        setIsSubmitting(false);
        return;
      }
      
      if (formData.daysOfWeek.length === 0) {
        toast.error('Please select at least one day of the week');
        setIsSubmitting(false);
        return;
      }
      
      // Validate date range
      const startDate = new Date(formData.recurringStartDate);
      const endDate = new Date(formData.recurringEndDate);
      if (endDate < startDate) {
        toast.error('Recurring end date must be after start date');
        setIsSubmitting(false);
        return;
      }
      
      // Validate time range
      const [startHour, startMin] = formData.timeStart.split(':').map(Number);
      const [endHour, endMin] = formData.timeEnd.split(':').map(Number);
      if (endHour < startHour || (endHour === startHour && endMin <= startMin)) {
        toast.error('End time must be after start time');
        setIsSubmitting(false);
        return;
      }
    } else {
      // Non-recurring event validation
      // For device-power events, check deviceOnTime/deviceOffTime instead of startTime/endTime
      if (eventType === 'device-power' || formData.controlDevicePower) {
        if (!formData.deviceOnTime) {
          toast.error('Device On Time is required');
          setIsSubmitting(false);
          return;
        }
        if (!formData.deviceOffTime) {
          toast.error('Device Off Time is required');
          setIsSubmitting(false);
          return;
        }
      } else {
        // For regular events, check startTime/endTime
        if (!formData.startTime) {
          toast.error('Start time is required');
          setIsSubmitting(false);
          return;
        }
        
        if (!formData.endTime) {
          toast.error('End time is required');
          setIsSubmitting(false);
          return;
        }
      }
    }
    
    // For non-recurring events, parse datetime-local inputs
    // Initialize variables to avoid "is not defined" errors
    let startTimeUTC = '';
    let endTimeUTC = '';
    
    try {
    if (!formData.isRecurring) {
      // For device-power events, skip startTime/endTime parsing (we'll use deviceOnTime/deviceOffTime)
      if (eventType === 'device-power' || formData.controlDevicePower) {
        // Device-power events use deviceOnTime/deviceOffTime, not startTime/endTime
        // These will be set later in the submitData preparation
        startTimeUTC = ''; // Will be set from deviceOnTime
        endTimeUTC = ''; // Will be set from deviceOffTime
      } else {
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
        // If input is 8:16 PKT, UTC should be 3:16 (8:16 - 5 hours)
        const utcHours = dateWithTimezone.getUTCHours();
        const utcMinutes = dateWithTimezone.getUTCMinutes();
        
        // Calculate expected UTC: PKT - 5 hours
        // Handle day rollover: if hours < 5, subtract from previous day
        let expectedUTCHours;
        if (hours >= 5) {
          expectedUTCHours = hours - 5;
        } else {
          // If hours < 5, we go to previous day (e.g., 3:16 PKT = 22:16 previous day UTC)
          expectedUTCHours = hours + 24 - 5;
        }
        
        // Verify conversion is correct
        if (utcHours !== expectedUTCHours) {
          console.error('❌ PKT to UTC conversion mismatch!', {
          input: dateTimeString,
            inputPKT: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} PKT`,
            convertedUTC: `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')} UTC`,
            expectedUTC: `${String(expectedUTCHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')} UTC`,
            isoString: dateWithTimezone.toISOString()
        });
        }
        
        // Double-check: Convert back to PKT to verify it matches input
        const backToPKT = dateWithTimezone.toLocaleString('en-US', {
          timeZone: 'Asia/Karachi',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const [backHour, backMin] = backToPKT.split(':').map(Number);
        
        // Verify round-trip conversion
        if (backHour !== hours || backMin !== minutes) {
          console.error('❌ Round-trip conversion failed!', {
            input: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} PKT`,
            convertedBack: backToPKT,
            mismatch: true
          });
        }
        
        return dateWithTimezone; // Date object stores UTC internally
      };
      
      const startTimeUTC_Date = parsePakistanDateTimeToUTC(formData.startTime);
      const endTimeUTC_Date = parsePakistanDateTimeToUTC(formData.endTime);
      
      if (isNaN(startTimeUTC_Date.getTime())) {
        toast.error('Invalid start time');
        setIsSubmitting(false);
        return;
      }
      
      if (isNaN(endTimeUTC_Date.getTime())) {
        toast.error('Invalid end time');
        setIsSubmitting(false);
        return;
      }
      
      if (endTimeUTC_Date <= startTimeUTC_Date) {
        toast.error('End time must be after start time');
        setIsSubmitting(false);
        return;
      }
      
        // Convert to ISO string for backend (already in UTC)
        startTimeUTC = startTimeUTC_Date.toISOString();
        endTimeUTC = endTimeUTC_Date.toISOString();
      }
      
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
      const inputEndTime = formData.endTime.split('T')[1];
      const verifyEndTime = verifyEndPKT.split(', ')[1]?.substring(0, 5); // HH:MM
      
      // Debug logging - shows timezone conversion
      console.log('⏰ Time Conversion (PKT → UTC):');
      console.log('  📥 Form input (startTime - PKT):', formData.startTime, `(${inputStartTime})`);
      console.log('  🔄 UTC for backend:', startTimeUTC);
      console.log('  ✅ Verification - UTC back to PKT:', verifyStartPKT, `(${verifyStartTime})`);
      console.log('  🎯 Match:', inputStartTime === verifyStartTime ? '✅ CORRECT' : '❌ MISMATCH');
      console.log('  📥 Form input (endTime - PKT):', formData.endTime, `(${inputEndTime})`);
      console.log('  🔄 UTC for backend:', endTimeUTC);
      console.log('  ✅ Verification - UTC back to PKT:', verifyEndPKT, `(${verifyEndTime})`);
      console.log('  🎯 Match:', inputEndTime === verifyEndTime ? '✅ CORRECT' : '❌ MISMATCH');
      
      // Warn if conversion doesn't match - this is critical!
      if (inputStartTime !== verifyStartTime) {
        console.error('❌ TIMEZONE CONVERSION MISMATCH FOR START TIME!');
        console.error('   Input time (PKT):', inputStartTime);
        console.error('   Converted back (PKT):', verifyStartTime);
        console.error('   UTC stored:', startTimeUTC);
        console.error('   This means the time will display incorrectly!');
        toast.error(`Time conversion error: ${inputStartTime} PKT converted incorrectly`);
      }
      
      if (inputEndTime !== verifyEndTime) {
        console.error('❌ TIMEZONE CONVERSION MISMATCH FOR END TIME!');
        console.error('   Input time (PKT):', inputEndTime);
        console.error('   Converted back (PKT):', verifyEndTime);
        console.error('   UTC stored:', endTimeUTC);
        toast.error(`Time conversion error: ${inputEndTime} PKT converted incorrectly`);
      }
    } else {
      // For recurring events, use dummy startTime/endTime (required by backend validation)
      // Backend will recalculate these based on first occurrence
      const now = new Date();
      startTimeUTC = now.toISOString();
      endTimeUTC = new Date(now.getTime() + 3600000).toISOString(); // 1 hour later
      }
    } catch (error) {
      console.error('Error processing event times:', error);
      toast.error(error.message || 'Failed to process event times');
      setIsSubmitting(false);
      return; // Exit early if time processing fails
    }
    
    if (!formData.deviceId) {
      toast.error('Please select a device');
      setIsSubmitting(false);
      return;
    }
    
    // Validate temperature is provided (required for simple and recurring events, not for device-power)
    let temperature = null;
    if (eventType !== 'device-power') {
      if (!formData.temperature || formData.temperature === '') {
        toast.error('Temperature is required');
        setIsSubmitting(false);
        return;
      }

      temperature = parseInt(formData.temperature);
      if (isNaN(temperature) || temperature < 16 || temperature > 30) {
        toast.error('Temperature must be between 16 and 30 degrees (integer only)');
        setIsSubmitting(false);
        return;
      }
    }

    // Validate device power control times if enabled (for device-power event type)
    if (eventType === 'device-power' || formData.controlDevicePower) {
      if (!formData.isRecurring) {
        if (!formData.deviceOnTime) {
          toast.error('Device On Time is required when power control is enabled');
          setIsSubmitting(false);
          return;
        }
        if (!formData.deviceOffTime) {
          toast.error('Device Off Time is required when power control is enabled');
          setIsSubmitting(false);
          return;
        }
        // Parse device on/off times
        const parsePakistanDateTimeToUTC = (dateTimeString) => {
          const [datePart, timePart] = dateTimeString.split('T');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hours, minutes] = timePart.split(':').map(Number);
          const pktDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:00`;
          return new Date(pktDateString);
        };
        const deviceOnTimeUTC = parsePakistanDateTimeToUTC(formData.deviceOnTime);
        const deviceOffTimeUTC = parsePakistanDateTimeToUTC(formData.deviceOffTime);
        if (deviceOffTimeUTC <= deviceOnTimeUTC) {
          toast.error('Device Off Time must be after Device On Time');
          setIsSubmitting(false);
          return;
        }
      } else {
        if (!formData.deviceOnTime) {
          toast.error('Device On Time is required when power control is enabled');
          setIsSubmitting(false);
          return;
        }
        if (!formData.deviceOffTime) {
          toast.error('Device Off Time is required when power control is enabled');
          setIsSubmitting(false);
          return;
        }
        // Validate time range for recurring events
        const [onHour, onMin] = formData.deviceOnTime.split(':').map(Number);
        const [offHour, offMin] = formData.deviceOffTime.split(':').map(Number);
        if (offHour < onHour || (offHour === onHour && offMin <= onMin)) {
          toast.error('Device Off Time must be after Device On Time');
          setIsSubmitting(false);
          return;
        }
      }
    }

    // For device-power events, use deviceOnTime/deviceOffTime as startTime/endTime
    let finalStartTime = startTimeUTC;
    let finalEndTime = endTimeUTC;
    let finalDeviceOnTime = null;
    let finalDeviceOffTime = null;
    
    if (eventType === 'device-power' || formData.controlDevicePower) {
      if (!formData.isRecurring) {
        // Non-recurring: deviceOnTime and deviceOffTime are datetime-local
        // Parse them and use as startTime/endTime
        const parsePakistanDateTimeToUTC = (dateTimeString) => {
          const [datePart, timePart] = dateTimeString.split('T');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hours, minutes] = timePart.split(':').map(Number);
          const pktDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:00`;
          return new Date(pktDateString);
        };
        
        const deviceOnTimeUTC = parsePakistanDateTimeToUTC(formData.deviceOnTime);
        const deviceOffTimeUTC = parsePakistanDateTimeToUTC(formData.deviceOffTime);
        
        finalStartTime = deviceOnTimeUTC.toISOString();
        finalEndTime = deviceOffTimeUTC.toISOString();
        finalDeviceOnTime = deviceOnTimeUTC.toISOString();
        finalDeviceOffTime = deviceOffTimeUTC.toISOString();
      } else {
        // Recurring: deviceOnTime and deviceOffTime are time strings (HH:MM)
        // startTime/endTime will be calculated from recurringStartDate + time
        finalDeviceOnTime = formData.deviceOnTime;
        finalDeviceOffTime = formData.deviceOffTime;
        // For recurring events, startTime/endTime are still needed for the first occurrence
        // They will be calculated from recurringStartDate + timeStart/timeEnd
      }
    }

    // Prepare submit data - only device events are supported
    const submitData = {
      name: formData.name.trim(),
      eventType: 'device', // Always device
      startTime: finalStartTime, // For device-power, this is deviceOnTime; for others, it's the form startTime
      endTime: finalEndTime, // For device-power, this is deviceOffTime; for others, it's the form endTime
      deviceId: parseInt(formData.deviceId),
      organizationId: null, // No organization events
      temperature: eventType === 'device-power' ? null : temperature, // Temperature not required for device-power
      powerOn: (eventType === 'device-power' || formData.controlDevicePower) ? true : false, // Turn device on only if power control is enabled
      controlDevicePower: (eventType === 'device-power' || formData.controlDevicePower) || false,
      deviceOnTime: finalDeviceOnTime,
      deviceOffTime: finalDeviceOffTime,
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
    
    // Call onSubmit - it may be async or sync
    const onSubmitResult = onSubmit(submitData);
    
    // If onSubmit returns a promise, wait for it
    if (onSubmitResult && typeof onSubmitResult.then === 'function') {
      onSubmitResult
        .then(() => {
          // Reset submitting state after a delay to allow modal to close
          setTimeout(() => {
            setIsSubmitting(false);
          }, 1000);
        })
        .catch((error) => {
          console.error('Error in onSubmit callback:', error);
          setIsSubmitting(false);
        });
    } else {
      // If onSubmit is sync, reset after delay
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left Section - Event Form (Blue) */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 md:p-10">
          <h3 className="text-2xl font-bold text-blue-700 mb-8">Event Form</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-3">Event Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                placeholder="Enter event name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-3">
                Select Device *
                {disableDeviceSelection && formData.deviceId && (
                  <span className="ml-2 text-xs font-normal text-blue-600">(Pre-selected)</span>
                )}
              </label>
              <div className="relative">
                <select
                  value={formData.deviceId || ''}
                  onChange={(e) => setFormData({...formData, deviceId: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500 appearance-none pr-10 transition-all"
                  required
                  disabled={disableDeviceSelection}
                >
                  <option value="">Select a device</option>
                  {Array.isArray(acs) && acs.length > 0 ? acs.map(ac => (
                    <option key={ac.id} value={ac.id}>{ac.name || `Device #${ac.id}`}</option>
                  )) : (
                    <option value="" disabled>No devices available</option>
                  )}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {Array.isArray(acs) && acs.length === 0 && (
                <p className="mt-2 text-sm text-red-600">No devices available. Please create a device first.</p>
              )}
            </div>

            {/* Temperature field - Only for simple and recurring events, not for device-power */}
            {eventType !== 'device-power' && (
              <div>
                <label className="block text-sm font-semibold text-blue-900 mb-3">Temperature (°C) *</label>
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
                  className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="16-30"
                  required
                />
                <p className="mt-2 text-xs text-gray-500">Temperature must be between 16 and 30 degrees</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Event Details (White) */}
        <div className="bg-white p-8 md:p-10 border-l border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Event Details</h3>
          <div className="space-y-6">

            {/* Show datetime inputs only for simple events (not recurring, not device-power) */}
            {eventType === 'simple' && !formData.isRecurring && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                    required
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="mt-2 text-xs text-gray-500">Event start date and time</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">End Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                    required
                    min={formData.startTime || new Date().toISOString().slice(0, 16)}
                  />
                  <p className="mt-2 text-xs text-gray-500">Event end date and time (must be after start time)</p>
                </div>
              </>
            )}

            {/* Device Power Control Section - Only for device-power event type */}
            {eventType === 'device-power' && (
              <>
                {!formData.isRecurring ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Device On Time *</label>
                      <input
                        type="datetime-local"
                        value={formData.deviceOnTime}
                        onChange={(e) => setFormData({...formData, deviceOnTime: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                        required
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      <p className="mt-2 text-xs text-gray-500">When to turn the device ON</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Device Off Time *</label>
                      <input
                        type="datetime-local"
                        value={formData.deviceOffTime}
                        onChange={(e) => setFormData({...formData, deviceOffTime: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                        required
                        min={formData.deviceOnTime || new Date().toISOString().slice(0, 16)}
                      />
                      <p className="mt-2 text-xs text-gray-500">When to turn the device OFF (must be after On Time)</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Device On Time (Daily) *</label>
                      <input
                        type="time"
                        value={formData.deviceOnTime}
                        onChange={(e) => setFormData({...formData, deviceOnTime: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                        required
                      />
                      <p className="mt-2 text-xs text-gray-500">Daily time to turn the device ON</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">Device Off Time (Daily) *</label>
                      <input
                        type="time"
                        value={formData.deviceOffTime}
                        onChange={(e) => setFormData({...formData, deviceOffTime: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                        required
                        min={formData.deviceOnTime || '00:00'}
                      />
                      <p className="mt-2 text-xs text-gray-500">Daily time to turn the device OFF (must be after On Time)</p>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Recurring Event Toggle - Only for recurring and device-power event types */}
            {(eventType === 'recurring' || eventType === 'device-power') && (
              <div>
                <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-300">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({...formData, isRecurring: e.target.checked, daysOfWeek: []})}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="isRecurring" className="ml-3 block text-sm font-semibold text-gray-900 cursor-pointer">
                    Make this a recurring event (weekly schedule)
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500">Enable to create a weekly recurring schedule</p>
              </div>
            )}

            {/* Recurring Event Fields */}
            {formData.isRecurring && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Recurring Start Date *</label>
                    <input
                      type="date"
                      value={formData.recurringStartDate}
                      onChange={(e) => setFormData({...formData, recurringStartDate: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all"
                      required={formData.isRecurring}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Recurring End Date *</label>
                    <input
                      type="date"
                      value={formData.recurringEndDate}
                      onChange={(e) => setFormData({...formData, recurringEndDate: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all"
                      required={formData.isRecurring}
                      min={formData.recurringStartDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Daily Start Time *</label>
                    <input
                      type="time"
                      value={formData.timeStart}
                      onChange={(e) => setFormData({...formData, timeStart: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all"
                      required={formData.isRecurring}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Daily End Time *</label>
                    <input
                      type="time"
                      value={formData.timeEnd}
                      onChange={(e) => setFormData({...formData, timeEnd: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all"
                      required={formData.isRecurring}
                      min={formData.timeStart}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Days of Week *</label>
                  <div className="grid grid-cols-7 gap-3">
                    {[
                      { value: 0, label: 'Sun' },
                      { value: 1, label: 'Mon' },
                      { value: 2, label: 'Tue' },
                      { value: 3, label: 'Wed' },
                      { value: 4, label: 'Thu' },
                      { value: 5, label: 'Fri' },
                      { value: 6, label: 'Sat' }
                    ].map(day => (
                      <label key={day.value} className="flex flex-col items-center cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
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
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                        />
                        <span className="mt-2 text-xs font-medium text-gray-700">{day.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-gray-500">Select the days when this event should occur</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel || (() => {})}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {event?.id ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {event?.id ? 'Update Event' : 'Create Event'}
            </>
          )}
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

