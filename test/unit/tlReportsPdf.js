/**
 * tlReportsPdf
 * The PDF builders used for the Team Leader report email.
 */
import { expect } from "chai";
import fs from "fs";
import path from "path";
import {
   buildRcBalancePdf,
   buildBudgetVsExpensePdf,
} from "../../reports/pdf/tlReportsPdf.js";

function isPdf(buffer) {
   return (
      Buffer.isBuffer(buffer) && buffer.subarray(0, 5).toString() == "%PDF-"
   );
}

// Set TL_PDF_OUT=<folder> to keep the files and look at them.
function keep(name, buffer) {
   const dir = process.env.TL_PDF_OUT;
   if (!dir) return;
   fs.writeFileSync(path.join(dir, name), buffer);
}

describe("custom_reports: tlReportsPdf", function () {
   this.timeout(20000);

   it("builds the RC Balances PDF, Chinese names included", async function () {
      const buffer = await buildRcBalancePdf({
         fyPeriod: "FY25 M06",
         tlName: "王小明 (Test TL)",
         items: [
            { title: "TEST RC", value: 12499.5 },
            { title: "北京团队 RC", value: -2500.5 },
         ],
         generatedAt: "2026-11-18",
      });
      expect(isPdf(buffer)).to.equal(true);
      keep("RC-Balance-FY25-M06.pdf", buffer);
   });

   it("builds the RC Balances PDF with no rows", async function () {
      const buffer = await buildRcBalancePdf({
         fyPeriod: "FY25 M06",
         tlName: "Test TL",
         items: [],
      });
      expect(isPdf(buffer)).to.equal(true);
   });

   it("builds the Budget vs. Actual PDF", async function () {
      const buffer = await buildBudgetVsExpensePdf({
         fyYear: "FY25",
         tlName: "王小明 (Test TL)",
         rcInfos: {
            "TEST RC": {
               total_budget_amount: 10000,
               total_actual_expense: 7500.25,
               "P-001": {
                  project_name: "Summer camp 夏令营",
                  budget_amount: 6000,
                  actual_expense: 5000.25,
               },
               "P-002": {
                  project_name: "Training",
                  budget_amount: 4000,
                  actual_expense: 2500,
               },
            },
         },
         generatedAt: "2026-11-18",
      });
      expect(isPdf(buffer)).to.equal(true);
      keep("Budget-vs-Expense-FY25.pdf", buffer);
   });
});
