import Chart from 'chart.js/auto';

export const ChartManager = {
    chart: null,

    init(ctx) {
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8', maxTicksLimit: 12 }
                    },
                    y: {
                        stacked: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#f8fafc' }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                }
            }
        });
    },

    update(schedule) {
        if (!this.chart) return;

        // To prevent performance issues with 20-30 years (360+ points), 
        // let's aggregate by year if months > 48

        let labels, principalData, interestData;

        if (schedule.length > 60) {
            // Aggregate by Year
            const years = {};
            schedule.forEach(row => {
                const year = row.date.split(' ')[1] || row.date.split('-')[0] || row.formattedDate.substring(0, 4);
                if (!years[year]) years[year] = { principal: 0, interest: 0 };
                years[year].principal += row.principalComponent + row.bulkPayment;
                years[year].interest += row.interestComponent;
            });

            labels = Object.keys(years);
            principalData = Object.values(years).map(y => y.principal);
            interestData = Object.values(years).map(y => y.interest);
        } else {
            labels = schedule.map(r => r.date);
            principalData = schedule.map(r => r.principalComponent + r.bulkPayment);
            interestData = schedule.map(r => r.interestComponent);
        }

        this.chart.data = {
            labels: labels,
            datasets: [
                {
                    label: 'Principal Paid',
                    data: principalData,
                    backgroundColor: '#6366f1',
                    borderRadius: 2
                },
                {
                    label: 'Interest Paid',
                    data: interestData,
                    backgroundColor: '#ec4899',
                    borderRadius: 2
                }
            ]
        };

        this.chart.update();
    }
};
