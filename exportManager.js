import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Calculator } from "./calculator.js";

export const ExportManager = {
    // --- Excel Export ---
    exportToExcel(schedule, inputs) {
        if (!schedule || schedule.length === 0) {
            alert("No data to export.");
            return;
        }

        // 1. Prepare Data for Excel
        const data = schedule.map(row => ({
            "Month": row.month,
            "Date": row.date,
            "EMI": row.emi,
            "Principal": row.principalComponent,
            "Interest": row.interestComponent,
            "Rate (%)": row.annualRate,
            "Bulk Payment": row.bulkPayment,
            "Balance": row.balance,
            "Total Payment": row.totalPayment
        }));

        // 2. Create Workbook and Worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        const summaryData = [
            { Item: "Loan Amount", Value: inputs.amount },
            { Item: "Interest Rate", Value: inputs.rate + "%" },
            { Item: "Duration", Value: inputs.years + " Years" },
            { Item: "Start Date", Value: inputs.startDate },
            { Item: "Currency", Value: inputs.currency }
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);

        XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
        XLSX.utils.book_append_sheet(wb, ws, "Amortization Schedule");

        // 3. Save File
        XLSX.writeFile(wb, "Loan_Amortization.xlsx");
    },

    // --- PDF Export ---
    exportToPDF(schedule, inputs, chartCanvas) {
        if (!schedule || schedule.length === 0) {
            alert("No data to export.");
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. Title and Header
        doc.setFontSize(22);
        doc.text("Loan Amortization Report", pageWidth / 2, 20, { align: "center" });

        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: "center" });

        // 2. Loan Summary
        doc.setFontSize(14);
        doc.text("Loan Details", 14, 45);

        doc.setFontSize(10);
        const startX = 14;
        let startY = 55;
        const lineHeight = 7;

        doc.text(`Loan Amount: ${Calculator.formatCurrency(inputs.amount, inputs.currency)}`, startX, startY);
        doc.text(`Interest Rate: ${inputs.rate}%`, startX, startY + lineHeight);
        doc.text(`Duration: ${inputs.years} Years`, startX, startY + lineHeight * 2);
        doc.text(`Start Date: ${inputs.startDate}`, startX + 80, startY);
        doc.text(`Currency: ${inputs.currency}`, startX + 80, startY + lineHeight);

        // 3. Chart Snapshot (if available)
        let tableStartY = startY + lineHeight * 4;

        if (chartCanvas) {
            try {
                // Resize image to fit nicely
                const imgData = chartCanvas.toDataURL("image/png");
                const imgWidth = 180;
                const imgHeight = (chartCanvas.height * imgWidth) / chartCanvas.width;

                doc.addImage(imgData, 'PNG', 15, tableStartY, imgWidth, imgHeight);
                tableStartY += imgHeight + 10;
            } catch (e) {
                console.error("Could not capture chart:", e);
                doc.text("(Chart could not be captured)", 14, tableStartY + 10);
                tableStartY += 20;
            }
        }

        // 4. Amortization Table
        const head = [['#', 'Date', 'EMI', 'Principal', 'Interest', 'Balance']];
        const body = schedule.map(row => [
            row.paymentNumber,
            row.date,
            Calculator.formatCurrency(row.emi, inputs.currency),
            Calculator.formatCurrency(row.principalComponent, inputs.currency),
            Calculator.formatCurrency(row.interestComponent, inputs.currency),
            Calculator.formatCurrency(row.balance, inputs.currency)
        ]);

        autoTable(doc, {
            head: head,
            body: body,
            startY: tableStartY, // Start after the chart
            theme: 'striped',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [99, 102, 241] }
        });

        // 5. Save
        doc.save("Loan_Amortization_Report.pdf");
    }
};
