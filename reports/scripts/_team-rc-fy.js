const AB = parent.AB;
const $$ = parent.AB.Webix.$$;

class TeamRcFyOptions {
    constructor(title, domId, frameId, options = {}) {
        this._title = title;
        this._domId = domId;
        this._frameId = frameId;
        this._webixId = `${this._domId}_webix`;
        // {
        //      includeEnd: BOOLEAN,
        //      includeMCC: BOOLEAN,
        // }
        this._options = options;
    }

    get ids() {
        const dom_id = this._domId;

        return {
            coreFinanceRoleId: "e32dbd38-2300-4aac-84a9-d2c704bd2a29",

            myTeamsQueryId: "62a0c464-1e67-4cfb-9592-a7c5ed9db45c",
            myRCsQueryId: "241a977c-7748-420d-9dcb-eff53e66a43f",
            myRCsTeamFieldId: "ae4ace97-f70c-4132-8fa0-1a0b1a9c7859",
            allTeamObjId: "138ff828-4579-412b-8b5b-98542d7aa152",
            monthObjId: "1d63c6ac-011a-4ffd-ae15-97e5e43f2b3f",
            mccFieldId: "eb0f60c3-55cf-40b1-8408-64501f41fa71",
            fiscalFieldId: "e696e49e-651e-4eee-960a-095b2b1f7720",

            startViewId: `${dom_id}_start`,
            endViewId: `${dom_id}_end`,
            teamViewId: `${dom_id}_team`,
            mccViewId: `${dom_id}_mcc`,
            rcViewId: `${dom_id}_rc`,
        };
    }

