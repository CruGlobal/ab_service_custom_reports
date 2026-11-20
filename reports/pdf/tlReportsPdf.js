/**
 * tlReportsPdf
 * Build the PDF files that are emailed to Team Leaders when a fiscal month
 * is closed: "RC Balances" and "Budget vs. Actual".
 *
 * Both builders take the data the web reports already prepare
 * (balance-report.js and budget-vs-expense.js prepareData()) so the PDF shows
 * the same numbers as the screen.
 */
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import utils from "../_utils.js";

const require = createRequire(import.meta.url);
const pdfmake = require("pdfmake");
const Roboto = require("pdfmake/fonts/Roboto");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Roboto (what the reports use on screen) has no Chinese glyphs, and
// pdfmake can not fall back to another font by itself. So every text run
// that holds Chinese characters is set in Noto Sans SC instead.
const CJK = /[⺀-鿿豈-﫿＀-￯]/;

// The reports load nothing from outside: no URLs at all, and only font files
// from disk.
const FONT_DIRS = [
   path.dirname(Roboto.Roboto.normal),
   path.join(__dirname, "..", "fonts"),
];
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((file) =>
   FONT_DIRS.some((dir) => path.resolve(file).startsWith(dir + path.sep)),
);

pdfmake.addFonts(Roboto);
pdfmake.addFonts({
   NotoSansSC: {
      normal: path.join(__dirname, "..", "fonts", "NotoSansSC-Regular.otf"),
      bold: path.join(__dirname, "..", "fonts", "NotoSansSC-Regular.otf"),
      italics: path.join(__dirname, "..", "fonts", "NotoSansSC-Regular.otf"),
      bolditalics: path.join(
         __dirname,
         "..",
         "fonts",
         "NotoSansSC-Regular.otf",
      ),
   },
});

/**
 * @function txt
 * A text node that picks a font that can draw its characters.
 * @param {string} value
 * @param {object} [style] extra pdfmake properties
 * @return {object}
 */
function txt(value, style = {}) {
   const text = value == null ? "" : String(value);
   const node = { text, ...style };
   if (CJK.test(text)) node.font = "NotoSansSC";
   return node;
}

function money(value) {
   return utils.valueFormat(value ?? 0) ?? "0.00";
}

// Same rule as the web page: 0 when either side is 0.
function percent(part, whole) {
   return `${money(part && whole ? (part / whole) * 100 : 0)} %`;
}

function header(title, subtitle, tlName) {
   return [
      txt(title, { style: "title" }),
      txt(subtitle, { style: "subtitle" }),
      txt(`Team Leader: ${tlName ?? ""}`, { style: "meta" }),
   ];
}

function footer(generatedAt) {
   return (currentPage, pageCount) => ({
      columns: [
         txt(`Generated ${generatedAt}`, { style: "footer" }),
         txt(`${currentPage} / ${pageCount}`, {
            style: "footer",
            alignment: "right",
         }),
      ],
      margin: [40, 10, 40, 0],
   });
}

const STYLES = {
   title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
   subtitle: { fontSize: 12, color: "#475466", margin: [0, 0, 0, 2] },
   meta: { fontSize: 10, color: "#475466", margin: [0, 0, 0, 12] },
   th: { bold: true, fillColor: "#D3D3D3" },
   total: { bold: true },
   footer: { fontSize: 8, color: "#888888" },
};

function createBuffer(docDefinition) {
   return pdfmake.createPdf(docDefinition).getBuffer();
}

function today() {
   return new Date().toISOString().slice(0, 10);
}

/**
 * @function buildRcBalancePdf
 * @param {object} opts
 * @param {string} opts.fyPeriod  the closed fiscal month, ex "FY25 M06"
 * @param {string} opts.tlName    the Team Leader's display name
 * @param {array}  opts.items     [{ title: RC Name, value: balance }]
 *                                (viewData.items of balance-report.js)
 * @param {string} [opts.generatedAt]
 * @return {Promise<Buffer>}
 */
