module.exports = {
   valueFormat: (number) => {
      if (number == null) return;
      else if (!number.toLocaleString) number = parseFloat(number);

      return number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
