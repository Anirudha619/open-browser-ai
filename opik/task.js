const { OpenBrowserAI } = require("../agent/openBrowserai");

async function browserEvaluationTask(datasetItem) {
    console.log("datasetItem ", datasetItem)
    const answer = await OpenBrowserAI(datasetItem.input);
    return { output: answer };
}

module.exports = { browserEvaluationTask };
