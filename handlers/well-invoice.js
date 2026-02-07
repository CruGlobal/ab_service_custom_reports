/**
 * cr-well-invoice
 * our Request handler.
 */

const ABBootstrap = require("../AppBuilder/ABBootstrap");
// {ABBootstrap}
// responsible for initializing and returning an {ABFactory} that will work
// with the current tenant for the incoming request.
const ejs = require("ejs");
const path = require("path");

module.exports = {
   /**
    * Key: the cote message key we respond to.
    */
   key: "custom_reports.well-invoice",

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
      payeeId: { string: true, required: true },
   },

   /**
    * fn
    * our Request handler.
    * @param {obj} req
    *        the request object sent by the
    *        api_sails/api/controllers/appbuilder/cr-well-invoice.
    * @param {fn} cb
    *        a node style callback(err, results) to send data when job is finished
    */

   fn: async function handler(req, cb) {
      req.log("custom_report.well-invoice:");

      // get the AB for the current tenant
      ABBootstrap.init(req)
         .then(async (AB) => {
            // Object Definition Ids
            const ids = {
               billingAccount: "7ecd7257-1023-4917-bc3f-88061293cf30",
               entity: "21c32a39-335f-473e-8ce9-395d265b7a6a",
               transaction: "4a43ff1d-bbee-4d14-a4b4-a82c57c55b78",
               datefield: "bca053b6-bdae-4e00-ad4d-89f51397056e",
               siteFile: "4a9d89c9-f4eb-41af-91e4-909eff389f3e",
               session: "d6b8ae02-92bc-474c-8309-8503ec025cbf",
            };
            const payeeId = req.param("payeeId");
            // Load Models
            const transactionsModel = AB.objectByID(ids.transaction).model();
            const accountModel = AB.objectByID(ids.billingAccount).model();
            const enitityModel = AB.objectByID(ids.entity).model();
            const fileModel = AB.objectByID(ids.siteFile).model();
            const sessionModel = AB.objectByID(ids.session).model();

            // Load Data
            const [transactions, [payee], [entity]] = await Promise.all([
               transactionsModel.find({
                  where: { Transactions: payeeId },
                  sort: [{ key: ids.datefield, dir: "ASC" }],
               }),
               accountModel.find({ uuid: payeeId }),
               enitityModel.findAll(),
            ]);

            // Get session -> Clients Present -> First Name
            await Promise.all(
               transactions.map(async (transaction) => {
                  transaction.clients = [];
                  const session = await sessionModel.find({
                     where: {
                        uuid: transaction.Session,
                     },
                     populate: true,
                  });
                  session[0]?.ClientsPresent__relation?.forEach?.((client) => {
                     transaction.clients.push(client["First Name"]);
                  });
               }),
            );

            const [logo] = await fileModel.find({ uuid: entity.Logo });
            // Data for template
            const data = {
               payee: payee.Name,
               type: payee.Type,
               date: new Date().toDateString(),
               transactions,
               entity,
               logo: logo.pathFile,
            };

            const templatePath = path.resolve(
               __dirname,
               "..",
               "templates",
               "well-invoice.ejs",
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
                  "Service:custom_report.well-invoice: Error initializing ABFactory",
            });
            cb(err);
         });
   },
};
