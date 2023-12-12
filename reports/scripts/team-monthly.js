const title = "<%= title[languageCode] %>",
   domId = "team-monthly-option",
   frameId = "team-monthly-frame";

const optInstance = new TeamRcFyOptions(title, domId, frameId);
optInstance.generateUI();
optInstance.getURL = (teamVal, rcVal, startVal, endVal) =>
   `/report/team-monthly?Teams=${teamVal}&RCs=${rcVal}&start=${startVal}&end=${endVal}`;
