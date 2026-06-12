import React, { useState, useEffect } from 'react';
import './DataTable.css';
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';

const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  rowsPerPage = 10,
  emptyTitle,
  emptyDescription,
  emptyActionText,
  emptyOnActionClick,
  emptyActionIcon
}) => {
  // Sort State: { key: string | null, direction: 'asc' | 'desc' | null }
  const [sortState, setSortState] = useState({ key: null, direction: null });
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  // Handle Sort Toggle
  const handleSort = (columnKey, sortable) => {
    if (!sortable) return;
    
    setSortState(prev => {
      if (prev.key !== columnKey) {
        return { key: columnKey, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key: columnKey, direction: 'desc' };
      }
      return { key: null, direction: null };
    });
  };

  // Sort Data
  const getSortedData = () => {
    if (!sortState.key || !sortState.direction) return data;
    
    return [...data].sort((a, b) => {
      let valA = a[sortState.key];
      let valB = b[sortState.key];

      // Handle nested values if needed (simple fallback here)
      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      if (typeof valA === 'string') {
        return sortState.direction === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortState.direction === 'asc' ? valA - valB : valB - valA;
    });
  };

  const sortedData = getSortedData();
  const totalRows = sortedData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  
  // Slice for active page
  const paginatedData = sortedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="data-table-container">
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              {columns.map((col, colIdx) => {
                const columnKey = col.key || col.accessor || `col-${colIdx}`;
                const isSorted = sortState.key === columnKey;
                const isAsc = isSorted && sortState.direction === 'asc';
                const isDesc = isSorted && sortState.direction === 'desc';

                return (
                  <th
                    key={columnKey}
                    onClick={() => handleSort(columnKey, col.sortable !== false)}
                    className={col.sortable !== false ? 'sortable-header' : ''}
                    style={{ width: col.width }}
                  >
                    <div className="th-content">
                      <span>{col.header}</span>
                      {col.sortable !== false && (
                        <span className={`sort-icon ${isSorted ? 'active' : ''}`}>
                          {isDesc ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton loading state
              Array.from({ length: rowsPerPage }).map((_, rIndex) => (
                <tr key={`skeleton-row-${rIndex}`}>
                  {columns.map((col, colIdx) => (
                    <td key={`skeleton-td-${col.key || col.accessor || colIdx}`}>
                      <Skeleton variant="line" height={16} width={col.skeletonWidth || "70%"} style={{ margin: 0 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row, rIndex) => (
                <tr key={row.id || `row-${rIndex}`}>
                  {columns.map((col, colIdx) => {
                    const columnKey = col.key || col.accessor || `col-${colIdx}`;
                    const cellRender = col.render || col.cell;
                    return (
                      <td key={`cell-${columnKey}`}>
                        {cellRender ? cellRender(row) : row[columnKey]}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="no-data-cell">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionText={emptyActionText}
                    onActionClick={emptyOnActionClick}
                    actionIcon={emptyActionIcon}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalRows > rowsPerPage && (
        <div className="table-pagination">
          <div className="pagination-info">
            Showing <span>{Math.min(totalRows, (currentPage - 1) * rowsPerPage + 1)}</span> to{' '}
            <span>{Math.min(totalRows, currentPage * rowsPerPage)}</span> of <span>{totalRows}</span> entries
          </div>
          <div className="pagination-buttons">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            
            <div className="pagination-pages">
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNum = index + 1;
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`page-number-btn ${currentPage === pageNum ? 'active' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
