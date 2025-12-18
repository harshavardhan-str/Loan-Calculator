import { Calculator } from './calculator.js';
import { ExportManager } from './exportManager.js';

export const UIManager = {
    elements: {
        form: document.getElementById('loan-form'),
        addPaymentBtn: null, // assigned in init
        addRateBtn: null, // assigned in init
        paymentList: null, // assigned in init
        rateList: null, // assigned in init

        // Export Buttons
        btnExportPDF: null,
        btnExportExcel: null,

        tableBody: document.querySelector('#amortization-table tbody'),
        resultsSection: document.querySelector('.results-container'),
        valEMI: document.getElementById('val-emi'),
        valTotalInterest: document.getElementById('val-total-interest'),
        valTotalPayment: document.getElementById('val-total-payment'),
        valClosureDate: document.getElementById('val-closure-date'),
        currencySelect: document.getElementById('currency'),

        // Chart Canvas for Export
        chartCanvas: document.getElementById('loanChart')
    },

    // State to hold data for export
    currentSchedule: null,
    currentInputs: null,

    init() {
        this.elements.addPaymentBtn = document.getElementById('add-payment-btn');
        this.elements.addRateBtn = document.getElementById('add-rate-btn');
        this.elements.paymentList = document.getElementById('payment-list');
        this.elements.rateList = document.getElementById('rate-list');

        this.elements.btnExportPDF = document.getElementById('btn-export-pdf');
        this.elements.btnExportExcel = document.getElementById('btn-export-excel');

        this.elements.addPaymentBtn.addEventListener('click', () => this.addPaymentRow());
        this.elements.addRateBtn.addEventListener('click', () => this.addRateRow());

        // Export Listeners
        this.elements.btnExportPDF.addEventListener('click', () => {
            if (this.currentSchedule) {
                const inputs = this.getInputs();
                if (inputs) {
                    ExportManager.exportToPDF(this.currentSchedule, inputs, this.elements.chartCanvas);
                }
            } else {
                alert("Please calculate the loan first.");
            }
        });

        this.elements.btnExportExcel.addEventListener('click', () => {
            if (this.currentSchedule) {
                const inputs = this.getInputs();
                if (inputs) {
                    ExportManager.exportToExcel(this.currentSchedule, inputs);
                }
            } else {
                alert("Please calculate the loan first.");
            }
        });
    },

    addPaymentRow() {
        const row = document.createElement('div');
        row.className = 'bulk-row payment-row';
        row.innerHTML = `
      <input type="date" class="bulk-date" required>
      <input type="number" class="bulk-amount" placeholder="Principal Payment" min="0">
      <button type="button" class="btn-icon delete"><i class="ph ph-trash"></i></button>
    `;

        row.querySelector('.delete').addEventListener('click', () => row.remove());
        this.elements.paymentList.appendChild(row);
    },

    addRateRow() {
        const row = document.createElement('div');
        row.className = 'bulk-row rate-row';
        row.innerHTML = `
      <input type="date" class="bulk-date" required>
      <input type="number" class="bulk-rate" placeholder="New Rate (%)" step="0.01" min="0">
      <button type="button" class="btn-icon delete"><i class="ph ph-trash"></i></button>
    `;

        row.querySelector('.delete').addEventListener('click', () => row.remove());
        this.elements.rateList.appendChild(row);
    },

    getInputs() {
        const amount = parseFloat(document.getElementById('loan-amount').value);
        const rate = parseFloat(document.getElementById('interest-rate').value);
        const years = parseFloat(document.getElementById('loan-duration').value);
        const startDate = document.getElementById('start-date').value;
        const currency = document.getElementById('currency').value;

        if (!amount || !rate || !years || !startDate) {
            alert('Please fill in all required fields.');
            return null;
        }

        if (amount <= 0 || rate < 0 || years <= 0) {
            alert('Values must be positive.');
            return null;
        }

        const bulkPayments = [];

        // 1. Principal Payments
        const paymentRows = document.querySelectorAll('.payment-row');
        paymentRows.forEach(row => {
            const date = row.querySelector('.bulk-date').value;
            const val = parseFloat(row.querySelector('.bulk-amount').value);
            if (date && val && val > 0) {
                bulkPayments.push({ date, amount: val });
            }
        });

        // 2. Rate Changes
        const rateRows = document.querySelectorAll('.rate-row');
        rateRows.forEach(row => {
            const date = row.querySelector('.bulk-date').value;
            const newRate = parseFloat(row.querySelector('.bulk-rate').value);
            if (date && !isNaN(newRate) && newRate >= 0) {
                bulkPayments.push({ date, newRate: newRate });
            }
        });

        return { amount, rate, years, startDate, currency, bulkPayments };
    },

    renderTable(schedule, currency) {
        // Capture for export
        this.currentSchedule = schedule;

        this.elements.tableBody.innerHTML = '';
        schedule.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${row.month}</td>
        <td>${row.date}</td>
        <td class="text-right">${Calculator.formatCurrency(row.emi, currency)}</td>
        <td class="text-right">${Calculator.formatCurrency(row.principalComponent, currency)}</td>
        <td class="text-right">${row.annualRate.toFixed(2)}%</td>
        <td class="text-right">${Calculator.formatCurrency(row.interestComponent, currency)}</td>
        <td class="text-right">${row.bulkPayment > 0 ? Calculator.formatCurrency(row.bulkPayment, currency) : '-'}</td>
        <td class="text-right">${Calculator.formatCurrency(row.balance, currency)}</td>
      `;
            this.elements.tableBody.appendChild(tr);
        });
        this.elements.resultsSection.classList.remove('d-none');
    },

    renderSummary(schedule, currency) {
        if (schedule.length === 0) return;

        const totalInterest = schedule.reduce((sum, row) => sum + row.interestComponent, 0);
        const totalPrincipal = schedule.reduce((sum, row) => sum + row.principalComponent + row.bulkPayment, 0);
        const firstEMI = schedule[0].emi;
        const closureDate = schedule[schedule.length - 1].date;

        this.elements.valEMI.textContent = Calculator.formatCurrency(firstEMI, currency);
        this.elements.valTotalInterest.textContent = Calculator.formatCurrency(totalInterest, currency);
        this.elements.valTotalPayment.textContent = Calculator.formatCurrency(totalPrincipal + totalInterest, currency);
        this.elements.valClosureDate.textContent = closureDate;
    }
};
