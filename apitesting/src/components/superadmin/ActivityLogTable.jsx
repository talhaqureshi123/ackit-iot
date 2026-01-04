import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const ActivityLogTable = ({ logs, loading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'N/A';
    }
  };

  // Filter logs based on search
  const filteredLogs = useMemo(() => {
    if (!logs || !Array.isArray(logs)) return [];
    
    return logs.filter(log => {
      const searchLower = searchTerm.toLowerCase();
      const action = (log.action || '').toLowerCase();
      const details = typeof log.details === 'object' 
        ? JSON.stringify(log.details).toLowerCase()
        : (log.details || '').toLowerCase();
      const adminName = (log.admin?.name || '').toLowerCase();
      const adminEmail = (log.admin?.email || '').toLowerCase();
      const date = formatDate(log.createdAt).toLowerCase();
      
      return action.includes(searchLower) ||
             details.includes(searchLower) ||
             adminName.includes(searchLower) ||
             adminEmail.includes(searchLower) ||
             date.includes(searchLower);
    });
  }, [logs, searchTerm]);

  // Sort logs
  const sortedLogs = useMemo(() => {
    const sorted = [...filteredLogs];
    
    sorted.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'date':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        case 'performedBy':
          aValue = (a.admin?.name || '').toLowerCase();
          bValue = (b.admin?.name || '').toLowerCase();
          break;
        case 'description':
          aValue = (a.action || '').toLowerCase();
          bValue = (b.action || '').toLowerCase();
          break;
        case 'details':
          aValue = typeof a.details === 'object' 
            ? JSON.stringify(a.details).toLowerCase()
            : (a.details || '').toLowerCase();
          bValue = typeof b.details === 'object'
            ? JSON.stringify(b.details).toLowerCase()
            : (b.details || '').toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredLogs, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedLogs.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedLogs = sortedLogs.slice(startIndex, endIndex);

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  // Sort icon
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-full overflow-hidden">
      {/* Header Section */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Activity Log</h2>
          <p className="text-sm text-gray-600">
            This activity log holds all activity from the portal's creation. Use the search bar to filter results by user name, email, IP address, or date. 
            Columns are sortable and the display can show up to {recordsPerPage} records per page.
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-700">Activity Log</h3>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto w-full max-w-full">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[180px]" />
            <col className="w-[150px]" />
            <col className="w-[180px]" />
            <col className="w-auto" />
            <col className="w-[120px]" />
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th 
                className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center space-x-1">
                  <span>Date</span>
                  <SortIcon columnKey="date" />
                </div>
              </th>
              <th 
                className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('performedBy')}
              >
                <div className="flex items-center space-x-1">
                  <span>Performed by</span>
                  <SortIcon columnKey="performedBy" />
                </div>
              </th>
              <th 
                className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('description')}
              >
                <div className="flex items-center space-x-1">
                  <span>Description</span>
                  <SortIcon columnKey="description" />
                </div>
              </th>
              <th 
                className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('details')}
              >
                <div className="flex items-center space-x-1">
                  <span>Details</span>
                  <SortIcon columnKey="details" />
                </div>
              </th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </td>
              </tr>
            ) : paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                  No activity logs found
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log, index) => (
                <tr key={log.id || index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 sm:px-4 py-4 text-sm text-gray-900 break-words">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-sm text-gray-900 break-words">
                    {log.admin?.name || 'N/A'}
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-sm text-gray-900 break-words">
                    {log.action || 'N/A'}
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-sm text-gray-900">
                    <div className="break-words overflow-wrap-anywhere word-break-break-all">
                      {typeof log.details === 'object' 
                        ? (log.details?.message || JSON.stringify(log.details))
                        : (log.details || 'N/A')}
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-sm text-gray-500 break-words">
                    {log.ipAddress || 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Section */}
      {sortedLogs.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Display {recordsPerPage} records Showing {startIndex + 1} to {Math.min(endIndex, sortedLogs.length)} of {sortedLogs.length} entries.
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <span className="px-2 text-gray-500">...</span>
              )}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  {totalPages}
                </button>
              )}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogTable;

