/**
 *Budget VS Expense Report
 *
 *
 */
const fs = require("fs");
const path = require("path");
const utils = require("./_utils");

const OBJECT_IDS = {
   FiscalYear: "6c398e8f-ddde-4e26-b142-353de5b16397",
   ProjectBudget: "839ac470-8f77-420c-9a30-aeaf0a9f509c",
   MinistryTeam: "138ff828-4579-412b-8b5b-98542d7aa152",
   ResponsibilityCenter: "c3aae079-d36d-489f-ae1e-a6289536cb1a",
};

const QUERY_IDS = {
   myTeams: "62a0c464-1e67-4cfb-9592-a7c5ed9db45c",
   myRCs: "241a977c-7748-420d-9dcb-eff53e66a43f",
   teamJEArchive: "1bcd1217-7116-4e83-b6d1-da81b36a38cb",
};

const FIELD_IDS = {
   BUDGET_RC: "9bd86c7d-102d-4aa5-ae45-a7bcc19e7192",
   BUDGET_TEAM: "d35ba507-3f93-4eca-8046-b16ea85a2433",
   BUDGET_YEAR: "0053696c-b597-4871-a40b-8360ac63d2b6",
   BUDGET_TOTAL_EXPENSE: "b69b8379-2547-4cf1-a7ad-2ab55e8a56a0",

   EXPENSE_TEAM: "f8ee19c3-554c-4354-8cff-63310a1d9ae0",
   EXPENSE_RC: "232d33bd-40e9-4ba6-8718-9718cbc95f5b",
   EXPENSE_YEAR: "549ab4ac-f436-461d-9777-505d6dc1d4f7",
   EXPENSE_ACCOUNT: "69133f41-7c12-44af-bd59-426a723f5e1e",
   EXPENSE_CREDIT: "513a31b1-1f1c-487d-b65d-f87764d8aa38",
   EXPENSE_DEBIT: "c73c6da9-fa40-40c0-98aa-a045b2d870dc",

   PROJECT_NUMBER: "3bb80108-b29b-4141-a84e-646bcbab98bf",
   PROJECT_NAME: "3adf1639-fbaf-44f9-9249-d2800506642c",

   myRCsTeam: "ae4ace97-f70c-4132-8fa0-1a0b1a9c7859",
   MCC_Name: "eb0f60c3-55cf-40b1-8408-64501f41fa71",

   RC_MCC_Name: "f9992485-00ad-48c1-a9d6-c870915bfc78",
};

const ROLE_IDS = {
   CORE_FINANCE: "e32dbd38-2300-4aac-84a9-d2c704bd2a29",
}

const FilterOutRC = [
   "06 : Q100-QX MT",
   "02 : Q5CD-South Campus MT",
   "02 : Q5CD-North Campus MT",
   "02 : Q3SY-XSM city cross MT",
   "02 : Q3SY-SSN non-cross MT",
   "02 : Q3SY-SIE non-cross MT",
   "02 : Q3SY-SAU non-cross MT",
   "02 : Q3SY-DDU non-cross MT",
   "02 : Q3NM-HNM non-cross MT",
   "02 : Q3NM-HNM cross MT",
   "02 : Q3HB-HEB non-cross MT",
   "02 : Q3HB-HEB cross MT",
   "02 : Q3DL-DDL non-cross MT",
   "02 : Q3DL-DDL cross MT",
   "02 : Q3CC-CC non-cross MT",
   "02 : Q3CC-CC cross MT",
   "02 : Q1BJ-Domestic MT",
   "02 : Q1BJ-2016CP XJ MT",
   "02 : Q1BJ-2013SC MT-KuangDa",
   "02 : Q1BJ-2013Bangladesh MT",
];

function sort(a, b) {
   return (a ?? "").toString().toLowerCase().localeCompare((b ?? "").toString().toLowerCase());
}

async function getProjectBudgets(modelProjectBudget, teams, rcs, year) {
   if (teams?.length < 1 || rcs?.length < 1) return [];

   const condProject = {
      glue: "and",
      rules: [
         {
            key: FIELD_IDS.BUDGET_RC,
            rule: "not_in",
            value: FilterOutRC,
         },
         {
            key: FIELD_IDS.BUDGET_TOTAL_EXPENSE,
            rule: "greater",
            value: 0,
         },
      ],
   };

   const teamCond = {
      glue: "or",
      rules: [],
   }
   teams.forEach((team) => {
      teamCond.rules.push({
         key: FIELD_IDS.BUDGET_TEAM,
         rule: "equals",
         value: team,
      });
   });
   condProject.rules.push(teamCond);

   if (rcs.length) {
      const rcCond = {
         glue: "or",
         rules: [],
      };

      rcs.forEach((rc) => {
         rcCond.rules.push({
            key: FIELD_IDS.BUDGET_RC,
            rule: "equals",
            value: rc,
         });
      });

      condProject.rules.push(rcCond);
   }
   if (year) {
      condProject.rules.push({
         key: FIELD_IDS.BUDGET_YEAR,
         rule: "equals",
         value: year,
      });
   }

   return await modelProjectBudget.findAll({
      where: condProject,
      sort: [
         { key: FIELD_IDS.BUDGET_RC, dir: "ASC" },
         { key: FIELD_IDS.PROJECT_NUMBER, dir: "ASC" }
      ],
      populate: false,
   });
}

