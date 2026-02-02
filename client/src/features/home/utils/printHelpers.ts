
import { Cabinet, CuttingListSummary } from '@shared/schema';
import { generatePanels } from '@/lib/panels/generatePanels';

export const printCuttingList = (
    cabinets: Cabinet[],
    summary: CuttingListSummary,
    toast: any // Pass toast function to handle UI feedback
) => {
    // Create a print-friendly A4 format view
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        toast({
            title: "Print Blocked",
            description: "Please allow popups to use print functionality.",
            variant: "destructive"
        });
        return;
    }

    const projectName = "Maya Interiors Kitchen Project";
    const allPanels = cabinets.flatMap(generatePanels);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${projectName} - Cutting List</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; color-adjust: exact; }
              .page-break { page-break-before: always; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 0;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #333;
            }
            .project-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .info-section {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
            }
            .info-section h3 {
              margin: 0 0 10px 0;
              color: #495057;
              border-bottom: 1px solid #dee2e6;
              padding-bottom: 5px;
            }
            .cabinet-list {
              margin-bottom: 30px;
            }
            .cabinet-item {
              background: #fff;
              border: 1px solid #dee2e6;
              border-radius: 5px;
              padding: 15px;
              margin-bottom: 15px;
            }
            .cabinet-header {
              font-weight: bold;
              font-size: 14px;
              color: #495057;
              margin-bottom: 10px;
              border-bottom: 1px solid #e9ecef;
              padding-bottom: 5px;
            }
            .panel-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 10px;
            }
            .panel-item {
              background: #f8f9fa;
              padding: 8px;
              border-radius: 3px;
              border-left: 4px solid #007bff;
            }
            .panel-name {
              font-weight: bold;
              font-size: 11px;
              color: #495057;
            }
            .panel-dims {
              font-size: 10px;
              color: #6c757d;
            }
            .laminate-badge {
              display: inline-block;
              background: #e9ecef;
              padding: 2px 6px;
              border-radius: 10px;
              font-size: 9px;
              color: #495057;
              margin-top: 4px;
            }
            .summary-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .summary-table th,
            .summary-table td {
              border: 1px solid #dee2e6;
              padding: 8px;
              text-align: left;
            }
            .summary-table th {
              background: #f8f9fa;
              font-weight: bold;
            }
            .totals {
              background: #e3f2fd;
              padding: 15px;
              border-radius: 5px;
              margin-top: 20px;
            }
            .totals h4 {
              margin: 0 0 10px 0;
              color: #1565c0;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${projectName} - Cutting List</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          <div class="project-info">
            <div class="info-section">
              <h3>Project Details</h3>
              <p><strong>Total Cabinets:</strong> ${cabinets.length}</p>
              <p><strong>Total Panels:</strong> ${summary.totalPanels}</p>
              <p><strong>Total Area:</strong> ${summary.totalArea.toFixed(2)} m²</p>
            </div>
            <div class="info-section">
              <h3>Material Summary</h3>
              ${summary.panelGroups.map((group: any) => `
                <p><strong>${group.laminate} Laminate:</strong> ${group.panels.length} panels (${group.totalArea.toFixed(2)} m²)</p>
              `).join('')}
            </div>
          </div>

          <div class="cabinet-list">
            <h3>Cabinet Details</h3>
            ${cabinets.map(cabinet => {
        const panels = generatePanels(cabinet);
        return `
                <div class="cabinet-item">
                  <div class="cabinet-header">
                    ${cabinet.name} - ${cabinet.width}mm × ${cabinet.height}mm × ${cabinet.depth}mm
                  </div>
                  <div class="panel-grid">
                    ${panels.map(panel => `
                      <div class="panel-item">
                        <div class="panel-name">${panel.name}</div>
                        <div class="panel-dims">${panel.width}mm × ${panel.height}mm</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
    }).join('')}
          </div>

          <div class="page-break"></div>

          <h3>Complete Panel List</h3>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Panel Name</th>
                <th>Width (mm)</th>
                <th>Height (mm)</th>
                <th>Area (m²)</th>
                <th>Laminate Code</th>
              </tr>
            </thead>
            <tbody>
              ${allPanels.map(panel => `
                <tr>
                  <td>${panel.name}</td>
                  <td>${panel.width}</td>
                  <td>${panel.height}</td>
                  <td>${(panel.width * panel.height / 1000000).toFixed(3)}</td>
                  <td>${panel.laminateCode || 'None'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <h4>Project Totals</h4>
            <div class="total-row">
              <span>Total Panels:</span>
              <span>${summary.totalPanels}</span>
            </div>
            <div class="total-row">
              <span>Total Area:</span>
              <span>${summary.totalArea.toFixed(2)} m²</span>
            </div>
            ${summary.panelGroups.map((group: any) => `
              <div class="total-row">
                <span>${group.laminate} Laminate Area:</span>
                <span>${group.totalArea.toFixed(2)} m²</span>
              </div>
            `).join('')}
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    toast({
        title: "Print Preview Ready",
        description: "A4 format print preview has been opened."
    });
};
