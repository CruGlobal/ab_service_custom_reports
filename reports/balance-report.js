const path = require("path");
const fs = require("fs");
const utils = require("./_utils");

const OBJECT_IDS = {
   MINISTRY_TEAM: "138ff828-4579-412b-8b5b-98542d7aa152",
   RC: "c3aae079-d36d-489f-ae1e-a6289536cb1a",
   FY_MONTH: "1d63c6ac-011a-4ffd-ae15-97e5e43f2b3f",
   BALANCE: "bb9aaf02-3265-4b8c-9d9a-c0b447c2d804",
};

const QUERY_IDS = {
   MyMinistryTeams: "62a0c464-1e67-4cfb-9592-a7c5ed9db45c",
   MyTeamRC: "241a977c-7748-420d-9dcb-eff53e66a43f",
   MyQXRC: "2e3e423b-fcec-4221-9a9c-7a670fbba65e",
};

const FIELDS_IDS = {
   RC_Team: "ae4ace97-f70c-4132-8fa0-1a0b1a9c7859",
   MyQXRC_Team: "ae4ace97-f70c-4132-8fa0-1a0b1a9c7859",
   MyTeamRC_Team: "f8ee19c3-554c-4354-8cff-63310a1d9ae0",
   mccFieldId: "eb0f60c3-55cf-40b1-8408-64501f41fa71",
};

const ROLE_IDS = {
   CORE_FINANCE: "e32dbd38-2300-4aac-84a9-d2c704bd2a29",
};

function GetViewDataBalanceReport(team, mcc, rc, fyMonth) {
   return {
      title: {
         en: "RC Balances",
         zh: "",
      },
      fnValueFormat: utils.valueFormat,
      team: team,
      mcc: mcc,
      rcType: rc,
      fyPeriod: fyMonth,
      fyOptions: [],
      items: [],
   };
}

async function GetTeams(AB, req, isCoreUser) {
   const allTeams = AB.objectByID(OBJECT_IDS.MINISTRY_TEAM).model();
   const myTeams = AB.queryByID(QUERY_IDS.MyMinistryTeams).model();

   return (isCoreUser ?
      await allTeams.findAll(
         {
            populate: false,
         },
         { username: req._user.username },
         AB.req
      ) :
      await myTeams.findAll(
         {
            populate: false,
         },
         { username: req._user.username },
         AB.req
      ))
      .map((t) => t["BASE_OBJECT.Name"] ?? t["Name"])
      // Remove duplicated Team
      .filter(function (t, pos, self) {
         return t && self.indexOf(t) == pos;
      });
}

async function GetRC(req, queryId) {
   const list = await utils.getData(req, queryId);

   return list || [];
}

async function GetFYMonths(req) {
   const cond = {
      where: {
         glue: "or",
         rules: [
            {
               key: "Status",
               rule: "equals",
               value: "1592549786113",
            },
            {
               key: "Status",
               rule: "equals",
               value: "1592549785939",
            },
         ],
      },
      populate: false,
      sort: [
         {
            key: "49d6fabe-46b1-4306-be61-1b27764c3b1a",
            dir: "DESC",
         },
      ],
      limit: 12,
   };

   return (await utils.getData(req, OBJECT_IDS.FY_MONTH, cond)).map(
      (item) => item["FY Per"]
   );
}

async function GetBalances(req, rc, fyPeriod, extraRules = []) {
   const cond = {
      where: {
         glue: "and",
         rules: [],
      },
      populate: true,
   };

   if (rc) {
      cond.where.rules.push({
         key: "RC Code",
         rule: "equals",
         value: rc,
      });
   }

   if (fyPeriod) {
      cond.where.rules.push({
         key: "FY Period",
         rule: "equals",
         value: fyPeriod,
      });
   }

   (extraRules || []).forEach((r) => {
      if (!r) return;

      cond.where.rules.push(r);
   });

   return await utils.getData(req, OBJECT_IDS.BALANCE, cond);
}