    async generateUI() {
        const report_dom = parent.document.getElementById(this._domId);
        const elem_id = this._webixId;
        const ids = this.ids;

        if ($$(elem_id) && report_dom.innerHTML) {
            this._attachEvents();
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
                            label: `<h1>${this._title}</h1>`,
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
                                this._options.includeEnd ?
                                {
                                    id: ids.endViewId,
                                    view: "richselect",
                                    placeholder: "[Select]",
                                    label: " - ",
                                    labelWidth: 20,
                                    width: 150,
                                    options: [],
                                } : {},
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
                                this._options.includeMCC ?
                                    {
                                        id: ids.mccViewId,
                                        view: "multiselect",
                                        placeholder: "[All]",
                                        label: "MCC:",
                                        labelWidth: 50,
                                        width: 250,
                                        options: [],
                                    } : {},
                                {
                                    id: ids.rcViewId,
                                    view: "multiselect",
                                    placeholder: "[All]",
                                    label: "RC:",
                                    labelWidth: 50,
                                    width: 350,
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
        if ($$(ids.endViewId))
            AB.Webix.extend($$(ids.endViewId), AB.Webix.ProgressBar);
        AB.Webix.extend($$(ids.teamViewId), AB.Webix.ProgressBar);
        if($$(ids.mccViewId))
            AB.Webix.extend($$(ids.mccViewId), AB.Webix.ProgressBar);
        AB.Webix.extend($$(ids.rcViewId), AB.Webix.ProgressBar);

        await this._loadOptions();
        this._attachEvents();
    }

    _attachEvents() {
        const ids = this.ids,
            $start = $$(ids.startViewId),
            $end = this._options.includeEnd ? $$(ids.endViewId) : null,
            $team = $$(ids.teamViewId),
            $mcc = this._options.includeMCC ? $$(ids.mccViewId) : null,
            $rc = $$(ids.rcViewId);

        // Fix: this prevents an error when $end.__onChange is fired
        // before $start.__onChange;
        var startVal, endVal;

        if ($start.__onChange) $start.detachEvent($start.__onChange);
        if ($end?.__onChange) $end.detachEvent($end.__onChange);
        if ($team.__onChange) $team.detachEvent($team.__onChange);
        if ($mcc?.__onChange) $mcc.detachEvent($mcc.__onChange);
        if ($rc.__onChange) $rc.detachEvent($rc.__onChange);

        $start.__onChange = $start.attachEvent("onChange", () => {
            startVal = $start.getValue();
            endVal = $end?.getValue();

            if (startVal && ($end && endVal || !$end)) this.refresh();
            // if (startVal && (($end && endVal) || !$end)) this.refresh();
        });
        if ($end) {
            $end.__onChange = $end.attachEvent("onChange", () => {
                if (startVal && endVal) this.refresh();
            });
        }
        $team.__onChange = $team.attachEvent("onChange", async () => {
            await this._defineRcOptions();
            this.refresh();
        });
        if ($mcc) {
            $mcc.__onChange = $mcc.attachEvent("onChange", async () => {
                const mccVal = $mcc.getValue();

                const rcs = [];

                mccVal.split(",").forEach((mcc) => {
                    ($$(reportElementId()).__mccRcs || []).forEach((item) => {
                        if (item.mcc == mcc && rcs.indexOf(item.rc) < 0) rcs.push(item.rc);
                    });
                });

                $rc.setValue(rcs);
            });
        }
        $rc.__onChange = $rc.attachEvent("onChange", () => {
            this.refresh();
        });
    }

    async _loadOptions() {
        const ids = this.ids;
        const isCoreUser =
            AB.Account.roles((r) => (r.uuid || r) == ids.coreFinanceRoleId).length >
            0;
        const teamsModel = isCoreUser
            ? AB.objectByID(ids.allTeamObjId).model()
            : AB.queryByID(ids.myTeamsQueryId).model();
        const monthObj = AB.objectByID(ids.monthObjId).model();

        this._busy();

        // Load Options
        const [teams, months] = await Promise.all([
            // return teams
            teamsModel.findAll({
                populate: false,
            }),
            // return year
            monthObj.findAll({
                populate: false,
                sort: [{ key: ids.fiscalFieldId, dir: "DESC" }],
            }),
        ]);

        this._defineOptions(ids.startViewId, (months && months.data) || [], "FY Per", false);
        this._defineOptions(ids.endViewId, (months && months.data) || [], "FY Per", false);
        this._defineOptions(
            ids.teamViewId,
            (teams && teams.data) || [],
            isCoreUser ? "Name" : "BASE_OBJECT.Name"
        );
        this._defineRcOptions();

        this._ready();
    }

    async _defineRcOptions() {
        const ids = this.ids;
        const $rc = $$(ids.rcViewId);
        const $mcc = this._options.includeMCC ? $$(ids.mccViewId) : null;

        $mcc?.blockEvent();
        $mcc?.setValue([]);
        $mcc?.unblockEvent();

        $rc.blockEvent();
        $rc.setValue([]);
        $rc.disable();
        $rc.showProgress({ type: "icon" });

        const Teams = $$(ids.teamViewId).getValue();
        const myRCs = AB.queryByID(ids.myRCsQueryId);
        const myRCsModel = myRCs.model();
        const mccField = myRCs.fieldByID(ids.mccFieldId);
        const teamList = [];

        (Teams || "").split(",").forEach((team) => {
            teamList.push(team);
        });

        const rcs = await myRCsModel.findAll({
            populate: false,
        });
        $$(this._webixId).__mccRcs = ((rcs && rcs.data) || []).map((item) => {
            return {
                rc: item["BASE_OBJECT.RC Name"],
                mcc: item[mccField.columnName],
            };
        });

        this._defineOptions(ids.mccViewId, rcs.data || [], mccField.columnName);
        this._defineOptions(ids.rcViewId, $$(this._webixId).__mccRcs, "rc");

        $rc.unblockEvent();
        $rc.hideProgress();
        $rc.enable();
    };

    _defineOptions(webixId, list, propertyName, isSorted = true) {
        if (!$$(webixId)) return;

        let options = list
            .map((t) => t[propertyName])
            .filter((team, ft, tl) => team && tl.indexOf(team) == ft);

        if (isSorted)
            options = options.sort(this._sort);

        $$(webixId).define(
            "options",
            options.map((opt) => {
                return {
                    id: opt,
                    value: opt,
                };
            })
        );
    }

    _sort(a, b) {
        a = a || "";
        b = b || "";
        return a.toLowerCase().localeCompare(b.toLowerCase());
    }

    _busy() {
        const ids = this.ids;

        $$(ids.startViewId).showProgress({ type: "icon" });
        $$(ids.endViewId)?.showProgress({ type: "icon" });
        $$(ids.teamViewId).showProgress({ type: "icon" });
        $$(ids.mccViewId)?.showProgress({ type: "icon" });
        $$(ids.rcViewId).showProgress({ type: "icon" });

        $$(ids.startViewId).disable();
        $$(ids.endViewId)?.disable();
        $$(ids.teamViewId).disable();
        $$(ids.mccViewId)?.disable();
        $$(ids.rcViewId).disable();
    }

    _ready() {
        const ids = this.ids;

        $$(ids.startViewId).hideProgress();
        $$(ids.endViewId)?.hideProgress();
        $$(ids.teamViewId).hideProgress();
        $$(ids.mccViewId)?.hideProgress();
        $$(ids.rcViewId).hideProgress();

        $$(ids.startViewId).enable();
        $$(ids.endViewId)?.enable();
        $$(ids.teamViewId).enable();
        $$(ids.mccViewId)?.enable();
        $$(ids.rcViewId).enable();
    }

    refresh() {
        this._busy();

        const ids = this.ids,
            $start = $$(ids.startViewId),
            $end = $$(ids.endViewId),
            $team = $$(ids.teamViewId),
            $mcc = $$(ids.mccViewId),
            $rc = $$(ids.rcViewId);

        const start = $start.getValue() ?? "",
            end = $end?.getValue() ?? "",
            team = $team.getValue()
                ? $team.getValue()
                : $team
                    .getList()
                    .data.find({})
                    .map((t) => t["Name"] || t["BASE_OBJECT.Name"])
                    .join(","),
            mcc = $mcc?.getValue() ?? "",
            rc = $rc.getValue() ?? "";

        const iFrame = parent.document.getElementById(this._frameId);

        iFrame.addEventListener("load", () => { this._ready(); }, { once: true });
        iFrame.src = this.getURL({ start, end, team, mcc, rc });
    }
};
