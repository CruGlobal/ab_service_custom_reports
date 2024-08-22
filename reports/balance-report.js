const path = require("path");
const fs = require("fs");
const utils = require("./_utils");

const OBJECT_IDS = {
   MINISTRY_TEAM: "138ff828-4579-412b-8b5b-98542d7aa152",
   QX: "2a662d46-384b-4d3b-901b-b74c0cd39b15",
   RC: "c3aae079-d36d-489f-ae1e-a6289536cb1a",
   FY_MONTH: "1d63c6ac-011a-4ffd-ae15-97e5e43f2b3f",
   BALANCE: "bb9aaf02-3265-4b8c-9d9a-c0b447c2d804",
   MCC: "cdd5e9ca-fed6-4fab-ace8-925b58d592e4",
};

const QUERY_IDS = {
   MyMinistryTeams: "62a0c464-1e67-4cfb-9592-a7c5ed9db45c",
   MyTeamRC: "241a977c-7748-420d-9dcb-eff53e66a43f",
   MyQXRC: "2e3e423b-fcec-4221-9a9c-7a670fbba65e",
   MyQX: "ee0c1ac3-7391-4dd5-8d2e-83da121db100",
};

const FIELDS_IDS = {
   RC_Team: "ae4ace97-f70c-4132-8fa0-1a0b1a9c7859",
   RC_QX: "c94245dd-70e1-4083-a001-62ae1d210ba3",
   RC_MCC: "f9992485-00ad-48c1-a9d6-c870915bfc78",
   MyQXRC_Team: "ae4ace97-f70c-4132-8fa0-1a0b1a9c7859",
   MyTeamRC_Team: "f8ee19c3-554c-4354-8cff-63310a1d9ae0",
   mccFieldId: "eb0f60c3-55cf-40b1-8408-64501f41fa71",
};

const ROLE_IDS = {
   CORE_FINANCE: "e32dbd38-2300-4aac-84a9-d2c704bd2a29",
};

function GetViewDataBalanceReport(team, qx, mcc, rc, fyMonth) {
   return {
      title: {
         en: "RC Balances",
         zh: "",
      },
      fnValueFormat: utils.valueFormat,
      team: team,
      qx: qx,
      mcc: mcc,
      rcType: rc,
      fyPeriod: fyMonth,
      fyOptions: [],
      teamOptions: [],
      qxOptions: [],
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
      )
   )
      .map((t) => t["BASE_OBJECT.Name"] ?? t["Name"])
      // Remove duplicated Team
      .filter(function (t, pos, self) {
         return t && self.indexOf(t) == pos;
      });
}

async function GetQXs(AB, req, isCoreUser) {
   const allQXs = AB.objectByID(OBJECT_IDS.QX).model();
   const myQXs = AB.queryByID(QUERY_IDS.MyQX).model();

   return (isCoreUser ?
      await allQXs.findAll(
         {
            populate: false,
         },
         { username: req._user.username },
         AB.req
      ) :
      await myQXs.findAll(
         {
            populate: false,
         },
         { username: req._user.username },
         AB.req
      )
   )
      .map((t) => t["BASE_OBJECT.QX Code"] ?? t["QX Code"])
      // Remove duplicated Team
      .filter(function (t, pos, self) {
         return t && self.indexOf(t) == pos;
      });
}

async function GetMCC(AB, req) {
   const mccModel = AB.objectByID(OBJECT_IDS.MCC).model();

   return await mccModel.findAll(
      {
         populate: false,
      },
      { username: req._user.username },
      AB.req
   );
}

async function GetRC(AB, req, queryId, cond) {
   const qModel = AB.queryByID(queryId).model();

   return await qModel.findAll(cond,
      { username: req._user.username },
      AB.req
   );
}

async function GetFYMonths(AB, req) {
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

   const fyModel = AB.objectByID(OBJECT_IDS.FY_MONTH).model();
   return (await fyModel.findAll(cond, { username: req._user.username }, AB.req)).map(
      (item) => item["FY Per"]
   );
}

async function GetBalances(AB, rc, fyPeriod, extraRules = []) {
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

   // return await utils.getData(req, OBJECT_IDS.BALANCE, cond);
   const objBalance = AB.objectByID(OBJECT_IDS.BALANCE).model();
   return objBalance.findAll(cond);
}

