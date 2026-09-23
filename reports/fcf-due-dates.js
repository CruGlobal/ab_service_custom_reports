import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
   prepareData: async (AB) => {
      // Object Ids
      const ids = {
         persons: "82df020c-695d-4360-8112-567a2f664569",
         visas: "5e78b6b9-e70f-4ea6-ae33-9a8ef1033fcd",
      };
      const data = {};

      const personsObj = AB.objectByID(ids.persons).model();
      const visasObj = AB.objectByID(ids.visas).model();

      let personsArray = await personsObj.find({
         where: {
            glue: "and",
            rules: [
               // Active
               {
                  key: "Status",
                  rule: "equals",
                  value: "Active",
               },
            ],
         },
         populate: true,
         // sort: [
         //    {
         //       key: "49d6fabe-46b1-4306-be61-1b27764c3b1a",
         //       dir: "DESC",
         //    },
         // ],
         limit: 1000,
      });

      // generate object that has current month and following 11 months
      // each month is an object with dates as attributes
      // each date is an object that has due date types as attributes
      // each due date type is an array of labels
      // if this month is October
      // let dueDates = {
      //    "2024" : {
      //       "October": {
      //          10: {
      //             birthday: ["William Duncan"],
      //          },
      //          25: {
      //             birthday: ["Carrie Little"],
      //             "visa renewal": ["Johnny Hausman"],
      //             "visa dependent renewal": ["Karen Hausman"],
      //          },
      //       },
      //       "November": {
      //          // and so on
      //       },
      //    },
      //    "2025": {
      //       // and so on
      //    }
      // };

      const monthNames = [
         "January",
         "February",
         "March",
         "April",
         "May",
         "June",
         "July",
         "August",
         "September",
         "October",
         "November",
         "December",
      ];

      let dueDates = {};
      const d = new Date();

      for (let i = 0; i < monthNames.length; i++) {
         let year = d.getFullYear();
         let monthIndex = d.getMonth() + i;
         if (d.getMonth() + i > 11) {
            year = year + 1;
            monthIndex = monthIndex - 12;
         }
         if (!dueDates[year]) {
            dueDates[year] = {};
         }
         dueDates[year][monthNames[monthIndex]] = {};
      }

      function storeDueDate(dueDates, key, date, label, name) {
         //console.log("storing important dates");
         // loop through dueDates to find the visa exipry
         if (dueDates[key][monthNames[date.getMonth()]]) {
            // we found the month now store the expiry entry on the date
            if (!dueDates[key][monthNames[date.getMonth()]][date.getDate()]) {
               dueDates[key][monthNames[date.getMonth()]][date.getDate()] = {};
            }
            if (
               !dueDates[key][monthNames[date.getMonth()]][date.getDate()][
                  label
               ]
            ) {
               dueDates[key][monthNames[date.getMonth()]][date.getDate()][
                  label
               ] = [];
            }
            dueDates[key][monthNames[date.getMonth()]][date.getDate()][
               label
            ].push(name);
         }
      }

      // loop through person object to get important dates
      for (const person of personsArray) {
         let visaDetails;
         if (person["Person__relation"]) {
            visaDetails = await visasObj.find({
               where: {
                  glue: "and",
                  rules: [
                     // Active
                     {
                        key: "uuid",
                        rule: "equals",
                        value: person["Person__relation"].uuid,
                     },
                  ],
               },
               populate: true,
               limit: 1,
            });
         }
         let birthday,
            visaExpiry,
            visaConsideration,
            visaRecommendation,
            visa6MonthReport,
            workPermitExipry;
         if (person["Birth Date"] != null) {
            birthday = new Date(person["Birth Date"]);
         }
         // get work permit expiry
         if (
            person["PersonProfile__relation"] &&
            person["PersonProfile__relation"][0] &&
            person["PersonProfile__relation"][0]["Date of Expiry"]
         ) {
            workPermitExipry = new Date(
               person["PersonProfile__relation"][0]["Date of Expiry"],
            );
         }
         // get visa information
         if (
            visaDetails &&
            visaDetails[0] &&
            visaDetails[0]["ExpiryDateofExtension__relation"] &&
            visaDetails[0]["ExpiryDateofExtension__relation"][0] &&
            visaDetails[0]["ExpiryDateofExtension__relation"][0][
               "Date of Expiry"
            ]
         ) {
            visaExpiry = new Date(
               visaDetails[0]["ExpiryDateofExtension__relation"][0][
                  "Date of Expiry"
               ],
            );
         }
         if (
            visaDetails &&
            visaDetails[0] &&
            visaDetails[0]["ExpiryDateofExtension__relation"] &&
            visaDetails[0]["ExpiryDateofExtension__relation"][0] &&
            visaDetails[0]["ExpiryDateofExtension__relation"][0][
               "Date of Consideration"
            ]
         ) {
            visaConsideration = new Date(
               visaDetails[0]["ExpiryDateofExtension__relation"][0][
                  "Date of Consideration"
               ],
            );
         }
         if (
            visaDetails &&
            visaDetails[0] &&
            visaDetails[0]["ExpiryDateofExtension__relation"] &&
            visaDetails[0]["ExpiryDateofExtension__relation"][0] &&
            visaDetails[0]["ExpiryDateofExtension__relation"][0][
               "Date of Recommendation"
            ]
         ) {
            visaRecommendation = new Date(
               visaDetails[0]["ExpiryDateofExtension__relation"][0][
                  "Date of Recommendation"
               ],
            );
         }
         if (
            visaDetails &&
            visaDetails[0] &&
            visaDetails[0]["ExpiryDateofExtension__relation"] &&
            visaDetails[0]["ExpiryDateofExtension__relation"][0] &&
            visaDetails[0]["ExpiryDateofExtension__relation"][0][
               "6 Month Report"
            ]
         ) {
            visa6MonthReport = new Date(
               visaDetails[0]["ExpiryDateofExtension__relation"][0][
                  "6 Month Report"
               ],
            );
         }
         for (const [key] of Object.entries(dueDates)) {
            if (birthday) {
               storeDueDate(
                  dueDates,
                  key,
                  birthday,
                  "birthday",
                  person["Full Name"],
               );
            }
            if (visaExpiry != null) {
               if (person["Person Type"] == "Dependent") {
                  storeDueDate(
                     dueDates,
                     key,
                     visaExpiry,
                     "visaExpiryDependent",
                     person["Full Name"],
                  );
               } else {
                  storeDueDate(
                     dueDates,
                     key,
                     visaExpiry,
                     "visaExpiry",
                     person["Full Name"],
                  );
               }
            }
            if (visaConsideration != null) {
               storeDueDate(
                  dueDates,
                  key,
                  visaConsideration,
                  "visaConsideration",
                  person["Full Name"],
               );
            }
            if (visaRecommendation != null) {
               storeDueDate(
                  dueDates,
                  key,
                  visaRecommendation,
                  "visaRecommendation",
                  person["Full Name"],
               );
            }
            if (workPermitExipry != null) {
               storeDueDate(
                  dueDates,
                  key,
                  workPermitExipry,
                  "workPermitExipry",
                  person["Full Name"],
               );
            }
            if (visa6MonthReport != null) {
               storeDueDate(
                  dueDates,
                  key,
                  visa6MonthReport,
                  "visa6MonthReport",
                  person["Full Name"],
               );
            }
         }
      }

      data.dueDates = dueDates;

      return data;
   },
   template: () => {
      return fs.readFileSync(
         path.join(__dirname, "templates", "fcf-due-dates.ejs"),
         "utf8",
      );
   },
};