async function getActualExpense(modelTeamJEArchive, teams, rcs, year) {
   if (teams?.length < 1 || rcs?.length < 1) return [];

   const cond = {
      glue: "and",
      rules: [
         {
            key: FIELD_IDS.EXPENSE_RC,
            rule: "not_in",
            value: FilterOutRC,
         },
         {
            key: FIELD_IDS.EXPENSE_YEAR,
            rule: "contains",
            value: year,
         },
         {
            // Start with COA Num 7xxx,8xxx
            glue: "or",
            rules: [
               {
                  key: FIELD_IDS.EXPENSE_ACCOUNT,
                  rule: "begins_with",
                  value: "7",
               },
               {
                  key: FIELD_IDS.EXPENSE_ACCOUNT,
                  rule: "begins_with",
                  value: "8",
               },
            ],
         },
         {
            glue: "or",
            rules: [
               {
                  key: FIELD_IDS.EXPENSE_CREDIT,
                  rule: "greater",
                  value: 0,
               },
               {
                  key: FIELD_IDS.EXPENSE_DEBIT,
                  rule: "greater",
                  value: 0,
               },
            ],
         },
      ],
   };

   const teamCond = {
      glue: "or",
      rules: [],
   }
   teams.forEach((team) => {
      teamCond.rules.push({
         key: FIELD_IDS.EXPENSE_TEAM,
         rule: "equals",
         value: team,
      });
   });
   cond.rules.push(teamCond);

   if (rcs.length) {
      const rcCond = {
         glue: "or",
         rules: [],
      };
      rcs.forEach((rc) => {
         rcCond.rules.push({
            key: FIELD_IDS.EXPENSE_RC,
            rule: "equals",
            value: rc,
         });
      });
      cond.rules.push(rcCond);
   }

   return await modelTeamJEArchive.findAll({
      where: cond,
      sort: [
         { key: FIELD_IDS.EXPENSE_RC, dir: "ASC" },
         { key: FIELD_IDS.PROJECT_NUMBER, dir: "ASC" },
      ],
      populate: false,
   });
}