module.exports = {
   // GET: /template/balanceReport
   // balanceReport: (req, res) => {
   prepareData: async (AB, { team, mcc, rc, fyper }, req) => {
      const isCoreUser = (req._user?.SITE_ROLE ?? []).filter((r) => (r.uuid ?? r) == ROLE_IDS.CORE_FINANCE).length > 0;
      const viewData = GetViewDataBalanceReport(team, mcc, rc, fyper);

      /**
       * {
       *    rcName1: sum of balances,
       *    rcName2: sum of balances,
       *    ...
       * }
       */
      const rcHash = {};

      // Return teams
      viewData.teamOptions = await GetTeams(AB, req, isCoreUser);

      // Pull FY month list
      viewData.fyOptions = await GetFYMonths(req);

      // Check QX Role of the user
      let RCs = [];
      if (isCoreUser) {
         RCs = RCs.concat(await GetRC(req, OBJECT_IDS.RC));
      }
      else if (viewData.rcType == "qx") {
         RCs = RCs.concat(await GetRC(req, QUERY_IDS.MyQXRC));
      }
      else if (viewData.rcType == "team") {
         RCs = RCs.concat(await GetRC(req, QUERY_IDS.MyTeamRC));
      }

      const query = AB.queryByID(
         viewData.rcType == "qx" ? QUERY_IDS.MyQXRC : QUERY_IDS.MyTeamRC
      );
      const mccField = query.fieldByID(FIELDS_IDS.mccFieldId);

      // MCC option list
      viewData.mccOptions = RCs.map(
         (rc) => rc[`${mccField.alias}.${mccField.columnName}`] ?? rc["MCCcode"]
      ).filter((mcc, ft, tl) => mcc && tl.indexOf(mcc) == ft);

      if (team) {
         const rcTeamField = AB.objectByID(OBJECT_IDS.RC).fieldByID(FIELDS_IDS.RC_Team);
         const qxTeamField = AB.queryByID(QUERY_IDS.MyQXRC).fieldByID(FIELDS_IDS.MyQXRC_Team);
         const myTeamField = AB.queryByID(QUERY_IDS.MyTeamRC).fieldByID(FIELDS_IDS.MyTeamRC_Team);
         RCs = RCs.filter(
            ((rc) => !team || rc[rcTeamField.columnName] == team || rc[`${qxTeamField.alias}.${qxTeamField.columnName}`] == team || rc[`${myTeamField.alias}.${myTeamField.columnName}`] == team)
         );
      }

      if (mcc) {
         RCs = RCs.filter(
            (rc) => (rc[`${mccField.alias}.${mccField.columnName}`] ?? rc[mccField.columnName]) == mcc
         );
      }

      const rcNames = RCs.map((rc) => rc["BASE_OBJECT.RC Name"] ?? rc["RC Name"]).sort((a, b) =>
         a.toLowerCase().localeCompare(b.toLowerCase())
      );

      // Pull Balance
      const rules = [
         {
            key: "RC Code",
            rule: "in",
            value: rcNames,
         },
         {
            key: "COA Num",
            rule: "in",
            value: [3991, 3500],
         },
      ];

      const balances = await GetBalances(
         req,
         null,
         viewData.fyPeriod || viewData.fyOptions[0],
         rules
      );

      // Render UI
      // Calculate Sum
      (balances || []).forEach((gl) => {
         rcHash[gl["RC Code"]] =
            rcHash[gl["RC Code"]] == null ? 0 : rcHash[gl["RC Code"]];

         rcHash[gl["RC Code"]] += gl["Running Balance"] || 0;
      });

      // Convert to View Data
      Object.keys(rcHash).forEach((rcCode) => {
         viewData.items.push({
            title: rcCode,
            value: rcHash[rcCode],
         });
      });

      // Sort
      viewData.items = viewData.items.sort((a, b) =>
         a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      );

      return viewData;
   },
   template: () => {
      return fs.readFileSync(
         path.join(__dirname, "templates", "balance-report.ejs"),
         "utf8"
      );
   },
};
