const title = "<%= title[languageCode] %>",
   domId = "team-monthly-option",
   frameId = "team-monthly-frame";

const optInstance = new TeamRcFyOptions(title, domId, frameId, {
   customOptionLabel: <%- fnConvertFYtoDate %>,
});
optInstance.generateUI();
optInstance.getURL = ({ start, team, rc }) =>
   `/report/team-monthly?Teams=${team}&RCs=${rc}&fyper=${start}`;
