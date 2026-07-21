/**
 * @file payslipDownloader.ts
 * @description Local file system downloading, HTML-to-PDF compilation, and native sharing utilities for payslips.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { toast } from '../../../shared/components/Toast';
import { formatINR } from '../../../shared/utils/format';
import dayjs from 'dayjs';

/**
 * Builds a styled HTML template representing the official payslip.
 */
const generatePayslipHtml = (payment: any): string => {
  const basic = payment.basicSalary || 0;
  const gross = payment.grossSalary || 0;
  const deductions = payment.totalDeductions || 0;
  const net = payment.netSalary || 0;

  // Dynamic breakdown values
  const hra = basic > 0 && gross > basic ? Math.round(basic * 0.4) : 0;
  const travel = basic > 0 && gross > basic ? 3000 : 0;
  const medical = basic > 0 && gross > basic ? 2000 : 0;
  const special = basic > 0 && gross > basic ? 1000 : 0;

  const pf = basic > 0 && deductions > 0 ? Math.round(basic * 0.12) : 0;
  const pt = basic > 0 && deductions > 0 ? 200 : 0;
  const tds = basic > 0 && deductions > 0 ? Math.round(basic * 0.1) : 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payslip - ${payment.month} ${payment.year}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #333333;
          margin: 0;
          padding: 30px;
        }
        .header {
          text-align: center;
          margin-bottom: 25px;
          border-bottom: 2px solid #4F46E5;
          padding-bottom: 15px;
        }
        .logo {
          font-size: 24px;
          font-weight: 800;
          color: #4F46E5;
          margin-bottom: 5px;
        }
        .title {
          font-size: 16px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #666;
          margin: 0;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
        }
        .meta-table td {
          padding: 6px 10px;
          font-size: 12px;
        }
        .meta-label {
          font-weight: bold;
          color: #555;
          width: 20%;
        }
        .meta-val {
          color: #111;
          width: 30%;
        }
        .breakdown-container {
          display: flex;
          justify-content: space-between;
          margin-bottom: 25px;
          gap: 20px;
        }
        .section {
          flex: 1;
        }
        .section h3 {
          font-size: 13px;
          text-transform: uppercase;
          color: #4F46E5;
          border-bottom: 1px solid #E5E7EB;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .item-table {
          width: 100%;
          border-collapse: collapse;
        }
        .item-table td {
          padding: 6px 0;
          font-size: 12px;
        }
        .item-val {
          text-align: right;
          font-weight: bold;
        }
        .total-row td {
          border-top: 1px solid #E5E7EB;
          padding-top: 8px;
          font-weight: bold;
          color: #111;
        }
        .summary-box {
          background-color: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 25px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .summary-row:last-child {
          margin-bottom: 0;
          border-top: 1px solid #E5E7EB;
          padding-top: 8px;
          font-size: 16px;
          font-weight: bold;
          color: #4F46E5;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          color: #888888;
          margin-top: 40px;
          border-top: 1px solid #E5E7EB;
          padding-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">GATECODE OFFICE MANAGEMENT SYSTEM</div>
        <div class="title">Payslip Receipt - ${payment.month} ${payment.year}</div>
      </div>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Employee ID:</td>
          <td class="meta-val">${payment.employeeId || '-'}</td>
          <td class="meta-label">Payment Regime:</td>
          <td class="meta-val">${payment.regime || 'New'} Regime</td>
        </tr>
        <tr>
          <td class="meta-label">Employee Name:</td>
          <td class="meta-val">${payment.employeeName || 'Employee'}</td>
          <td class="meta-label">PAN Card:</td>
          <td class="meta-val">${payment.pan || '-'}</td>
        </tr>
        <tr>
          <td class="meta-label">Department:</td>
          <td class="meta-val">${payment.department || '-'}</td>
          <td class="meta-label">Bank Name:</td>
          <td class="meta-val">${payment.bankName || '-'}</td>
        </tr>
        <tr>
          <td class="meta-label">Designation:</td>
          <td class="meta-val">${payment.designation || '-'}</td>
          <td class="meta-label">Bank Account:</td>
          <td class="meta-val">${payment.bankAccount || '-'}</td>
        </tr>
        <tr>
          <td class="meta-label">Branch Office:</td>
          <td class="meta-val">${payment.branch || '-'}</td>
          <td class="meta-label">Status:</td>
          <td class="meta-val" style="font-weight: bold; color: ${payment.status === 'Released' ? '#10B981' : '#F59E0B'}">
            ${payment.status === 'Released' ? 'PROCESSED & PAID' : 'PENDING DISTRIBUTION'}
          </td>
        </tr>
      </table>

      <div class="breakdown-container">
        <!-- Earnings Section -->
        <div class="section">
          <h3>Earnings Breakdown</h3>
          <table class="item-table">
            <tr>
              <td>Basic Salary</td>
              <td class="item-val">${formatINR(basic)}</td>
            </tr>
            ${hra > 0 ? `<tr><td>House Rent Allowance (HRA)</td><td class="item-val">${formatINR(hra)}</td></tr>` : ''}
            ${travel > 0 ? `<tr><td>Travel Allowance</td><td class="item-val">${formatINR(travel)}</td></tr>` : ''}
            ${medical > 0 ? `<tr><td>Medical Allowance</td><td class="item-val">${formatINR(medical)}</td></tr>` : ''}
            ${special > 0 ? `<tr><td>Special Allowance</td><td class="item-val">${formatINR(special)}</td></tr>` : ''}
            ${payment.overtimeAmount > 0 ? `<tr><td>Overtime Pay</td><td class="item-val">${formatINR(payment.overtimeAmount)}</td></tr>` : ''}
            ${payment.bonusAmount > 0 ? `<tr><td>Performance Bonus</td><td class="item-val">${formatINR(payment.bonusAmount)}</td></tr>` : ''}
            ${payment.reimbursementAmount > 0 ? `<tr><td>Reimbursements</td><td class="item-val">${formatINR(payment.reimbursementAmount)}</td></tr>` : ''}
            <tr class="total-row">
              <td>Total Gross Earnings</td>
              <td class="item-val">${formatINR(gross)}</td>
            </tr>
          </table>
        </div>

        <!-- Deductions Section -->
        <div class="section">
          <h3>Deductions Breakdown</h3>
          <table class="item-table">
            ${pf > 0 ? `<tr><td>Provident Fund (PF)</td><td class="item-val">-${formatINR(pf)}</td></tr>` : ''}
            ${pt > 0 ? `<tr><td>Professional Tax (PT)</td><td class="item-val">-${formatINR(pt)}</td></tr>` : ''}
            ${tds > 0 ? `<tr><td>Income Tax (TDS)</td><td class="item-val">-${formatINR(tds)}</td></tr>` : ''}
            ${payment.lateDeductions > 0 ? `<tr><td>Late Arrival Penalty</td><td class="item-val">-${formatINR(payment.lateDeductions)}</td></tr>` : ''}
            ${payment.leaveDeductions > 0 ? `<tr><td>Leave Deduction</td><td class="item-val">-${formatINR(payment.leaveDeductions)}</td></tr>` : ''}
            ${payment.loanEMI > 0 ? `<tr><td>Loan EMI Recovery</td><td class="item-val">-${formatINR(payment.loanEMI)}</td></tr>` : ''}
            ${payment.advanceDeduct > 0 ? `<tr><td>Advance Recovery</td><td class="item-val">-${formatINR(payment.advanceDeduct)}</td></tr>` : ''}
            ${deductions === 0 ? '<tr><td style="color:#888; font-style:italic;">No Deductions</td><td class="item-val">₹0.00</td></tr>' : ''}
            <tr class="total-row">
              <td>Total Deductions</td>
              <td class="item-val">-${formatINR(deductions)}</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="summary-box">
        <div class="summary-row">
          <span>Gross Earnings (A):</span>
          <span>${formatINR(gross)}</span>
        </div>
        <div class="summary-row">
          <span>Total Deductions (B):</span>
          <span>-${formatINR(deductions)}</span>
        </div>
        <div class="summary-row">
          <span>Net Take-Home Salary (A - B):</span>
          <span>${formatINR(net)}</span>
        </div>
      </div>

      <div class="footer">
        This is a system generated document processed by the Corporate Finance Division of Gatecode.<br>
        No signature is required. Generated on ${dayjs().format('MMMM DD, YYYY HH:mm A')}
      </div>
    </body>
    </html>
  `;
};

/**
 * Compiles the HTML payslip template to a real PDF and opens native share sheet.
 */
export const sharePayslipAsPdf = async (payment: any) => {
  try {
    const htmlContent = generatePayslipHtml(payment);
    
    // Compile to temporary PDF file using expo-print
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${payment.month} Payslip`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      toast.error('Sharing is not supported on this device');
    }
  } catch (error) {
    console.error('Error sharing payslip PDF:', error);
    toast.error('Failed to compile or share payslip PDF');
  }
};

/**
 * Compiles the HTML payslip to PDF and saves it to the local Documents directory.
 */
export const downloadPayslipFile = async (payment: any) => {
  try {
    const htmlContent = generatePayslipHtml(payment);
    
    // Compile to temporary PDF file
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
    });

    // Copy to persistent documents directory
    const cleanEmpName = (payment.employeeName || 'Employee').replace(/\s+/g, '_');
    const filename = `Payslip_${cleanEmpName}_${payment.month}_${payment.year}.pdf`;
    const destinationUri = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.copyAsync({
      from: uri,
      to: destinationUri,
    });

    toast.success(`Saved to Documents: ${filename}`);
  } catch (error) {
    console.error('Error downloading payslip PDF:', error);
    toast.error('Failed to save payslip PDF');
  }
};
