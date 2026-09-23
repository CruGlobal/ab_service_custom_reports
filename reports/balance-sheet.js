import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import utils from "./_utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OBJECT_IDS = {
   FY_MONTH: "1d63c6ac-011a-4ffd-ae15-97e5e43f2b3f",
   ACCOUNT: "c1a3642d-3863-4eb7-ac98-3dd18de3e683",
   BALANCE: "bb9aaf02-3265-4b8c-9d9a-c0b447c2d804",
};

const ACCOUNT_CATEGORIES = {
   Assets: "1585806356532",
   Liabilities: "1585806356570",
   Equity: "1585806356643",
   Expenses: "1585806356789",
   Income: "1590392412833",
};

const ITEM_TYPES = {
   Header: "header",
   Total: "total",
   TotalSecondary: "secondary-total",
   TotalTertiary: "tertiary-total",
};

function GetViewDataBalanceSheet(rc, fyMonth) {
   return {
      fnValueFormat: utils.valueFormat,
      title: {
         en: "Balance Sheet",
         zh: "",
      },
      rc: rc,
      rcOptions: [],
      fyPeriod: fyMonth,
      fyOptions: [],
      items: [
         {
            title: "ASSETS",
            type: ITEM_TYPES.Header,
         },
         {
            id: 11,
            title: "11000 - Banks and Cash",
            type: ITEM_TYPES.TotalTertiary,
            value: 0,
         },
         {
            title: "Other Assets",
            type: ITEM_TYPES.Header,
         },
         {
            id: 12,
            title: "1200 - Receivables",
            value: 0,
         },
         {
            id: 14,
            title: "1400 - Products for Sale",
            value: 0,
         },
         {
            id: 15,
            title: "1500 - Advances and other current assets",
            value: 0,
         },
         {
            id: 16,
            title: "1600 - Investments",
            value: 0,
         },
         {
            id: "Sum12",
            title: "Total Other Asset",
            type: ITEM_TYPES.TotalTertiary,
            value: (items) => {
               let val12 = items.find((x) => x.id == 12).value || 0;
               let val14 = items.find((x) => x.id == 14).value || 0;
               let val15 = items.find((x) => x.id == 15).value || 0;
               let val16 = items.find((x) => x.id == 16).value || 0;

               return val12 + val14 + val15 + val16;
            },
         },
         {
            title: "Fixed Assets",
            type: ITEM_TYPES.Header,
         },
         {
            id: 17,
            title: "1700 - Fixed assets and depreciation",
            type: ITEM_TYPES.TotalTertiary,
            value: 0,
         },
         {
            title: "Total Assets",
            type: ITEM_TYPES.Total,
            value: (items) => {
               let val11 = items.find((x) => x.id == 11).value || 0;
               let valSum12 =
                  items.find((x) => x.id == "Sum12").value(items) || 0;
               let val17 = items.find((x) => x.id == 17).value || 0;

               return val11 + valSum12 + val17;
            },
         },
         {
            title: "LIABILITIES",
            type: ITEM_TYPES.Header,
         },
         {
            id: 21,
            title: "2100 - Payroll items payable",
            value: 0,
         },
         {
            id: 22,
            title: "2200 - Payables",
            value: 0,
         },
         {
            id: 26,
            title: "2600 - Other Current Liabilities",
            value: 0,
         },
         {
            id: 27,
            title: "2700 - Long-term liabilities",
            value: 0,
         },
         {
            id: "SumLiabilities",
            title: "Total Current Liabilities",
            type: ITEM_TYPES.TotalSecondary,
            value: (items) => {
               let val21 = items.find((x) => x.id == 21).value || 0;
               let val22 = items.find((x) => x.id == 22).value || 0;
               let val26 = items.find((x) => x.id == 26).value || 0;
               let val27 = items.find((x) => x.id == 27).value || 0;

               return val21 + val22 + val26 + val27;
            },
         },
         {
            title: "FUND BALANCE",
            type: ITEM_TYPES.Header,
         },
         {
            id: 35,
            title: "3500 - Beginning fund balance",
            value: 0,
         },
         {
            id: 39,
            title: "3900 - Net income (loss) year-to-date",
            value: 0,
         },
         {
            id: "SumFundBalance",
            title: "Total Fund Balance",
            type: ITEM_TYPES.TotalSecondary,
            value: (items) => {
               let val35 = items.find((x) => x.id == 35).value || 0;
               let val39 = items.find((x) => x.id == 39).value || 0;

               return val35 + val39;
            },
         },
         {
            title: "Total Liabilities and Fund Balance",
            type: ITEM_TYPES.Total,
            value: (items) => {
               let valSumLiabilities =
                  items.find((x) => x.id == "SumLiabilities").value(items) || 0;
               let valSumFundBalance =
                  items.find((x) => x.id == "SumFundBalance").value(items) || 0;

               return valSumLiabilities + valSumFundBalance;
            },
         },
      ],
   };
}

function GetFYMonths(AB) {
   const objFYMonth = AB.objectByID(OBJECT_IDS.FY_MONTH).model();

   if (objFYMonth == null) {
      console.error("null value");
      return Promise.resolve([]);
   }

   return new Promise((next, bad) => {
      objFYMonth
         .findAll({
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
         })
         .then((list) => {
            next(list.map((item) => item["FY Per"]));
         })
         .catch(bad);
   });
}

function GetBalances(AB, rc, fyPeriod, extraRules = []) {
   const objBalance = AB.objectByID(OBJECT_IDS.BALANCE).model();

   if (objBalance == null || fyPeriod == null) {
      return Promise.resolve([]);
   }

   let cond = {
      glue: "and",
      rules: [],
   };

   if (rc) {
      cond.rules.push({
         key: "RC Code",
         rule: "equals",
         value: rc,
      });
   }

   if (fyPeriod) {
      cond.rules.push({
         key: "FY Period",
         rule: "equals",
         value: fyPeriod,
      });
   }

   (extraRules || []).forEach((r) => {
      if (!r) return;

      cond.rules.push(r);
   });

   return new Promise((next, bad) => {
      objBalance
         .findAll({
            where: cond,
            populate: true,
         })
         .then((list) => {
            next(list);
         })
         .catch(bad);
   });
}

export default {
   // GET: /template/balanceSheet
   prepareData: async (AB, { rc, fyper }) => {
      console.log("prepareData in balance-sheet is running");

      var data = GetViewDataBalanceSheet(rc || null, fyper);

      data.fyOptions = await GetFYMonths(AB);

      let list = await GetBalances(
         AB,
         data.rc,
         data.fyPeriod || data.fyOptions[0],
      );

      list.forEach((bl) => {
         if (
            bl == null ||
            bl.COANum__relation == null ||
            bl.COANum__relation.Category == null
         ) {
            return;
         }

         const category = bl.COANum__relation.Category.toString();
         if (
            category == ACCOUNT_CATEGORIES.Assets ||
            category == ACCOUNT_CATEGORIES.Liabilities ||
            category == ACCOUNT_CATEGORIES.Equity
         ) {
            let accNum = bl.COANum__relation["Acct Num"].toString();

            data.items.forEach((reportItem) => {
               if (reportItem.id == null || isNaN(reportItem.id)) return;

               if (accNum.indexOf(reportItem.id) == 0) {
                  reportItem.value += parseFloat(bl["Running Balance"]);
               }
            });
         }
      });
      return data;
   },
   template: () => {
      return fs.readFileSync(
         path.join(__dirname, "templates", "balance-sheet.ejs"),
         "utf8",
      );
   },
};
