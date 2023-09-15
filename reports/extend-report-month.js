const fs = require("fs");
const { cond } = require("lodash");
const path = require("path");
const utils = require("./_utils");

const OBJECT_IDS = {
   MinistryTeam: "138ff828-4579-412b-8b5b-98542d7aa152",
   RC_Name: "c3aae079-d36d-489f-ae1e-a6289536cb1a",
   GetYear: "6c398e8f-ddde-4e26-b142-353de5b16397",
   GetMonth: "1d63c6ac-011a-4ffd-ae15-97e5e43f2b3f",
   BALANCE: "bb9aaf02-3265-4b8c-9d9a-c0b447c2d804",
   ProjectBudget: "839ac470-8f77-420c-9a30-aeaf0a9f509c",
};

function GetViewDataBalanceReport(rcVal, monthVal) {
   return {
      title: {
         en: "RC Balances",
         zh: "",
      },
      fnValueFormat: utils.valueFormat,
      items: [],
   };
}

function GetTeamList(AB) {
   const getTeamObj = AB.objectByID(OBJECT_IDS.MinistryTeam).model();

   if (getTeamObj == null) {
      return Promise.resolve([]);
   }

   return new Promise((next, bad) => {
      getTeamObj

         .findAll({
            populate: false,
         })
         .then((list) => {
            next(list.map((item) => item["Name"]));
         })
         .catch(bad);
   });
}

function GetRCList(AB) {
   const getRCObj = AB.objectByID(OBJECT_IDS.RC_Name).model();

   if (getRCObj == null) {
      return Promise.resolve([]);
   }

   return new Promise((next, bad) => {
      getRCObj

         .findAll({
            populate: false,
         })
         .then((list) => {
            next(list.map((item) => item["RC Name"]));
         })
         .catch(bad);
   });
}

function GetYearList(AB) {
   const getYearObj = AB.objectByID(OBJECT_IDS.GetYear).model();

   if (getYearObj == null) {
      return Promise.resolve([]);
   }

   return new Promise((next, bad) => {
      getYearObj

         .findAll({
            populate: false,
            sort: [
               {
                  key: "d1998e53-9a97-4cfc-bc81-e071c0acc8ed",
                  dir: "ASC",
               },
            ],
         })
         .then((list) => {
            next(list.map((item) => item["FYear"]));
         })
         .catch(bad);
   });
}

function GetMonthList() {
   var array = [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
   ];

   function compareNumbers(a, b) {
      return a - b;
   }
   array.sort();
   array.sort(compareNumbers);
   return array;
}

module.exports = {
   prepareData: async (AB, { rcVal, teamVal, yearVal, monthVal }, req) => {
      //const viewData = {};
      const rcHash = {};
      let viewData = GetViewDataBalanceReport(rcVal, monthVal);
      const projectOBJ = AB.objectByID(OBJECT_IDS.ProjectBudget).model();
      function countYears() {
         let a = yearVal;
         if (a) {
            let b = a.length;
            if (b > 4) {
               let c = a.split("20");
               let d = c.join("");
               return d;
            } else {
               return yearVal;
            }
         }
      }

      const where = {
         glue: "and",
         rules: [],
      };

      where.rules.push({
         key: "Ministry Team",
         rule: "equals",
         value: teamVal,
      });

      if (yearVal) {
         where.rules.push({
            key: "Fiscal Year",
            rule: "equals",
            value: countYears(),
         });
      }

      const projectBudgets = await projectOBJ.findAll({
         where: where,
         populate: true,
      });

      Object.keys(projectBudgets).forEach((QX) => {
         var Team_lists = projectBudgets[QX]["RC"];
         viewData.Team_lists = Team_lists;
      });

      const balanceObj = AB.objectByID(OBJECT_IDS.BALANCE).model();

      const cond = {
         glue: "and",
         rules: [
            {
               key: "COA Num",
               rule: "in",
               value: [3991, 3500],
            },
         ],
      };

      if (rcVal == "All") {
         rcVal = "";
      }

      if (rcVal) {
         cond.rules.push({
            key: "RC Code",
            rule: "equals",
            value: rcVal,
         });
      }

      if (teamVal) {
         cond.rules.push({
            key: "RC Code",
            rule: "equals",
            value: viewData.Team_lists,
         });
      }
      if (monthVal) {
         if (yearVal.length < 6) {
            const splitYear = yearVal.split("20").join("");
            const monthJoin = "FY" + splitYear + " M" + monthVal;
            cond.rules.push({
               key: "FY Period",
               rule: "equals",
               value: monthJoin,
            });
         } else {
            const splitYear = yearVal.split("20").join("");
            const monthJoin = splitYear + " M" + monthVal;
            cond.rules.push({
               key: "FY Period",
               rule: "equals",
               value: monthJoin,
            });
         }
      }

      const balanceData = await balanceObj.findAll({
         where: cond,
         populate: true,
      });

      viewData.monthOptions = await GetMonthList(AB);
      viewData.yearOptions = await GetYearList(AB);
      viewData.rcOptions = await GetRCList(AB);
      viewData.teamOptions = await GetTeamList(AB);

      // Render UI
      // Calculate Sum
      (balanceData || []).forEach((gl) => {
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
         path.join(__dirname, "templates", "extend-report-month.ejs"),
         "utf8"
      );
   },
};