export function buildRcBalancePdf({ fyPeriod, tlName, items, generatedAt }) {
   const rows = (items ?? []).map((item) => [
      txt(item.title),
      txt(money(item.value), { alignment: "right" }),
   ]);
   if (!rows.length) {
      rows.push([txt("No data", { colSpan: 2, color: "#888888" }), ""]);
   }

   return createBuffer({
      info: { title: `RC Balances ${fyPeriod}` },
      pageMargins: [40, 40, 40, 50],
      defaultStyle: { font: "Roboto", fontSize: 10 },
      styles: STYLES,
      footer: footer(generatedAt ?? today()),
      content: [
         ...header("RC Balances", `FY Period: ${fyPeriod}`, tlName),
         {
            table: {
               headerRows: 1,
               widths: ["*", 120],
               body: [
                  [
                     txt("Responsibility Centre", { style: "th" }),
                     txt("Balance", { style: "th", alignment: "right" }),
                  ],
                  ...rows,
               ],
            },
            layout: "lightHorizontalLines",
         },
      ],
   });
}

/**
 * @function buildBudgetVsExpensePdf
 * @param {object} opts
 * @param {string} opts.fyYear    ex "FY25"
 * @param {string} opts.tlName
 * @param {object} opts.rcInfos   data.rc_infos of budget-vs-expense.js:
 *                                { RC: { total_budget_amount,
 *                                        total_actual_expense,
 *                                        <project number>: { project_name,
 *                                           budget_amount, actual_expense } } }
 * @param {string} [opts.generatedAt]
 * @return {Promise<Buffer>}
 */
export function buildBudgetVsExpensePdf({
   fyYear,
   tlName,
   rcInfos,
   generatedAt,
}) {
   const body = [
      [
         txt("Project", { style: "th" }),
         txt("Name", { style: "th" }),
         txt("Budget", { style: "th", alignment: "right" }),
         txt("Actual", { style: "th", alignment: "right" }),
         txt("Actual / Budget", { style: "th", alignment: "right" }),
      ],
   ];

   let totalBudget = 0;
   let totalActual = 0;

   const rcNames = Object.keys(rcInfos ?? {}).sort((a, b) =>
      (a ?? "").toLowerCase().localeCompare((b ?? "").toLowerCase()),
   );

   rcNames.forEach((rcName) => {
      const rc = rcInfos[rcName];
      body.push([
         txt(rcName, { colSpan: 5, bold: true, fillColor: "#F0F0F0" }),
         "",
         "",
         "",
         "",
      ]);
      Object.keys(rc)
         .filter(
            (k) => k != "total_budget_amount" && k != "total_actual_expense",
         )
         .sort()
         .forEach((projectNumber) => {
            const p = rc[projectNumber];
            body.push([
               txt(projectNumber),
               txt(p.project_name),
               txt(money(p.budget_amount), { alignment: "right" }),
               txt(money(p.actual_expense), { alignment: "right" }),
               txt(percent(p.actual_expense, p.budget_amount), {
                  alignment: "right",
               }),
            ]);
         });
      body.push([
         txt(`Total ${rcName}`, { colSpan: 2, style: "total" }),
         "",
         txt(money(rc.total_budget_amount), {
            style: "total",
            alignment: "right",
         }),
         txt(money(rc.total_actual_expense), {
            style: "total",
            alignment: "right",
         }),
         txt(percent(rc.total_actual_expense, rc.total_budget_amount), {
            style: "total",
            alignment: "right",
         }),
      ]);
      totalBudget += rc.total_budget_amount ?? 0;
      totalActual += rc.total_actual_expense ?? 0;
   });

   if (!rcNames.length) {
      body.push([
         txt("No data", { colSpan: 5, color: "#888888" }),
         "",
         "",
         "",
         "",
      ]);
   }

   body.push([
      txt("Grand total", { colSpan: 2, style: "total" }),
      "",
      txt(money(totalBudget), { style: "total", alignment: "right" }),
      txt(money(totalActual), { style: "total", alignment: "right" }),
      txt(percent(totalActual, totalBudget), {
         style: "total",
         alignment: "right",
      }),
   ]);

   return createBuffer({
      info: { title: `Budget vs. Actual ${fyYear}` },
      pageMargins: [40, 40, 40, 50],
      defaultStyle: { font: "Roboto", fontSize: 9 },
      styles: STYLES,
      footer: footer(generatedAt ?? today()),
      content: [
         ...header("Budget vs. Actual", `Fiscal Year: ${fyYear}`, tlName),
         {
            table: {
               headerRows: 1,
               widths: [60, "*", 70, 70, 75],
               body,
            },
            layout: "lightHorizontalLines",
         },
      ],
   });
}

export default { buildRcBalancePdf, buildBudgetVsExpensePdf };
