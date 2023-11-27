const AB = parent.AB;
const $$ = parent.AB.Webix.$$;
const dom_id = "local-income-expense-report";

const ids = {
   myTeamsQueryId: "62a0c464-1e67-4cfb-9592-a7c5ed9db45c",
   myRCsQueryId: "241a977c-7748-420d-9dcb-eff53e66a43f",
   myRCsTeamFieldId: "ae4ace97-f70c-4132-8fa0-1a0b1a9c7859",
   allTeamObjId: "138ff828-4579-412b-8b5b-98542d7aa152",
   balanceObjId: "bb9aaf02-3265-4b8c-9d9a-c0b447c2d804",
   monthObjId: "1d63c6ac-011a-4ffd-ae15-97e5e43f2b3f",
   mccFieldId: "eb0f60c3-55cf-40b1-8408-64501f41fa71",

   startViewId: `${dom_id}_start`,
   endViewId: `${dom_id}_end`,
   teamViewId: `${dom_id}_team`,
   // mccViewId: `${dom_id}_mcc`,
   rcViewId: `${dom_id}_rc`,
};

function reportElementId() {
   return `${dom_id}_webix`;
}

async function ui() {
   const report_dom = parent.document.getElementById(dom_id);
   const elem_id = reportElementId();

   if ($$(elem_id) && report_dom.innerHTML) {
      _attachEvents();
      return;
   }

   AB.Webix.ui({
      id: elem_id,
      container: report_dom,
      view: "layout",
      cols: [
         { fillspace: true },
         {
            rows: [
               // Title
               {
                  view: "label",
                  align: "center",
                  label: "<h1><%= title[languageCode] %></h1>",
                  height: 80,
               },
               // Options
               {
                  cols: [
                     { fillspace: true },
                     {
                        id: ids.startViewId,
                        view: "richselect",
                        placeholder: "[Select]",
                        label: "FY Period:",
                        labelWidth: 80,
                        width: 210,
                        options: [],
                     },
                     {
                        id: ids.endViewId,
                        view: "richselect",
                        placeholder: "[Select]",
                        label: " - ",
                        labelWidth: 20,
                        width: 150,
                        options: [],
                     },
                     { fillspace: true },
                  ],
               },
               {
                  cols: [
                     {
                        id: ids.teamViewId,
                        view: "multiselect",
                        placeholder: "[All]",
                        label: "Ministry Team:",
                        labelWidth: 110,
                        width: 300,
                        options: [],
                     },
                     // {
                     //    id: ids.mccViewId,
                     //    view: "multiselect",
                     //    placeholder: "[All]",
                     //    label: "MCC:",
                     //    labelWidth: 50,
                     //    width: 250,
                     //    options: [],
                     // },
                     {
                        id: ids.rcViewId,
                        view: "multiselect",
                        placeholder: "[All]",
                        label: "RC:",
                        labelWidth: 50,
                        width: 250,
                        options: [],
                     },
                  ],
               },
            ],
         },
         { fillspace: true },
      ],
   });

   AB.Webix.extend($$(ids.startViewId), AB.Webix.ProgressBar);
   AB.Webix.extend($$(ids.endViewId), AB.Webix.ProgressBar);
   AB.Webix.extend($$(ids.teamViewId), AB.Webix.ProgressBar);
   AB.Webix.extend($$(ids.rcViewId), AB.Webix.ProgressBar);

   await loadOptions();
   _attachEvents();
}

function _attachEvents() {
   const $start = $$(ids.startViewId),
      $end = $$(ids.endViewId),
      $team = $$(ids.teamViewId),
      // $mcc = $$(ids.mccViewId),
      $rc = $$(ids.rcViewId);

   if ($start.__onChange) $start.detachEvent($start.__onChange);
   if ($end.__onChange) $end.detachEvent($end.__onChange);
   if ($team.__onChange) $team.detachEvent($team.__onChange);
   // if ($mcc.__onChange) $mcc.detachEvent($mcc.__onChange);
   if ($rc.__onChange) $rc.detachEvent($rc.__onChange);

   $start.__onChange = $start.attachEvent("onChange", () => {
      const startVal = $start.getValue();
      const endVal = $end.getValue();

      if (startVal && endVal) refresh();
   });
   $end.__onChange = $end.attachEvent("onChange", () => {
      refresh();
   });
   $team.__onChange = $team.attachEvent("onChange", async () => {
      await _defineRcOptions();
      refresh();
   });
   // $mcc.__onChange = $mcc.attachEvent("onChange", async () => {
   //    const mccVal = $mcc.getValue();

   //    const rcs = [];

   //    mccVal.split(",").forEach((mcc) => {
   //       ($$(reportElementId()).__mccRcs || []).forEach((item) => {
   //          if (item.mcc == mcc && rcs.indexOf(item.rc) < 0) rcs.push(item.rc);
   //       });
   //    });

   //    $rc.setValue(rcs);
   // });
   $rc.__onChange = $rc.attachEvent("onChange", () => {
      refresh();
   });
}

