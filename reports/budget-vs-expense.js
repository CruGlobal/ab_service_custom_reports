/**
 *Budget VS Expense Report
 *
 *
 */
const fs = require("fs");
const path = require("path");

const OBJECT_IDS = {
   FY_MONTH: "1d63c6ac-011a-4ffd-ae15-97e5e43f2b3f",
   myTeamsQueryId: "62a0c464-1e67-4cfb-9592-a7c5ed9db45c",
   myRCsQueryId: "241a977c-7748-420d-9dcb-eff53e66a43f",
   myRCsTeamFieldId: "ae4ace97-f70c-4132-8fa0-1a0b1a9c7859",
   yearObjId: "6c398e8f-ddde-4e26-b142-353de5b16397",
   GLTransactQueryId: "cb59abf7-3f00-4e05-92f9-7f2db8672274",
   objectByID: "839ac470-8f77-420c-9a30-aeaf0a9f509c",
};

function getMonthList() {
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

   // array.sort();
   return array;
}

module.exports = {
   prepareData: async (AB, { team, rc, fyYear, fyMonth }, req) => {
      const data = {
         title: {
            en: "Budget vs. Actual",
            zh: "预算 VS 实际的",
         },
      };
      // get our passed params
      data.team = team ? team : undefined;
      data.rc = rc ? rc : undefined;
      data.fyYear = fyYear ? fyYear : undefined;
      data.fyMonth = fyMonth ? fyMonth : undefined;

      const myTeams = AB.queryByID(OBJECT_IDS.myTeamsQueryId).model();
      const myRCs = AB.queryByID(OBJECT_IDS.myRCsQueryId).model();
      const yearObj = AB.objectByID(OBJECT_IDS.yearObjId).model();
      const GLTransactObj = AB.queryByID(OBJECT_IDS.GLTransactQueryId).model();
      const projectObj = AB.objectByID(OBJECT_IDS.objectByID).model();

      function sort(a, b) {
         return (a ?? "").toLowerCase().localeCompare((b ?? "").toLowerCase());
      }

      const w = {
         glue: "or",
         rules: [],
      };
      // Start with COA Num 7xxx,8xxx
      w.rules.push(
         {
            key: "69133f41-7c12-44af-bd59-426a723f5e1e",
            rule: "begins_with",
            value: "7",
         },
         {
            key: "69133f41-7c12-44af-bd59-426a723f5e1e",
            rule: "begins_with",
            value: "8",
         }
      );

      if (fyMonth) {
         const year = fyYear || new Date().getFullYear();
         const monthJoin = `FY${year.toString().slice(-2)} M${fyMonth}`;
         w.rules.push({
            key: "549ab4ac-f436-461d-9777-505d6dc1d4f7",
            rule: "contains",
            value: monthJoin,
         });
      }

      const GLTransactData = await GLTransactObj.findAll({
         where: w,
         populate: false,
      });

      const cond = {
         glue: "and",
         rules: [],
      };

      if (team) {
         cond.rules.push({
            key: "Ministry Team",
            rule: "equals",
            value: team,
         });
      }
      if (rc) {
         cond.rules.push({
            key: "RC",
            rule: "equals",
            value: rc,
         });
      }

      const filterGLTransactData = GLTransactData.filter(function (item) {
         let keyIndex = null;

         for (key in item)
            if (key.includes("Project Number")) {
               keyIndex = key;
               break;
            }

         return item[keyIndex];
      });

      cond.rules.push({
         key: "3bb80108-b29b-4141-a84e-646bcbab98bf",
         rule: "in",
         value: GLTransactData.filter(function (item) {
            let keyIndex = null;

            for (const key in item)
               if (key.includes("Project Number")) {
                  keyIndex = key;
                  break;
               }

            return item[keyIndex];
         }).map((e) => {
            let keyIndex = null;

            for (const key in e)
               if (key.includes("Project Number")) {
                  keyIndex = key;
                  break;
               }

            return e[keyIndex];
         }),
      });

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

      cond.rules.push({
         key: "RC",
         rule: "not_in",
         value: FilterOutRC,
      });

      const projectData = await projectObj.findAll({
         where: cond,
         populate: false,
      });

      // Sort
      projectData.sort((a, b) =>
         a.RC.toLowerCase().localeCompare(b.RC.toLowerCase())
      );

      function sumTotalAmount() {
         let sum = 0;

         Object.keys(projectData).forEach((QX) => {
            if ((projectData[QX]["RC"] = projectData[QX]["RC"] ?? [])) {
               sum += projectData[QX]["Income Total Amount"];
            } else {
               projectData[QX]["Income Total Amount"];
            }
         });
         return sum;
      }

      function sumGroupTotalExpense() {
         let sum = 0;
         projectData.forEach((e) => {
            const data = filterGLTransactData.filter((gt) => {
               let keyIndex = null;

               for (const key in gt)
                  if (key.includes("Project Number")) {
                     keyIndex = key;
                     break;
                  }

               return gt[keyIndex] === e["Project Number"];
            })[0];

            const newData = {
               projectBud: e,
               gL: data,
            };

            const sumExpense =
               newData.gL["BASE_OBJECT.Debit"] -
               newData.gL["BASE_OBJECT.Credit"];
            sum += sumExpense;
         });
         return sum;
      }

      function sumGroupTotalbudget() {
         let sum = 0;
         projectData.forEach((e) => {
            const data = filterGLTransactData.filter((gt) => {
               let keyIndex = null;

               for (const key in gt)
                  if (key.includes("Project Number")) {
                     keyIndex = key;
                     break;
                  }

               return gt[keyIndex] === e["Project Number"];
            })[0];

            const newData = {
               projectBud: e,
               gL: data,
            };

            const sumGBudget = newData.projectBud["Income Total Amount"];
            sum += sumGBudget;
         });
         return sum;
      }

      function getTeamLists() {
         const where = {
            glue: "and",
            rules: [],
         };

         if (team) {
            where.rules.push({
               key: "Ministry Team",
               rule: "equals",
               value: team,
            });
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

         where.rules.push({
            key: "RC",
            rule: "not_in",
            value: FilterOutRC,
         });

         GLTransactData.filter(function (item) {
            let keyIndex = null;

            for (key in item)
               if (key.includes("Project Number")) {
                  keyIndex = key;
                  break;
               }

            return item[keyIndex];
         });

         where.rules.push({
            key: "3bb80108-b29b-4141-a84e-646bcbab98bf",
            rule: "in",
            value: GLTransactData.filter(function (item) {
               let keyIndex = null;

               for (const key in item)
                  if (key.includes("Project Number")) {
                     keyIndex = key;
                     break;
                  }

               return item[keyIndex];
            }).map((e) => {
               let keyIndex = null;

               for (const key in e)
                  if (key.includes("Project Number")) {
                     keyIndex = key;
                     break;
                  }

               return e[keyIndex];
            }),
         });

         return new Promise((next, bad) => {
            projectObj
               .findAll({
                  where: where,
                  populate: false,
               })
               .then((list) => {
                  const uniqList = [];
                  (list ?? []).forEach((item) => {
                     if (!uniqList.filter((i) => i["RC"] == item["RC"]).length)
                        uniqList.push(item);
                  });
                  next(uniqList);
               })
               .catch(bad);
         });
      }
      // Load Options
      const [teamsArray, rcs, yearArray] = await Promise.all([
         // Return teams
         myTeams.findAll(
            {
               populate: false,
            },
            { username: req._user.username },
            AB.req
         ),
         // Return myRCs
         myRCs.findAll(
            {
               where: {
                  glue: "and",
                  rules: team
                     ? [
                          {
                             key: OBJECT_IDS.myRCsTeamFieldId,
                             rule: "equals",
                             value: team,
                          },
                       ]
                     : [],
               },
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

      data.teamOptions = (teamsArray ?? [])
         .map((t) => t["BASE_OBJECT.Name"])
         // Remove duplicated Team
         .filter(function (team, ft, tl) {
            return tl.indexOf(team) == ft;
         })
         .sort(sort);

      data.showMTHead = team ? team : "ALL";

      data.rcOptions = (rcs ?? [])
         .map((t) => t["BASE_OBJECT.RC Name"])
         // Remove duplicated RC
         .filter(function (rc, pos, self) {
            return self.indexOf(rc) == pos;
         })
         .sort(sort);

      data.yearOptions = (yearArray ?? []).map((t) => t["FYear"]).sort(sort);

      data.monthOptions = getMonthList(AB);

      data.projectData = projectData;
      data.GLTransactData = GLTransactData;
      data.sumGroupTotalExpense = sumGroupTotalExpense()
         .toFixed(2)
         .replace(/\.0+$/, ""); // If decimal equal .00 will not display
      data.sumPercentTotal = (
         (sumGroupTotalExpense() / sumGroupTotalbudget()) *
         100
      )
         .toFixed(2)
         .replace(/\.0+$/, ""); // If decimal equal .00 will not display
      data.filterGLTransactData = filterGLTransactData;
      data.sumTotalAmount = sumTotalAmount();
      data.getTeamLists = await getTeamLists();
      return data;
   },

   template: () => {
      return fs.readFileSync(
         path.join(__dirname, "templates", "budget-vs-expense.ejs"),
         "utf8"
      );
   },
};
