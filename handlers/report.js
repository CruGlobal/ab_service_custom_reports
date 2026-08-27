/**
 * report
 * generic report handler
 */

import ABBootstrap from "../AppBuilder/ABBootstrap.js";
import ejs from "ejs";
import helloWorld from "../reports/hello-world.js";
import wellInvoiceReport from "../reports/well-invoice.js";
import wellReceipt from "../reports/well-receipt.js";
import wellSession from "../reports/well-session.js";
import localIncomeExpense from "../reports/local-income-expense.js";
import incomeVsExpense from "../reports/income-vs-expense.js";
import balanceSheet from "../reports/balance-sheet.js";
import balanceReport from "../reports/balance-report.js";
import teamMonthly from "../reports/team-monthly.js";
import budgetVsExpense from "../reports/budget-vs-expense.js";
import extendReportMonth from "../reports/extend-report-month.js";
import fcfDueDates from "../reports/fcf-due-dates.js";

const reports = {
   "hello-world": helloWorld,
   "well-invoice": wellInvoiceReport,
   "well-receipt": wellReceipt,
   "well-session": wellSession,
   "local-income-expense": localIncomeExpense,
   "income-vs-expense": incomeVsExpense,
   "balance-sheet": balanceSheet,
   "balance-report": balanceReport,
   "team-monthly": teamMonthly,
   "budget-vs-expense": budgetVsExpense,
   "extend-report-month": extendReportMonth,
   "fcf-due-dates": fcfDueDates,
};

export default {
   /**
    * Key: the cote message key we respond to.
    */
   key: "custom_reports.report",

   inputValidation: {
      reportKey: { string: true, required: true },
      data: { object: true, required: false },
   },

   /**
    * fn
    * our Request handler.
    * @param {obj} req
    *        the request object sent by api_sails
    * @param {fn} cb
    *        a node style callback(err, results) to send data when job is finished
    */

   fn: async function handler(req, cb) {
      req.log("custom_report.report:");
      try {
         // get the AB for the current tenant
         const AB = await ABBootstrap.init(req);
         const key = req.param("reportKey");
         let languageCode =
            req._user.languageCode || req.param("languageCode") || "en";

         // is this needed?
         if (languageCode == "zh-hans") {
            languageCode = "zh";
         }

         const report = reports[key];
         if (!report) cb(new Error("No report template found"));
         const data = await report.prepareData(AB, req.param("data"), req);

         data["languageCode"] = languageCode;

         const template = report.template();

         const html = ejs.render(template, data);

         cb(null, html);
      } catch (err) {
         cb(err);
      }
   },
};
