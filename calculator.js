export const Calculator = {
    /**
     * Calculates the Monthly Installment (EMI)
     * Formula: P * r * (1+r)^n / ((1+r)^n - 1)
     */
    calculateEMI(principal, monthlyRate, months) {
        if (months <= 0) return principal;
        if (monthlyRate === 0) return principal / months;

        const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, months);
        const denominator = Math.pow(1 + monthlyRate, months) - 1;
        return numerator / denominator;
    },

    /**
     * Generates the detailed amortization schedule
     * @param {number} principal - Loan Amount
     * @param {number} annualRate - Annual Interest Rate in %
     * @param {number} years - Loan Duration
     * @param {string} startDateStr - YYYY-MM-DD
     * @param {Array} bulkPaymentsInput - Array of { date: string, amount: number }
     */
    generateSchedule(principal, annualRate, years, startDateStr, bulkPaymentsInput) {
        const schedule = [];
        let balance = principal;
        let monthlyRate = annualRate / 12 / 100;
        let totalMonths = Math.round(years * 12);
        const startDate = new Date(startDateStr);

        // Deep copy and sort bulk payments to avoid side effects
        const bulkPayments = bulkPaymentsInput.map(p => ({ ...p, processed: false }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate initial EMI
        let currentEMI = this.calculateEMI(balance, monthlyRate, totalMonths);

        for (let month = 1; month <= totalMonths; month++) {
            if (balance <= 0.01) break; // Loan finished

            const currentDate = new Date(startDate);
            currentDate.setMonth(startDate.getMonth() + month);

            // 1. Identify Events (Bulk Payment / Rate Change) for this month
            // Defined as payments strictly after the previous month's date and on or before current month's date.
            const prevDate = new Date(startDate);
            prevDate.setMonth(startDate.getMonth() + month - 1);

            let monthlyBulkPaid = 0;
            let rateChanged = false;

            const eventsInWindow = bulkPayments.filter(p => {
                const pDate = new Date(p.date);
                return pDate > prevDate && pDate <= currentDate && !p.processed;
            });

            eventsInWindow.forEach(p => {
                // Apply Bulk Payment
                if (p.amount) {
                    monthlyBulkPaid += p.amount;
                }

                // Apply Rate Change
                if (p.newRate !== undefined && p.newRate !== null) {
                    monthlyRate = p.newRate / 12 / 100;
                    annualRate = p.newRate; // Update for display
                    rateChanged = true;
                }

                p.processed = true;
            });

            // 2. Apply Bulk Payment First
            if (monthlyBulkPaid > 0) {
                // Cap bulk payment to balance
                if (monthlyBulkPaid > balance) monthlyBulkPaid = balance;
                balance -= monthlyBulkPaid;
            }

            // 3. Calculate Interest & Principal Component (on reduced balance)
            const interestPayment = balance * monthlyRate;

            // Recalculate EMI if Rate Changed OR Bulk Payment occurred
            // But we must be careful:
            // - If Rate Changed, we need to recalculate EMI for *current* month? 
            //   Prompt says "intrest has been changed from particular month".
            //   If rate changes, the EMI for this month should probably reflect that if we view this as "start of month" change.
            //   However, if we strictly follow "Recalculate starting NEXT month" for bulk payments, we might have a conflict.
            //   Standard logic: If rate changes, future EMI changes.
            //   Let's Apply Logic:
            //   If Bulk Payment > 0, we recalculate for NEXT month.
            //   If Rate Change, we usually recalculate immediately for THIS month's payment? 
            //   Actually, usually EMI is fixed for the period. If rate changes during period, usually takes effect next cycle?
            //   Let's simplify: If rate changed, we recalculate for THIS month if rate changed, to be responsive.

            if (rateChanged && balance > 0.01) {
                const remainingMonths = totalMonths - month + 1; // Include this month
                currentEMI = this.calculateEMI(balance, monthlyRate, remainingMonths);
            }

            // Adjust EMI if it exceeds balance + interest (last payment)
            let actualEMI = currentEMI;
            // If balance is very low (e.g. cleared by bulk), interest is small.
            // If balance + interest < EMI, pay only what is needed.
            if (balance + interestPayment < currentEMI) {
                actualEMI = balance + interestPayment;
            }

            const principalPayment = actualEMI - interestPayment;

            // 4. Update Balance
            balance -= principalPayment;
            if (balance < 0) balance = 0; // Floating point safety

            // Store Row
            schedule.push({
                month: month,
                date: currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
                formattedDate: currentDate.toISOString().split('T')[0],
                emi: actualEMI,
                principalComponent: principalPayment,
                interestComponent: interestPayment,
                bulkPayment: monthlyBulkPaid,
                balance: balance,
                annualRate: annualRate // Store current rate
            });

            // 5. Recalculate EMI for NEXT month onwards if there was a bulk payment (and NO rate change just happened, or even if it did)
            // If rate changed, we already recalculated above. 
            // If ONLY bulk payment happened, we recalculate for next month.
            if (monthlyBulkPaid > 0 && !rateChanged && balance > 0.01) {
                const remainingMonths = totalMonths - month;
                if (remainingMonths > 0) {
                    currentEMI = this.calculateEMI(balance, monthlyRate, remainingMonths);
                }
            } else if (rateChanged && monthlyBulkPaid > 0 && balance > 0.01) {
                // If Both happened, we already calculated for THIS month with new rate + bulk reduced balance?
                // Wait, step 3 used 'balance' which was already reduced by bulk.
                // So 'currentEMI' calc inside 'if (rateChanged)' used reduced balance.
                // So we are good for this month.
                // DO we need to recalc for Next Month?
                // The 'currentEMI' is now set based on (ReducedBalance, NewRate, RemainingMonthsIncludingThis).
                // Next month will just use 'currentEMI'.
                // BUT 'remainingMonths' will decrease by 1. 'balance' will decrease by principal.
                // Constant EMI logic holds.
            }
        }

        return schedule;
    },

    formatCurrency(amount, currencyCode) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }
};