module.exports = {
   prepareData: async (AB, { team, mcc, rc, fyYear }, req) => {
      const data = {
         current_path: __dirname,
         title: {
            en: "Budget vs. Actual",
            zh: "实际的 to 实际花费",
         },
         fnValueFormat: utils.valueFormat,
      };
      // get our passed params
      data.team = team ? team : undefined;
      data.mcc = mcc ? mcc: undefined;
      data.rc = rc ? rc : undefined;
      data.fyYear = fyYear;
      fyYear = (fyYear || `FY${new Date().getFullYear()}`).toString();
      // NOTE: Convert "FY2023" to "FY23" format
      fyYear = fyYear.length == 6 ? `FY${fyYear.slice(-2)}` : fyYear;

      const allTeams = AB.objectByID(OBJECT_IDS.MinistryTeam).model();
      const myTeams = AB.queryByID(QUERY_IDS.myTeams).model();
      const allRCs = AB.objectByID(OBJECT_IDS.ResponsibilityCenter).model();
      const myRCs = AB.queryByID(QUERY_IDS.myRCs).model();
      const queryTeamJEArchive = AB.queryByID(QUERY_IDS.teamJEArchive);
      const modelTeamJEArchive = queryTeamJEArchive.model();
      const yearObj = AB.objectByID(OBJECT_IDS.FiscalYear).model();
      const projectBudgetObj = AB.objectByID(OBJECT_IDS.ProjectBudget).model();
      const teamField = AB.queryByID(QUERY_IDS.myRCs).fieldByID(FIELD_IDS.myRCsTeam);
      const mccField = AB.queryByID(QUERY_IDS.myRCs).fieldByID(FIELD_IDS.MCC_Name);
      const rcMccField = AB.objectByID(OBJECT_IDS.ResponsibilityCenter).fieldByID(FIELD_IDS.RC_MCC_Name);

      const isCoreUser = (req._user?.SITE_ROLE ?? []).filter((r) => (r.uuid ?? r) == ROLE_IDS.CORE_FINANCE).length > 0;

      // Load Data
      const [teamsArray, rcs, yearArray] = await Promise.all([
         // Return teams
         isCoreUser ?
         allTeams.findAll(
            {
               populate: false,
               where: {
                  glue: "and",
                  rules: [
                     {
                        key: "Name",
                        rule: "is_not_empty",
                     },
                  ],
               },
            },
            { username: req._user.username },
            AB.req
         ) :
         myTeams.findAll(
            {
               populate: false,
            },
            { username: req._user.username },
            AB.req
         ),
         // Return myRCs
         isCoreUser ?
         allRCs.findAll(
            {
               populate: false,
            },
            { username: req._user.username },
            AB.req
         ) :
         myRCs.findAll(
            {
               populate: false,
            },
            { username: req._user.username },
            AB.req
         ),
         //Return year
         yearObj.findAll(
            {
               populate: false,
            },
            { username: req._user.username },
            AB.req
         ),
      ]);

      const selectedRcs = rcs
            .filter((r) => (!rc && !mcc) || (r["BASE_OBJECT.RC Name"] ?? r["RC Name"]) == rc || (r[`${mccField.alias}.${mccField.columnName}`] ?? r[rcMccField.columnName]) == mcc)
            .map((r) => r["BASE_OBJECT.RC Name"] ?? r["RC Name"]);

      data.teamOptions = (teamsArray ?? [])
         .map((t) => t["BASE_OBJECT.Name"] ?? t["Name"])
         // Remove duplicated Team
         .filter(function (t, pos, self) {
            return t && self.indexOf(t) == pos;
         })
         .sort(sort);

      const selectedTeams = team ? [team] : data.teamOptions;
      const [budgets, expenses] = await Promise.all([
         getProjectBudgets(projectBudgetObj, selectedTeams, selectedRcs, fyYear),
         getActualExpense(modelTeamJEArchive, selectedTeams, selectedRcs, fyYear),
      ]);

      data.mccOptions = (rcs ?? [])
         .map((t) => t[`${mccField.alias}.${mccField.columnName}`] ?? t[rcMccField.columnName])
         // Remove duplicated RC
         .filter(function (mcc, pos, self) {
            return mcc && self.indexOf(mcc) == pos;
         })
         .sort(sort);

      data.rcOptions = (rcs ?? [])
         .filter(((t) => !team || (t[`${teamField.alias}.${teamField.columnName}`] ?? t[teamField.columnName]) == team))
         .map((t) => t["BASE_OBJECT.RC Name"] ?? t["RC Name"])
         // Remove duplicated RC
         .filter(function (rc, pos, self) {
            return rc && self.indexOf(rc) == pos;
         })
         .sort(sort);

      data.yearOptions = (yearArray ?? []).map((t) => t["FYear"]).sort(sort);

      data.totalBudgetAmount = 0;
      data.totalActualExpense = 0;

      // [Format]
      // {
      //    RC_Name: {
      //       project_number: {
      //          project_name: "",
      //          budget_amount: 0,
      //          actual_expense: 0,
      //       },
      //       total_budget_amount: 0,
      //       total_actual_expense: 0,
      //    },
      //    ...
      //    RC_Name_n: {}
      // }
      data.rc_infos = {};

      // Pull BUDGET of each Project
      budgets.forEach((b) => {
         const RC = b["RC"];
         const Project_Number = b["Project Number"];
         const Project_Name = b["Project Name"];
         const Expense_Amount = b["Expense Total Amount"];

         data.rc_infos[RC] = data.rc_infos[RC] ?? {
            total_budget_amount: 0,
            total_actual_expense: 0,
         };

         data.rc_infos[RC][Project_Number] = data.rc_infos[RC][Project_Number] ?? {
            project_name: Project_Name,
            budget_amount: 0,
            actual_expense: 0,
         };

         data.rc_infos[RC][Project_Number].budget_amount += Expense_Amount;
         data.rc_infos[RC].total_budget_amount += Expense_Amount;
         data.totalBudgetAmount += Expense_Amount;
      });

      // Pull EXPENSE of each Project
      const fieldRC = queryTeamJEArchive.fieldByID(FIELD_IDS.EXPENSE_RC);
      const fieldProjectNumber = queryTeamJEArchive.fieldByID(FIELD_IDS.PROJECT_NUMBER);
      const fieldProjectName = queryTeamJEArchive.fieldByID(FIELD_IDS.PROJECT_NAME);
      expenses.forEach((e) => {
         const RC = e[`${fieldRC.alias}.${fieldRC.columnName}`];
         const Project_Number = e[`${fieldProjectNumber.alias}.${fieldProjectNumber.columnName}`];
         const Project_Name = e[`${fieldProjectName.alias}.${fieldProjectName.columnName}`];
         const ACTUAL_EXPENSE = (e["BASE_OBJECT.Debit"] ?? 0) - (e["BASE_OBJECT.Credit"] ?? 0);

         data.rc_infos[RC] = data.rc_infos[RC] ?? {
            total_budget_amount: 0,
            total_actual_expense: 0,
         };

         data.rc_infos[RC][Project_Number] = data.rc_infos[RC][Project_Number] ?? {
            project_name: Project_Name,
            budget_amount: 0,
            actual_expense: 0,
         };

         data.rc_infos[RC][Project_Number].actual_expense += ACTUAL_EXPENSE;
         data.rc_infos[RC].total_actual_expense += ACTUAL_EXPENSE;
         data.totalActualExpense += ACTUAL_EXPENSE;
      });

      data.percentExpenseBudget = data.totalBudgetAmount && data.totalActualExpense ? (data.totalActualExpense / data.totalBudgetAmount) * 100 : 0;

      return data;
   },

   template: () => {
      return fs.readFileSync(
         path.join(__dirname, "templates", "budget-vs-expense.ejs"),
         "utf8"
      );
   },
};
