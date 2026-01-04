import React from 'react';
import { Calendar, Plus, RefreshCw, Play, Square, Edit, Trash2, Thermometer } from 'lucide-react';

/**
 * Reusable Events View Component
 * Used in both AdminDashboard and ManagerDashboard
 */
const EventsView = ({
  events = [],
  eventsLoading = false,
  eventActionLoading = {},
  userStatus,
  role = 'admin',
  onCreateEvent,
  onRefreshEvents,
  onEventAction, // start, stop, enable, disable, delete
  onEditEvent,
  formatDateTime,
  formatTime,
  getStatusBadge
}) => {
  const isDisabled = role === 'admin' 
    ? userStatus === 'suspended'
    : (userStatus === 'locked' || userStatus === 'restricted');

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header Section */}
      <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-2xl p-6 border-2 border-blue-400 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-25 rounded-xl p-3 shadow-xl transform group-hover:rotate-12 transition-transform duration-300">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 drop-shadow-lg">Events</h2>
              <p className="text-blue-100 text-sm font-medium mb-2">Manage and schedule all events</p>
              <span className="inline-block bg-white bg-opacity-25 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm">
                {events.length} Event{events.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {onCreateEvent && (
              <button
                onClick={onCreateEvent}
                disabled={isDisabled}
                className="flex items-center justify-center px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                title={isDisabled ? 'Cannot create events' : 'Create Event'}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Event
              </button>
            )}
            {onRefreshEvents && (
              <button
                onClick={onRefreshEvents}
                disabled={eventsLoading}
                className="flex items-center justify-center px-4 py-3 bg-white bg-opacity-25 text-white rounded-xl hover:bg-white hover:text-blue-600 font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${eventsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
          </div>
        </div>
      </div>

      {!Array.isArray(events) || events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-semibold text-gray-700 mb-2">No events found</p>
          <p className="text-sm text-gray-500">Create an event to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            if (!event || !event.id) return null;
            const isLoading = eventActionLoading[event.id];
            const canStart = event.status === 'scheduled' && !event.isDisabled;
            const canStop = event.status === 'active' && !event.isDisabled;
            const canEdit = !event.isDisabled && event.status !== 'active' && event.status !== 'completed';
            const canDelete = event.status !== 'active';
            const canEnable = event.isDisabled && (event.status === 'scheduled' || event.status === 'active');
            const canDisable = !event.isDisabled && (event.status === 'scheduled' || event.status === 'active');

            return (
              <div key={event.id} className={`bg-white rounded-2xl shadow-lg border-2 ${
                event.isDisabled ? 'border-blue-300' : 'border-gray-200'
              } hover:shadow-xl hover:border-blue-400 transition-all duration-300 overflow-hidden flex flex-col`}>
                {/* Card Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="bg-white bg-opacity-20 rounded-lg p-1.5">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-base font-bold text-white truncate flex-1">
                        {event.name}
                      </h3>
                    </div>
                  </div>
                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getStatusBadge ? getStatusBadge(event.status, event.isDisabled, event.startTime, event.endTime) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white bg-opacity-20 text-white backdrop-blur-sm">
                        {event.status}
                      </span>
                    )}
                    {event.isRecurring && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white bg-opacity-20 text-white backdrop-blur-sm">
                        🔁 Recurring
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col">
                  {/* Event Details */}
                  <div className="space-y-2 mb-3">
                    {/* Device Info */}
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center space-x-2">
                        <Thermometer className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs font-medium text-gray-700">Device</span>
                      </div>
                      <span className="text-xs font-bold text-gray-900">
                        {event.device?.name || `Device #${event.deviceId}`}
                      </span>
                    </div>

                    {/* Temperature */}
                    {event.temperature && (
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center space-x-2">
                          <Thermometer className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-medium text-gray-700">Temp</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900">{event.temperature}°C</span>
                      </div>
                    )}

                    {/* Time Info */}
                    <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      {event.isRecurring ? (
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-0.5">Recurring</div>
                          {event.timeStart && event.timeEnd && (
                            <div className="text-xs font-bold text-gray-900">
                              {event.timeStart} - {event.timeEnd}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div>
                            <div className="text-xs font-semibold text-gray-600 mb-0.5">Start</div>
                            <div className="text-xs font-bold text-gray-900" title={formatDateTime ? formatDateTime(event.startTime) : event.startTime}>
                              {formatTime ? formatTime(event.startTime) : event.startTime}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-600 mb-0.5">End</div>
                            <div className="text-xs font-bold text-gray-900" title={formatDateTime ? formatDateTime(event.endTime) : event.endTime}>
                              {formatTime ? formatTime(event.endTime) : event.endTime}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-3 border-t border-gray-200">
                    {canStart && onEventAction && (
                      <button
                        onClick={() => onEventAction(event.id, 'start')}
                        disabled={isLoading || isDisabled}
                        className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm min-w-[70px]"
                        title="Start event"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Start</span>
                      </button>
                    )}
                    {canStop && onEventAction && (
                      <button
                        onClick={() => onEventAction(event.id, 'stop')}
                        disabled={isLoading || isDisabled}
                        className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm min-w-[70px]"
                        title="Stop event"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Stop</span>
                      </button>
                    )}
                    {canEdit && onEditEvent && (
                      <button
                        onClick={() => onEditEvent(event)}
                        disabled={isLoading || isDisabled}
                        className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm min-w-[70px]"
                        title="Edit event"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}
                    {canDelete && onEventAction && (
                      <button
                        onClick={() => onEventAction(event.id, 'delete')}
                        disabled={isLoading || isDisabled}
                        className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm min-w-[70px]"
                        title="Delete event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                    {isLoading && (
                      <div className="flex-1 flex items-center justify-center min-w-[70px]">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventsView;