async function loadOptions() {
   const isCoreUser =
      AB.Account.roles((r) => (r.uuid || r) == ids.coreFinanceRoleId).length >
      0;
   const teamsModel = isCoreUser
      ? AB.objectByID(ids.allTeamObjId).model()
      : AB.queryByID(ids.myTeamsQueryId).model();
   const monthObj = AB.objectByID(ids.monthObjId).model();

   _busy();

   // Load Options
   const [teams, months] = await Promise.all([
      // return teams
      teamsModel.findAll({
         populate: false,
      }),
      // return year
      monthObj.findAll({
         populate: false,
      }),
   ]);

   _defineOptions(ids.startViewId, (months && months.data) || [], "FY Per");
   _defineOptions(ids.endViewId, (months && months.data) || [], "FY Per");
   _defineOptions(
      ids.teamViewId,
      (teams && teams.data) || [],
      isCoreUser ? "Name" : "BASE_OBJECT.Name"
   );
   _defineRcOptions();

   _ready();
}

const _defineRcOptions = async () => {
   const $rc = $$(ids.rcViewId);
   // const $mcc = $$(ids.mccViewId);

   // $mcc.blockEvent();
   // $mcc.setValue([]);
   // $mcc.unblockEvent();

   $rc.blockEvent();
   $rc.setValue([]);
   $rc.disable();
   $rc.showProgress({ type: "icon" });

   const Teams = $$(ids.teamViewId).getValue();
   const myRCs = AB.queryByID(ids.myRCsQueryId);
   const myRCsModel = myRCs.model();
   // const mccField = myRCs.fieldByID(ids.mccFieldId);
   const teamList = [];

   (Teams || "").split(",").forEach((team) => {
      teamList.push(team);
   });

   let rcs = await myRCsModel.findAll({
      populate: false,
   });
   $$(reportElementId()).__mccRcs = ((rcs && rcs.data) || []).map((item) => {
      return {
         rc: item["BASE_OBJECT.RC Name"],
         // mcc: item[mccField.columnName],
      };
   });

   // _defineOptions(ids.mccViewId, rcs.data || [], mccField.columnName);
   _defineOptions(ids.rcViewId, $$(reportElementId()).__mccRcs, "rc");

   $rc.unblockEvent();
   $rc.hideProgress();
   $rc.enable();
};

function _defineOptions(webixId, list, propertyName) {
   const options = list
      .map((t) => t[propertyName])
      .filter((team, ft, tl) => team && tl.indexOf(team) == ft);

   $$(webixId).define(
      "options",
      options.sort(_sort).map((opt) => {
         return {
            id: opt,
            value: opt,
         };
      })
   );
}

function _sort(a, b) {
   a = a || "";
   b = b || "";
   return a.toLowerCase().localeCompare(b.toLowerCase());
}

function _busy() {
   $$(ids.startViewId).showProgress({ type: "icon" });
   $$(ids.endViewId).showProgress({ type: "icon" });
   $$(ids.teamViewId).showProgress({ type: "icon" });
   $$(ids.rcViewId).showProgress({ type: "icon" });

   $$(ids.startViewId).disable();
   $$(ids.endViewId).disable();
   $$(ids.teamViewId).disable();
   $$(ids.rcViewId).disable();
}

function _ready() {
   $$(ids.startViewId).hideProgress();
   $$(ids.endViewId).hideProgress();
   $$(ids.teamViewId).hideProgress();
   $$(ids.rcViewId).hideProgress();

   $$(ids.startViewId).enable();
   $$(ids.endViewId).enable();
   $$(ids.teamViewId).enable();
   $$(ids.rcViewId).enable();
}

function refresh() {
   const $start = $$(ids.startViewId),
      $end = $$(ids.endViewId),
      $team = $$(ids.teamViewId),
      $rc = $$(ids.rcViewId);

   const startVal = $start.getValue(),
      endVal = $end.getValue(),
      teamVal = $team.getValue()
         ? $team.getValue()
         : $team
              .getList()
              .data.find({})
              .map((t) => t["Name"] || t["BASE_OBJECT.Name"])
              .join(","),
      rcVal = $rc.getValue();

   const iFrame = parent.document.getElementById(
      "local-income-expense-report-frame"
   );
   iFrame.src = `/report/local-income-expense?Teams=${teamVal}&RCs=${rcVal}&start=${startVal}&end=${endVal}`;
}

ui();
