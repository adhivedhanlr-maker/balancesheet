import React, { useState, useMemo } from 'react';
import {
  FileText,
  Upload,
  Download,
  AlertCircle,
  Percent,
  DollarSign,
  MapPin,
  TrendingDown,
  Info,
  ChevronRight,
  PieChart as PieIcon,
  Activity
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';
import { parsePDF } from './utils/PDFParser';
import { generateBalanceSheetPDF, generateBalanceSheetExcel } from './utils/BalanceSheetGenerator';

function App() {
  const [formData, setFormData] = useState({
    address: '',
    loanAmount: '',
    expensesPercent: '5',
  });

  const [extractedData, setExtractedData] = useState({
    bankInterestRate: null,
    bankCharges: null,
  });

  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  // Calculations
  const loanAmount = parseFloat(formData.loanAmount) || 0;
  const expensesPercent = parseFloat(formData.expensesPercent) || 0;
  const interestRate = extractedData.bankInterestRate ? parseFloat(extractedData.bankInterestRate) : 0;

  const calculatedExpenses = loanAmount * (expensesPercent / 100);
  const estimatedInterest = loanAmount * (interestRate / 100);
  const bankCharges = extractedData.bankCharges ? parseFloat(extractedData.bankCharges) : 0;
  const totalLiabilities = loanAmount + estimatedInterest + bankCharges + calculatedExpenses;

  // Chart Data
  const chartData = useMemo(() => [
    { name: 'Loan Principal', value: loanAmount, color: '#3b82f6' },
    { name: 'Interest', value: estimatedInterest, color: '#38bdf8' },
    { name: 'Charges', value: bankCharges, color: '#f43f5e' },
    { name: 'Expenses', value: calculatedExpenses, color: '#10b981' },
  ].filter(item => item.value > 0), [loanAmount, estimatedInterest, bankCharges, calculatedExpenses]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setError('');

    try {
      const result = await parsePDF(file);
      setExtractedData({
        bankInterestRate: result.interestRate,
        bankCharges: result.bankCharges
      });

      // Auto-populate loan amount if found in the professional statement
      if (result.loanAmount) {
        setFormData(prev => ({ ...prev, loanAmount: Math.round(parseFloat(result.loanAmount)).toString() }));
      }
    } catch (err) {
      setError('Failed to extract data. Professional statements are complex, please verify manually.');
    } finally {
      setIsParsing(false);
    }
  };

  const exportActions = {
    pdf: () => generateBalanceSheetPDF({ ...formData, ...extractedData, calculatedExpenses, estimatedInterest, totalLiabilities }),
    excel: () => generateBalanceSheetExcel({ ...formData, ...extractedData, calculatedExpenses, estimatedInterest, totalLiabilities })
  };

  return (
    <div className="app-container animate-fade-in">
      {/* Sidebar: Inputs */}
      <aside className="sidebar">
        <div>
          <h1 className="title-gradient" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
            Balance Sheet Pro
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.813rem' }}>
            Modern Loan Renewal Automation
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="input-group">
            <label>
              <MapPin size={14} /> Business Address
              <span className="tooltip"><Info size={12} /><span className="tooltip-text">Full legal address of the entity</span></span>
            </label>
            <input
              name="address"
              placeholder="e.g. 101 Financial District, NY"
              value={formData.address}
              onChange={handleInputChange}
            />
          </div>

          <div className="input-group">
            <label>
              <DollarSign size={14} /> Loan Amount
              <span className="tooltip"><Info size={12} /><span className="tooltip-text">Total principal amount for renewal</span></span>
            </label>
            <input
              name="loanAmount"
              type="number"
              placeholder="100000"
              value={formData.loanAmount}
              onChange={handleInputChange}
            />
          </div>

          <div className="input-group">
            <label>
              <Percent size={14} /> Expenses %
              <span className="tooltip"><Info size={12} /><span className="tooltip-text">Annual operating expenses as % of loan</span></span>
            </label>
            <input
              name="expensesPercent"
              type="number"
              placeholder="5"
              value={formData.expensesPercent}
              onChange={handleInputChange}
            />
          </div>

          <div className="input-group">
            <label>Bank Statement (PDF)</label>
            <div className="upload-area" style={{ position: 'relative' }}>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
              />
              <div style={{ pointerEvents: 'none' }}>
                {isParsing ? (
                  <div className="animate-pulse-soft">Extracing Data...</div>
                ) : fileName ? (
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{fileName}</span>
                ) : (
                  <>
                    <Upload size={24} style={{ marginBottom: '0.5rem', opacity: 0.7 }} />
                    <p style={{ fontSize: '0.813rem' }}>Click to upload statement</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ color: 'var(--error)', fontSize: '0.75rem', background: 'rgba(244, 63, 94, 0.1)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <AlertCircle size={14} inline /> {error}
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Need help? <a href="#" style={{ color: 'var(--accent)' }}>View Documentation</a>
          </p>
        </div>
      </aside>

      {/* Main Content: Charts & Preview */}
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Overview</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Live financial snapshot based on inputs</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={exportActions.pdf}>
              <Download size={18} /> Export PDF
            </button>
            <button className="btn btn-success" onClick={exportActions.excel}>
              <TrendingDown size={18} /> Export Excel
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-card stat-card">
            <span className="stat-label">Total Loan</span>
            <span className="stat-value">₹{loanAmount.toLocaleString()}</span>
          </div>
          <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <span className="stat-label">Interest ({interestRate}%)</span>
            <span className="stat-value">₹{estimatedInterest.toLocaleString()}</span>
          </div>
          <div className="glass-card stat-card">
            <span className="stat-label">Expenses</span>
            <span className="stat-value">₹{calculatedExpenses.toLocaleString()}</span>
          </div>
          <div className="glass-card stat-card" style={{ background: 'var(--accent-soft)' }}>
            <span className="stat-label">Total Liability</span>
            <span className="stat-value" style={{ color: 'var(--accent)' }}>₹{totalLiabilities.toLocaleString()}</span>
          </div>
        </div>

        {/* Middle Section: Visualization */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Activity size={20} color="var(--primary)" /> Liability Breakdown
            </h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <RechartsTooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <PieIcon size={20} color="var(--accent)" /> Ratio
            </h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Section: Table Preview */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Statement Preview</h3>
            <span style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>Updated: Just now</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '1rem 0', color: 'var(--text-secondary)', fontWeight: 500 }}>Description</th>
                <th style={{ padding: '1rem 0', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '1rem 0' }}>Principal Loan Amount</td>
                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600 }}>₹{loanAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ padding: '1rem 0' }}>Estimated Bank Interest</td>
                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600 }}>₹{estimatedInterest.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ padding: '1rem 0' }}>Extracted Bank Charges</td>
                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600 }}>₹{bankCharges.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ padding: '1rem 0' }}>Calculated Expenses ({expensesPercent}%)</td>
                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600 }}>₹{calculatedExpenses.toLocaleString()}</td>
              </tr>
              <tr style={{ borderTop: '2px solid var(--border)' }}>
                <td style={{ padding: '1.5rem 0', fontWeight: 700, fontSize: '1.1rem' }}>Total Liabilities</td>
                <td style={{ padding: '1.5rem 0', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>
                  ₹{totalLiabilities.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default App;
