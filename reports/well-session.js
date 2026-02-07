const path = require("path");
const fs = require("fs");
const utils = require("./_utils");
module.exports = {
   prepareData: async (AB, { sessionID }, req) => {
      // Object Definition Ids
      const ids = {
         session: "d6b8ae02-92bc-474c-8309-8503ec025cbf",
         entity: "21c32a39-335f-473e-8ce9-395d265b7a6a",
         siteFile: "4a9d89c9-f4eb-41af-91e4-909eff389f3e",
      };

      // Load Data
      const [[session], [entity]] = await Promise.all([
         utils.getData(req, ids.session, {
            where: {
               glue: "and",
               rules: [
                  {
                     key: "uuid",
                     rule: "equals",
                     value: sessionID,
                  },
               ],
            },
            populate: true,
         }),
         utils.getData(req, ids.entity),
      ]);

      const [[logo]] = await Promise.all([
         utils.getData(req, ids.siteFile, {
            where: {
               glue: "and",
               rules: [
                  {
                     key: "uuid",
                     rule: "equals",
                     value: entity.Logo,
                  },
               ],
            },
         }),
      ]);
      const connectedSessionNote = session.Session948;
      const sessionNote = {};

      for (const key in connectedSessionNote) {
         switch (key) {
            case "uuid":
            case "created_at":
            case "updated_at":
            case "properties":
            case "Provider":
            case "Client":
            case "Session":
            case "id":
               break;

            default:
               sessionNote[key] = connectedSessionNote[key];
               break;
         }
      }

      // Data for template
      const data = {
         number: session["Session ID"],
         date: new Date(session["Session Date"]),
         providers: session.Providers__relation,
         clientsPresent: session.ClientsPresent__relation,
         otherParticipants: session["Other Participants"],
         sessionNote,
         entity,
         logo: logo.pathFile,
      };

      return data;
   },
   template: () => {
      return fs.readFileSync(
         path.join(__dirname, "templates", "well-session.ejs"),
         "utf8",
      );
   },
};
