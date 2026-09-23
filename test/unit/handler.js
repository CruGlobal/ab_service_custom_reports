/**
 * Handler
 * test the interface for our default service handler.
 */
import _ from "lodash";
import { expect } from "chai";
import defaultConfig from "../../config/local.js";
// NOTE: This test was written for a handler with .init() and .fn(); the report handler
// (handlers/report.js) has .fn() but no .init(). Update or skip tests that call Handler.init().
import Handler from "../../handlers/report.js";

describe("custom_reports: handler", function () {
   // Check for proper initialization
   describe("-> missing config", function () {
      it("should return an error when receiving a job request #missingconfig ", function (done) {
         // Handler.init(null) - not available on report handler
         var request = {};
         Handler.fn(request, (err, response) => {
            expect(err).to.exist;
            expect(err).to.have.property("code", "EMISSINGCONFIG");
            expect(response).to.not.exist;
            done();
         });
      });
   });

   // handle a disabled state:
   describe("-> disabled ", function () {
      var disabledConfig = _.clone(defaultConfig, true);
      disabledConfig.enable = false;

      it("should return an error when receiving a job request #disabled ", function (done) {
         Handler.init({ config: disabledConfig });
         var request = {};
         Handler.fn(request, (err, response) => {
            expect(err).to.have.property("code", "EDISABLED");
            expect(response).to.not.exist;
            done();
         });
      });
   });
});