module.exports = {
   // GET: /template/balanceReport
   // balanceReport: (req, res) => {
   prepareData: async (AB, { team, qx, mcc, rc, fyper }, req) => {
      const isCoreUser = (req._user?.SITE_ROLE ?? []).filter((r) => (r.uuid ?? r) == ROLE_IDS.CORE_FINANCE).length > 0;
      const viewData = GetViewDataBalanceReport(team, qx, mcc, rc, fyper);

      /**
       * {
       *    rcName1: sum of balances,
       *    rcName2: sum of balances,
       *    ...
       * }
       */
      const rcHash = {};

      const [teamOpts, qxOpts, fyOpts, mccOpts] = await Promise.all([
         GetTeams(AB, req, isCoreUser),
         GetQXs(AB, req, isCoreUser),
         GetFYMonths(AB, req),
         GetMCC(AB, req),
      ]);

      const query = AB.queryByID(
         viewData.rcType == "qx" ? QUERY_IDS.MyQXRC : QUERY_IDS.MyTeamRC
      );

      const mccField = query.fieldByID(FIELDS_IDS.mccFieldId);
      const mccName = mccOpts.filter((m) => m.id == mcc || m["MCC Num"] == mcc)[0]?.[mccField.columnName];

      // Return teams
      viewData.teamOptions = (isCoreUser || viewData.rcType == "team") ? teamOpts : [];

      // Return QXs
      viewData.qxOptions = (isCoreUser || viewData.rcType == "qx") ? qxOpts : [];

      // Pull FY month list
      viewData.fyOptions = fyOpts;

      // Check QX Role of the user
      let RCs = [];
      if (isCoreUser) {
         const objRCs = AB.objectByID(OBJECT_IDS.RC).model();
         RCs = RCs.concat(await objRCs.findAll({
            populate: false,
            where: {
               glue: "and",
               rules: mccName ? [
                  {
                     key: FIELDS_IDS.RC_MCC,
                     rule: "equals",
                     value: mccName,
                  },
               ] : [],
            },
         }));
      }
      else if (viewData.rcType == "qx") {
         RCs = RCs.concat(await GetRC(AB, req, QUERY_IDS.MyQXRC));
      }
      else if (viewData.rcType == "team") {
         RCs = RCs.concat(await GetRC(AB, req, QUERY_IDS.MyTeamRC));
      }

      // MCC option list
      viewData.mccOptions = mccOpts
         .filter((m) => RCs.filter((rc) => m[mccField.columnName] == rc[`${mccField.alias}.${mccField.columnName}`] || m["MCC Num"] == rc["MCCcode"]).length)
         .map((m) => {
            return {
               id: m["MCC Num"],
               name: m[mccField.columnName]
            }
         })
         // .filter((m, ft, tl) => m && tl.indexOf(m) == ft);

      if (team) {
         const rcTeamField = AB.objectByID(OBJECT_IDS.RC).fieldByID(FIELDS_IDS.RC_Team);
         const qxTeamField = AB.queryByID(QUERY_IDS.MyQXRC).fieldByID(FIELDS_IDS.MyQXRC_Team);
         const myTeamField = AB.queryByID(QUERY_IDS.MyTeamRC).fieldByID(FIELDS_IDS.MyTeamRC_Team);
         RCs = RCs.filter(
            ((rc) => !team || rc[rcTeamField?.columnName] == team || rc[`${qxTeamField?.alias}.${qxTeamField?.columnName}`] == team || rc[`${myTeamField?.alias}.${myTeamField?.columnName}`] == team)
         );
      }

      if (qx) {
         const rcQxField = AB.objectByID(OBJECT_IDS.RC).fieldByID(FIELDS_IDS.RC_QX);
         const myQxRcField = AB.queryByID(QUERY_IDS.MyQXRC).fieldByID(FIELDS_IDS.RC_QX);
         RCs = RCs.filter(
            ((rc) => rc[rcQxField?.columnName] == qx || rc[`${myQxRcField?.alias}.${myQxRcField?.columnName}`] == qx)
         );
      }

      if (mcc) {
         RCs = RCs.filter((rc) => {
            const mccVal = rc[`${mccField.alias}.${mccField.columnName}`] ?? rc["MCCcode"] ?? rc[mccField.columnName];
            return mccVal == mcc || mccVal == mccName
         });
      }

      const rcNames = RCs.map((rc) => rc["BASE_OBJECT.RC Name"] ?? rc["RC Name"]).sort((a, b) =>
         (a ?? "").toString().toLowerCase().localeCompare((b ?? "").toString().toLowerCase())
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
         AB,
         null,
         viewData.fyPeriod || viewData.fyOptions[0],
         rules
      );

      // Render UI
      // Calculate Sum
      (balances || []).forEach((gl) => {
         // Only RC is active
         const rcActive = gl?.["RCCode__relation"]?.Active;
         if (rcActive != true && rcActive != 1) return;

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
