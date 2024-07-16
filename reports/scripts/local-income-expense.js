const title = "<%= title[languageCode] %>",
   domId = "local-income-expense-report",
   frameId = "local-income-expense-report-frame";

const optInstance = new TeamRcFyOptions(title, domId, frameId, {
   includeEnd: true,
   allRC: true,
   filterRC: {
      key: "RC Name",
      rule: "not_contains",
      value: "01 : 100",
   },
   customOptionLabel: <%- convertFYtoDate %>,
});
optInstance.generateUI();
optInstance.getURL = ({ team, rc, start, end }) =>
   `/report/local-income-expense?Teams=${team}&RCs=${rc}&start=${start}&end=${end}`;
