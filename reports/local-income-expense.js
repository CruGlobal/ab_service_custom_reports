/**
 * localIncomeExpense
 *
 *
 */
const fs = require("fs");
const path = require("path");

module.exports = {
   // GET: /report/local-income-expense
   // get the local and expense income and calculate the sums
   prepareData: async (AB, { Teams, RCs, start, end }, req) => {
      const ids = {
         myTeamsQueryId: "62a0c464-1e67-4cfb-9592-a7c5ed9db45c",
         myRCsQueryId: "241a977c-7748-420d-9dcb-eff53e66a43f",
         myRCsTeamFieldId: "ae4ace97-f70c-4132-8fa0-1a0b1a9c7859",
         balanceObjId: "bb9aaf02-3265-4b8c-9d9a-c0b447c2d804",
      };

      // Our data object
      var data = {
         title: {
            en: "Local Income vs Expense",
            zh: "本地收入VS 支出",
         },
         rc: RCs,
         total: {
            en: "Total",
            zh: "总额",
         },
         category: {
            en: "Category",
            zh: "类别",
         },
         categories: [
            {
               parent: 4111,
               type: "Local Income",
               translation: {
                  en: "Local Income ",
                  zh: "本地收入",
               },
               sub: [
                  {
                     id: 41113,
                     translation: {
                        en: "General Contribution Local From Ch",
                        zh: "本地收到给事工的捐款-从国内收到",
                     },
                  },
                  {
                     id: 41114,
                     translation: {
                        en: "General Contribution Local From Oversea",
                        zh: "本地收到给事工的捐款-收到海外的汇款",
                     },
                  },
               ],
            },
            {
               parent: 7,
               type: "Expenses",
               translation: {
                  en: "Expenses ",
                  zh: "支出",
               },
               sub: [
                  {
                     id: 71,
                     translation: {
                        en: "Personnel expenses",
                        zh: "工资/福利",
                     },
                  },
                  {
                     id: 72,
                     translation: {
                        en: "Conferences and meetings",
                        zh: "大会和会议费用",
                     },
                  },
                  {
                     id: 75,
                     translation: {
                        en: "Travel and transportation",
                        zh: "差旅费",
                     },
                  },
                  {
                     id: 81,
                     translation: {
                        en: "Supplies and non-capitalized equipment",
                        zh: "设备及维修保养",
                     },
                  },
                  {
                     id: 82,
                     translation: {
                        en: "Communications",
                        zh: "电话和通信",
                     },
                  },
                  {
                     id: 84,
                     translation: {
                        en: "Professional services",
                        zh: "专业费用",
                     },
                  },
                  {
                     id: 86,
                     translation: {
                        en: "Capital expenses",
                        zh: "固定资产支出",
                     },
                  },
                  {
                     id: 87,
                     translation: {
                        en: "Facilities",
                        zh: "设施费用",
                     },
                  },
                  {
                     id: 89,
                     translation: {
                        en: "Other expenses",
                        zh: "其他费用",
                     },
                  },
               ],
            },
         ],
      };

      function accountInCategory(account, category) {
         const accountDigits = account?.toString().split("") ?? [];
         const categoryDigits = category?.toString().split("") ?? [];
         let match = true;
         categoryDigits.forEach((digit, i) => {
            if (digit !== accountDigits[i]) {
               match = false;
            }
         });
         return match;
      }

      function categorySum(category, balances, propertyName) {
         const filtered = balances.filter((bal) =>
            accountInCategory(bal["COA Num"], category)
         );
         if (filtered.length > 0) {
            return filtered
               .map((i) => i[propertyName])
               .reduce((a, b) => (100 * a + 100 * b) / 100);
         } else {
            return 0;
         }
      }

      const myRCs = AB.queryByID(ids.myRCsQueryId).model();
      const balanceObj = AB.objectByID(ids.balanceObjId).model();

      // Load Report Data
      const where = {
         glue: "and",
         rules: [],
      };

      // Select specified RCs
      if (RCs) {
         const rcCond = {
            glue: "or",
            rules: [],
         };

         RCs.split(",").forEach((rcVal) => {
            if (!rcVal) return;
            rcCond.rules.push({
               key: "RC Code",
               rule: "equals",
               value: rcVal.trim(),
            });
         });

         where.rules.push(rcCond);
      }
      // All of RC of selected TEAMs
      else {
         const teamCond = {
            glue: "or",
            rules: [],
         };

         (Teams ?? "").split(",").forEach((team) => {
            teamCond.rules.push({
               key: ids.myRCsTeamFieldId,
               rule: "equals",
               value: team,
            });
         });

         const rcs = (await myRCs.findAll(
            {
               where: teamCond,
               populate: false,
            },
            { username: req._user.username },
            AB.req
         )).map((t) => t["BASE_OBJECT.RC Name"]);

         if (rcs?.length) {
            where.rules.push({
               key: "RC Code",
               rule: "in",
               value: rcs,
            });
         }
      }

      const fyValues = [start, end].sort();
      const fyConds = {
         glue: "or",
         rules: [
            {
               key: "FY Period",
               rule: "contains",
               value: fyValues[0],
            },
            {
               key: "FY Period",
               rule: "contains",
               value: fyValues[1],
            }
         ],
      };
      where.rules.push(fyConds);

      let records = [];
      if (start && end && where?.rules?.length) {
         records = await balanceObj.findAll(
            {
               where: where,
               populate: false,
            },
            { username: req._user.username },
            AB.req
         );
      }

      const running_records = records.filter((rec) => rec["FY Period"] == fyValues[1]);
      const starting_records = records.filter((rec) => rec["FY Period"] == fyValues[0]);

      data.categories.forEach((cat) => {
         let catSum = 0;
         cat.sub.forEach((sub) => {
            let runningSum = categorySum(sub.id, running_records, "Running Balance");
            let startingSum = categorySum(sub.id, starting_records, "Starting Balance");
            sub.sum = runningSum - startingSum;

            catSum = (100 * sub.sum + 100 * catSum) / 100;
         });
         cat.sum = catSum.toFixed(2);
      });

      // Local Income / Expenses
      let localIncomeSum = data.categories[0].sum;
      let expensesSum = data.categories[1].sum;

      data.localPercentage = Math.floor((localIncomeSum / expensesSum) * 100);

      // if either number is zero, percentage won't calculate correctly
      if (expensesSum == 0) {
         // 100 of expenses are covered by local
         data.localPercentage = 0;
      } else if (localIncomeSum == 0) {
         // there is no local income, so so no expenses are covered
         data.localPercentage = 0;
      }

      return data;
   },
   template: () => {
      return fs.readFileSync(
         path.join(__dirname, "templates", "local-income-expense.ejs"),
         "utf8"
      );
   },
};
