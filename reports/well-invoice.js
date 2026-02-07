const path = require("path");
const fs = require("fs");
module.exports = {
   prepareData: async (AB, { payeeId }) => {
      const ids = {
         billingAccount: "7ecd7257-1023-4917-bc3f-88061293cf30",
         entity: "21c32a39-335f-473e-8ce9-395d265b7a6a",
         transaction: "4a43ff1d-bbee-4d14-a4b4-a82c57c55b78",
         datefield: "bca053b6-bdae-4e00-ad4d-89f51397056e",
         siteFile: "4a9d89c9-f4eb-41af-91e4-909eff389f3e",
         session: "d6b8ae02-92bc-474c-8309-8503ec025cbf",
      };
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
         logo: logo?.pathFile,
      };
      return data;
   },
   template: () => {
      return fs.readFileSync(
         path.join(__dirname, "templates", "well-invoice.ejs"),
         "utf8",
      );
   },
};
