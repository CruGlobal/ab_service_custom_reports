module.exports = {
   valueFormat: (number) => {
      if (number == null) return;
      else if (!number.toLocaleString) number = parseFloat(number);

      return number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
   },

   /**
    * @method convertFYtoDate
    * Convert FY period to the calendar date
    * 
    * @param {string} fyPeriod - FY## M##
    * @returns 
    */
   convertFYtoDate(fyPeriod) {
      if (!fyPeriod) return;

      const fyVals = fyPeriod.toString().split(' ');
      const fyYear = parseInt(fyVals[0].replace("FY", ""));
      const fyMonth = parseInt(fyVals[1].replace("M", ""));

      // Year
      let year = "20";
      if (fyMonth <= 6) {
         year += (fyYear - 1);
      }
      else  {
         year += fyYear;
      }

      // Month
      let month;
      if (fyMonth <= 6)
         month = fyMonth + 6;
      else
         month = fyMonth - 6;

      return `${year}/${month}`;
   },

   getData: async (req, objectID, cond = {}) => {
      try {
         const results = await req.serviceRequest("appbuilder.model-get", {
            objectID,
            cond,
         });
         return results?.data ?? [];
      } catch (err) {
         req.notify.developer(err, {
            context: "Custom reports utils.getData > appbuilder.model-get",
            jobData: { objectID, cond },
         });
         return [];
      }
   },
};
