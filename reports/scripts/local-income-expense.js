const title = "<%= title[languageCode] %>",
   domId = "local-income-expense-report",
   frameId = "local-income-expense-report-frame";

const optInstance = new TeamRcFyOptions(title, domId, frameId, { includeEnd: true, allRC: true });
optInstance.generateUI();
optInstance.getURL = ({ team, rc, start, end }) =>
   `/report/local-income-expense?Teams=${team}&RCs=${rc}&start=${start}&end=${end}`;
