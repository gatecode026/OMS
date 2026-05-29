import React, { useState } from 'react';
import './Payroll.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import { DollarSign, Landmark, CheckCircle, Receipt } from 'lucide-react';

const Payroll = () => {
  const isLoading = usePageLoading(600);
  const { payroll, runPayroll, generatePayslip, showConfirm } = useApp();

  const [month, setMonth] = useState('May');
  const [year, setYear] = useState('2026');

  // Calculations
  const totalProcessed = payroll.filter(p => p.status === 'Paid').length;
  const totalPending = payroll.filter(p => p.status === 'Pending').length;
  const totalDisbursedAmount = payroll
    .filter(p => p.status === 'Paid')
    .reduce((acc, curr) => acc + curr.netPay, 0);

  const totalCalculatedPayroll = payroll.reduce((acc, curr) => acc + curr.netPay, 0);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleRunPayrollClick = () => {
    showConfirm(
      'Process Monthly Payroll',
      `Are you sure you want to run and calculate payroll disbursements for all active employees for ${month} ${year}?`,
      () => runPayroll(month, year),
      'warning'
    );
  };

  // Table Columns
  const columns = [
    {
      key: 'employeeName',
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <div className="flex-center gap-3 justify-start">
          <Avatar name={row.employeeName} size="sm" />
          <span className="emp-name-bold">{row.employeeName}</span>
        </div>
      )
    },
    { key: 'department', header: 'Department', sortable: true },
    {
      key: 'baseSalary',
      header: 'Base Salary',
      sortable: true,
      render: (row) => <span>{formatCurrency(row.baseSalary)}</span>
    },
    {
      key: 'allowances',
      header: 'Allowances',
      sortable: true,
      render: (row) => <span className="text-success">+{formatCurrency(row.allowances)}</span>
    },
    {
      key: 'deductions',
      header: 'Deductions',
      sortable: true,
      render: (row) => <span className="text-danger">-{formatCurrency(row.deductions)}</span>
    },
    {
      key: 'netPay',
      header: 'Net Pay',
      sortable: true,
      render: (row) => <strong className="text-info">{formatCurrency(row.netPay)}</strong>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === 'Paid' ? 'success' : 'warning'}>
          {row.status === 'Paid' ? 'Disbursed' : 'Awaiting Review'}
        </Badge>
      )
    },
    {
      key: 'payslip',
      header: 'Payslip',
      sortable: false,
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => generatePayslip(row.employeeName)}
          icon={Receipt}
        >
          Payslip
        </Button>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="payroll-page grid-gap">
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="stats-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card skeleton-card" style={{ height: '100px' }}>
              <Skeleton variant="rect" height="100%" />
            </div>
          ))}
        </div>
        <div className="card" style={{ height: '340px' }}><Skeleton variant="rect" height="100%" /></div>
      </div>
    );
  }

  return (
    <div className="payroll-page flex-column grid-gap">
      
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h2>Payroll & Compensation processing</h2>
          <p className="page-desc-text">Manage salary calculations, allowances, deductions, and disbursal checks</p>
        </div>
        
        <div className="flex-center gap-3">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="payroll-selector">
            <option value="January">January</option>
            <option value="February">February</option>
            <option value="March">March</option>
            <option value="April">April</option>
            <option value="May">May</option>
            <option value="June">June</option>
            <option value="July">July</option>
            <option value="August">August</option>
            <option value="September">September</option>
            <option value="October">October</option>
            <option value="November">November</option>
            <option value="December">December</option>
          </select>
          
          <select value={year} onChange={(e) => setYear(e.target.value)} className="payroll-selector">
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>

          <Button variant="primary" onClick={handleRunPayrollClick} icon={Landmark}>
            Run Payroll
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-row payroll-stats-row">
        <div className="card payroll-stat-card">
          <span className="stat-label">Total Payroll Expense</span>
          <h3 className="stat-num">{formatCurrency(totalCalculatedPayroll)}</h3>
          <span className="stat-desc-sub">Budget for selected period</span>
        </div>
        <div className="card payroll-stat-card">
          <span className="stat-label">Disbursed Amount</span>
          <h3 className="stat-num text-success">{formatCurrency(totalDisbursedAmount)}</h3>
          <span className="stat-desc-sub">Transferred to accounts</span>
        </div>
        <div className="card payroll-stat-card">
          <span className="stat-label">Employees Processed</span>
          <h3 className="stat-num">{totalProcessed}</h3>
          <span className="stat-desc-sub">Bank files generated</span>
        </div>
        <div className="card payroll-stat-card">
          <span className="stat-label">Awaiting Reviews</span>
          <h3 className={`stat-num ${totalPending > 0 ? 'text-warning' : ''}`}>{totalPending}</h3>
          <span className="stat-desc-sub">Pending calculation approval</span>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="card table-wrapper-card">
        <DataTable
          columns={columns}
          data={payroll}
          loading={isLoading}
          rowsPerPage={10}
          emptyTitle="No Payroll Records"
          emptyDescription="Ensure active employee records are registered to calculate compensation."
        />
      </div>

    </div>
  );
};

export default Payroll;
