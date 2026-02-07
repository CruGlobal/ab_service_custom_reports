/**
 * well-receipt
 * our Request handler.
 */
const path = require("path");
const ejs = require("ejs");
const ABBootstrap = require("../AppBuilder/ABBootstrap");
// {ABBootstrap}
// responsible for initializing and returning an {ABFactory} that will work
// with the current tenant for the incoming request.

module.exports = {
   /**
    * Key: the cote message key we respond to.
    */
   key: "custom_reports.well-receipt",

   /**
    * inputValidation
    * define the expected inputs to this service handler:
    * Format:
    * "parameterName" : {
    *    {joi.fn}   : {bool},  // performs: joi.{fn}();
    *    {joi.fn}   : {
    *       {joi.fn1} : true,   // performs: joi.{fn}().{fn1}();
    *       {joi.fn2} : { options } // performs: joi.{fn}().{fn2}({options})
    *    }
    *    // examples:
    *    "required" : {bool},
    *    "optional" : {bool},
    *
    *    // custom:
    *        "validation" : {fn} a function(value, {allValues hash}) that
    *                       returns { error:{null || {new Error("Error Message")} }, value: {normalize(value)}}
    * }
    */
   inputValidation: {
      transactionId: { string: true, required: true },
      // uuid: { string: { uuid: true }, required: true },
      // email: { string: { email: true }, optional: true },
   },

   /**
    * fn
    * our Request handler.
    * @param {obj} req
    *        the request object sent by the
    *        api_sails/api/controllers/custom_reports/well-receipt.
    * @param {fn} cb
    *        a node style callback(err, results) to send data when job is finished
    */
   fn: function handler(req, cb) {
      req.log("custom_reports.well-receipt:");

      // get the AB for the current tenant
      ABBootstrap.init(req)
         .then(async (AB) => {
            // Object Definition Ids
            const ids = {
               billingAccount: "7ecd7257-1023-4917-bc3f-88061293cf30",
               entity: "21c32a39-335f-473e-8ce9-395d265b7a6a",
               transaction: "4a43ff1d-bbee-4d14-a4b4-a82c57c55b78",
               siteFile: "4a9d89c9-f4eb-41af-91e4-909eff389f3e",
            };
            const transactionId = req.param("transactionId");
            // Load Models
            const transactionsModel = AB.objectByID(ids.transaction).model();
            const enitityModel = AB.objectByID(ids.entity).model();
            const accountModel = AB.objectByID(ids.billingAccount).model();
            const fileModel = AB.objectByID(ids.siteFile).model();
            // Load Data
            const [[transaction], [entity]] = await Promise.all([
               transactionsModel.find({ uuid: transactionId }),
               enitityModel.findAll(),
            ]);
            const [[account], [logo]] = await Promise.all([
               accountModel.find({
                  uuid: transaction.Transactions,
               }),
               fileModel.find({ uuid: entity.Logo }),
            ]);
            console.log("file", logo);
            // Data for template
            const data = {
               number: transaction["Transaction ID"],
               name: account.Name,
               date: transaction.Date,
               method: transaction.Method,
               amount: transaction.Amount,
               description: transaction.Description,
               entity,
               logo: logo.pathFile,
            };

            const templatePath = path.resolve(
               __dirname,
               "..",
               "templates",
               "well-receipt.ejs",
            );

            ejs.renderFile(templatePath, data, {}, (err, str) => {
               if (err) {
                  cb(err);
               } else {
                  cb(null, str);
               }
            });
         })
         .catch((err) => {
            req.notify.developer(err, {
               context:
                  "Service:custom_reports.well-receipt: Error initializing ABFactory",
            });
            cb(err);
         });
   },
};
