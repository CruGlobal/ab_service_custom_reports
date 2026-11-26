/**
 * tlReportsEmail
 * Email Team Leaders (TL) the "RC Balances" and "Budget vs. Actual" reports
 * of a closed fiscal month, as two PDF attachments. Used by
 * handlers/tl-reports-email-all.js. This is a helper, not a web report.
 *
 * The data comes from the same prepareData() the web reports use, run as the
 * TL, for each team the TL leads, so the numbers match what the TL sees on
 * screen for those teams.
 */
import balanceReport from "./balance-report.js";
import budgetVsExpense from "./budget-vs-expense.js";
import {
   buildRcBalancePdf,
   buildBudgetVsExpensePdf,
} from "./pdf/tlReportsPdf.js";

const DEFAULT_FROM = "noreply@l2d.biz";
const TEAM_LEADER_ROLE = "Team Leader";

const IDS = {
   Assignments: "79b4558c-93c1-4c07-8a9a-bba574912e07",
   AssignmentPerson: "4cc3f5a5-c235-45f6-9a7c-80570075a76c", // personTeam
   AssignmentRole: "3ed9a322-e124-4660-9fad-ebb2a0ace882", // Role195
   // An assignment links to its team through one of these two fields
   // (staging fills "Ministry Team"; some tenants only have "Ministry Teams").
   AssignmentTeam: "59d32581-a30d-4904-abc8-2fbe246582ff", // Ministry Team
   AssignmentTeams: "396b8b01-8e11-49f8-b883-4052d9a96ae6", // Ministry Teams
   AssignmentStart: "a4a3dc69-5afd-42eb-9758-bccee1d2a954",
   AssignmentEnd: "8e86d1dd-a67d-405a-806c-79879ca73513",
   PersonSystemAccess: "fbded672-b647-4d95-a7f6-92f38076c626",
};

function one(value) {
   return Array.isArray(value) ? value[0] : value;
}

// Role "Label" is a multilingual field. A role is a Team Leader when its
// Label in any language is "Team Leader". Role rows are tenant data, so their
// uuids differ between servers and can not be used here.
function isTeamLeaderRole(role) {
   if (!role) return false;
   if (typeof role != "object") return role == TEAM_LEADER_ROLE;
   let translations = role.translations;
   if (typeof translations == "string") {
      try {
         translations = JSON.parse(translations);
      } catch {
         translations = [];
      }
   }
   return [role.Label, ...(translations ?? []).map((t) => t?.Label)].some(
      (label) => label?.trim() == TEAM_LEADER_ROLE,
   );
}

/**
 * @function loadTeamLeaders
 * Every user that has a current assignment with the role "Team Leader",
 * with the names of the Ministry Teams they lead.
 * @param {ABFactory} AB
 * @return {Promise<Map<string, string[]>>}  username => team names (sorted)
 */
export async function loadTeamLeaders(AB) {
   const Assignments = AB.objectByID(IDS.Assignments);
   const fPerson = Assignments.fieldByID(IDS.AssignmentPerson);
   const fRole = Assignments.fieldByID(IDS.AssignmentRole);
   const teamFields = [
      Assignments.fieldByID(IDS.AssignmentTeam),
      Assignments.fieldByID(IDS.AssignmentTeams),
   ].filter((f) => f);
   const fStart = Assignments.fieldByID(IDS.AssignmentStart);
   const fEnd = Assignments.fieldByID(IDS.AssignmentEnd);
   const fAccess = AB.objectByID(fPerson.settings.linkObject)?.fieldByID(
      IDS.PersonSystemAccess,
   );

   const rows = await Assignments.model().findAll({ populate: true });
   const now = new Date();
   const leaders = new Map();

   (rows ?? []).forEach((row) => {
      const role = one(row[fRole.relationName()]);
      if (!isTeamLeaderRole(role)) return;

      // only current assignments: started, and not ended
      const start = fStart ? row[fStart.columnName] : null;
      if (start && new Date(start) > now) return;
      const end = row[fEnd.columnName];
      if (end && new Date(end) < now) return;

      const person = one(row[fPerson.relationName()]);
      const access = one(person?.[fAccess?.columnName ?? "System Access"]);
      const username = access?.username ?? access?.id ?? access;
      if (!username) return;

      let teamName = null;
      for (const f of teamFields) {
         const team = one(row[f.relationName()]);
         if (team?.Name) {
            teamName = team.Name;
            break;
         }
      }
      if (!teamName) return;

      const teams = leaders.get(username) ?? [];
      if (!teams.includes(teamName)) teams.push(teamName);
      leaders.set(username, teams);
   });

   leaders.forEach((teams) => teams.sort());
   return leaders;
}

function mergeRcBalanceItems(results) {
   const byTitle = {};
   results.forEach((viewData) => {
      (viewData?.items ?? []).forEach((item) => {
         byTitle[item.title] = byTitle[item.title] ?? item;
      });
   });
   return Object.values(byTitle).sort((a, b) =>
      (a.title ?? "")
         .toLowerCase()
         .localeCompare((b.title ?? "").toLowerCase()),
   );
}

