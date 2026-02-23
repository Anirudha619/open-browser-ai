
const fs = require('fs')
function writeToFile(filename, content) {
  fs.writeFileSync(filename, content, "utf-8");
  if(process.env.ENABLE_LOGS)console.log("File saved:", filename);
}

function saveToJsonFile(filename, data) {
  try {
    const jsonData = JSON.stringify(data, null, 2); 
    fs.writeFileSync(filename, jsonData, "utf-8");
    if(process.env.ENABLE_LOGS)console.log(`Data successfully saved to ${filename}`);
  } catch (error) {
    console.error("Error writing JSON file:", error);
  }
}

function saveToTxtFile(filename, data) {
  try {
    fs.writeFileSync(filename, data, "utf-8");
    if(process.env.ENABLE_LOGS)console.log(`Data successfully saved to ${filename}`);
  } catch (error) {
    console.error("Error writing JSON file:", error);
  }
}

module.exports = {
    writeToFile, 
    saveToJsonFile,
    saveToTxtFile
}
