const path = require("path");
const fs = require("fs");
module.exports = {
   prepareData: async (AB, { transactionId }) => {
      const ids = {
         billingAccount: "7ecd7257-1023-4917-bc3f-88061293cf30",
         entity: "21c32a39-335f-473e-8ce9-395d265b7a6a",
         transaction: "4a43ff1d-bbee-4d14-a4b4-a82c57c55b78",
         siteFile: "4a9d89c9-f4eb-41af-91e4-909eff389f3e",
      };
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
         logo: logo?.pathFile,
      };
      return data;
   },
   template: () => {
      return fs.readFileSync(
         path.join(__dirname, "templates", "well-receipt.ejs"),
         "utf8",
      );
   },
};