function mergeRcInfos(results) {
   const rcInfos = {};
   results.forEach((data) => {
      Object.assign(rcInfos, data?.rc_infos ?? {});
   });
   return rcInfos;
}

function emailHtml(fyPeriod) {
   return [
      `<p>Dear Team Leader,</p>`,
      `<p>The fiscal month ${fyPeriod} is closed. Attached are your team's`,
      ` RC Balances and Budget vs. Actual reports.</p>`,
      `<p>团队负责人您好，</p>`,
      `<p>财务月份 ${fyPeriod} 已关账。附件是您团队的 RC 余额报告和预算与实际支出报告。</p>`,
   ].join("");
}

function fileSafe(text) {
   return String(text ?? "").replace(/[^A-Za-z0-9_-]+/g, "-");
}

function sendEmail(req, email) {
   return new Promise((resolve, reject) => {
      req.serviceRequest("notification_email.email", { email }, (err) =>
         err ? reject(err) : resolve(),
      );
   });
}

/**
 * @function sendTlReports
 * Build both PDFs for one Team Leader and email them.
 * Never throws: problems come back as { status: "skipped", reason }.
 * @param {ABFactory} AB
 * @param {ABUtils.reqService} req
 * @param {object} opts
 * @param {string} opts.username  the TL's username
 * @param {string[]} opts.teams   the teams the TL leads
 * @param {string} opts.fyPeriod  the closed fiscal month, ex "FY25 M06"
 * @param {string} [opts.sendTo]  send here instead of the TL (testing)
 * @param {string} [opts.from]
 * @return {Promise<object>}
 */
export async function sendTlReports(AB, req, opts) {
   const { username, teams, fyPeriod } = opts;
   const skip = (reason) => {
      req.log(`tl-reports-email: skipped ${username}: ${reason}`);
      return { status: "skipped", username, reason };
   };

   try {
      const users = await req.retry(() =>
         AB.objectUser().model().find({ where: { username }, populate: false }),
      );
      const user = users?.[0];
      if (!user) return skip("user not found");

      const to = opts.sendTo || user.email;
      if (!to) return skip("no email");

      if (!teams?.length) return skip("not a Team Leader of any team");

      // Run the reports as the TL. SITE_ROLE is left empty on purpose: the
      // email holds only the teams the TL leads, even for a TL who is also
      // in Core Finance.
      const tlReq = Object.create(req);
      tlReq._user = { ...user, SITE_ROLE: [] };

      const fyYear = fyPeriod.split(" ")[0];

      const balanceResults = [];
      const budgetResults = [];
      for (const team of teams) {
         balanceResults.push(
            await balanceReport.prepareData(
               AB,
               { rc: "team", team, fyper: fyPeriod },
               tlReq,
            ),
         );
         budgetResults.push(
            await budgetVsExpense.prepareData(AB, { team, fyYear }, tlReq),
         );
      }

      const items = mergeRcBalanceItems(balanceResults);
      const rcInfos = mergeRcInfos(budgetResults);
      if (!items.length && !Object.keys(rcInfos).length) {
         return skip("no RC data");
      }

      const tlName = user.username;
      const [rcBalancePdf, budgetPdf] = await Promise.all([
         buildRcBalancePdf({ fyPeriod, tlName, items }),
         buildBudgetVsExpensePdf({ fyYear, tlName, rcInfos }),
      ]);

      await sendEmail(req, {
         to: [to],
         from: opts.from || DEFAULT_FROM,
         subject: `Team Finance Reports ${fyPeriod} / 团队财务报告 ${fyPeriod}`,
         html: emailHtml(fyPeriod),
         attachments: [
            {
               filename: `RC-Balance-${fileSafe(fyPeriod)}.pdf`,
               content: rcBalancePdf.toString("base64"),
               encoding: "base64",
               contentType: "application/pdf",
            },
            {
               filename: `Budget-vs-Expense-${fileSafe(fyYear)}.pdf`,
               content: budgetPdf.toString("base64"),
               encoding: "base64",
               contentType: "application/pdf",
            },
         ],
      });

      return { status: "sent", username, to, teams };
   } catch (err) {
      return skip(`error: ${err?.message ?? err}`);
   }
}

/**
 * @function sendAllTlReports
 * Email every Team Leader in leaders, one after another.
 * @param {ABFactory} AB
 * @param {ABUtils.reqService} req
 * @param {Map<string, string[]>} leaders  from loadTeamLeaders()
 * @param {object} opts  { fyPeriod, sendTo?, from? } (see sendTlReports())
 * @return {Promise<{sent: number, skipped: number}>}
 */
export async function sendAllTlReports(AB, req, leaders, opts) {
   let sent = 0;
   let skipped = 0;
   for (const [username, teams] of leaders) {
      const result = await sendTlReports(AB, req, { ...opts, username, teams });
      if (result.status == "sent") sent++;
      else skipped++;
   }
   return { sent, skipped };
}
