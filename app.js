//
// custom_reports
// A cool micro service.
//
const AB = require("@digiserve/ab-utils");
const { version } = require("./package");
// Use sentry by default, but can override with env.TELEMETRY_PROVIDER
if (AB.defaults.env("TELEMETRY_PROVIDER", "sentry") == "sentry") {
   AB.telemetry.init("sentry", {
      dsn: AB.defaults.env(
         "SENTRY_DSN",
         "https://a59adbb7e9562d303c88641a431cc230@o144358.ingest.sentry.io/4506143678070784"
      ),
      release: version,
   });
}
var controller = AB.controller("custom_reports");
// controller.afterStartup((req, cb)=>{ return cb(/* err */) });
// controller.beforeShutdown((req, cb)=>{ return cb(/* err */) });
// controller.waitForDB = true; // {bool} wait for mysql to be accessible before .init() is processed
controller.init();
