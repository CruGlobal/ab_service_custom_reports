/**
 * report
 * generic report handler
 */

const ABBootstrap = require("../AppBuilder/ABBootstrap");
// {ABBootstrap}
// responsible for initializing and returning an {ABFactory} that will work
// with the current tenant for the incoming request.
const ejs = require("ejs");

const reports = {
   // reportKey: require(/pathToReport)  -> Should export:
   //                prepareData(AB, req.param("data")) => obj - data for the ejs tempalte
   //                template() => string - ejs template string
   "hello-world": require("../reports/hello-world.js"),
   "well-invoice": require("../reports/well-invoice.js"),
   "well-receipt": require("../reports/well-receipt.js"),
   "well-session": require("../reports/well-session.js"),
   "local-income-expense": require("../reports/local-income-expense.js"),
   "income-vs-expense": require("../reports/income-vs-expense.js"),
   "balance-sheet": require("../reports/balance-sheet.js"),
   "balance-report": require("../reports/balance-report.js"),
   "team-monthly": require("../reports/team-monthly.js"),
   "budget-vs-expense": require("../reports/budget-vs-expense.js"),
   "extend-report-month": require("../reports/extend-report-month.js"),
};
// "balanceReport",
// "balanceSheet",
// "incomeVsExpense",
// "localIncomeExpense",

module.exports = {
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
