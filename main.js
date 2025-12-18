import { UIManager } from './ui.js';
import { Calculator } from './calculator.js';
import { ChartManager } from './chartManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI (binds simple events like Add Bulk)
    UIManager.init();

    // Initialize Chart
    const ctx = document.getElementById('loanChart').getContext('2d');
    ChartManager.init(ctx);

    // Handle Calculation
    UIManager.elements.form.addEventListener('submit', (e) => {
        e.preventDefault();

        const inputs = UIManager.getInputs();
        if (!inputs) return;

        const { amount, rate, years, startDate, currency, bulkPayments } = inputs;

        // Generate Schedule
        const schedule = Calculator.generateSchedule(amount, rate, years, startDate, bulkPayments);

        // Render Results
        UIManager.renderTable(schedule, currency);
        UIManager.renderSummary(schedule, currency);
        ChartManager.update(schedule);

        // Scroll to results on mobile/if needed
        if (window.innerWidth < 900) {
            UIManager.elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // Optional: Trigger initial calculation with default placeholder values?
    // Or just let user type.
});
