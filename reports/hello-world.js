const path = require("path");
const fs = require("fs");
module.exports = {
   prepareData: async (AB, { input }) => {
      input = input || "no input.";
      const data = {
         promiseOutput: "no data",
      };

      // A simple promise that resolves after a given time
      const timeOut = (t) => {
         return new Promise((resolve, reject) => {
            setTimeout(() => {
               resolve(`Completed in ${t}`);
            }, t);
         });
      };

      // Resolving a normal promise.
      timeOut(1000).then((result) => console.log(result)); // Completed in 1000

      // Promise.all
      await Promise.all([timeOut(1000), timeOut(2000)]).then(
         (result) => (data.promiseOutput = result),
         // console.log(result)
      ); // ["Completed in 1000", "Completed in 2000"]
      console.log(AB);
      return {
         output: `earth ${data.promiseOutput}`,
         output1: `input: ${input} user: ${AB.id}`,
      };
   },
   template: () => {
      return fs.readFileSync(
         path.join(__dirname, "templates", "hello-world.ejs"),
         "utf8",
      );
   },
};
