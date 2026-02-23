

function createPrompt(pageData, task, information_gather_so_far, previousTaskOutcome, summary, current_tab, tabSummary, privateData, currentUrl, actionsLog, _step, isChunkActionAvailable, useVision = false, browserState = null ) {
    

  // TODO: use privateData

    
  const firstStep = `So far you haven't done any actions to solve the main task. the browser has 1 tab open.`

  const currentState = 
  `So far you have done these actions : ${actionsLog}
  So far you have gathered this much relevent data to answer / solve the main goal: ${information_gather_so_far}
  To solve main goal, you tried to do this things: ${summary}.
  Check the last thing you were trying to do is done or not by looking at the current page data given in the message.
  `

  const state = _step == 1 ? firstStep : currentState

  // vision section
  const needVision= "if you think you need scrrenshot of this page then you can use the 'screenshot' action."

  function getUTCTime() {
    return new Date().toISOString();
  }

// Add tab information to prompt
  const tabInfo = browserState ? `
  TAB INFORMATION:
  Total tabs open: ${browserState.totalTabs}
  Current active tab: ${browserState.activeTabNumber}
  Tab details:
  ${browserState.pages.map(tab => `Tab ${tab.number}: ${tab.url}`).join('\n')}
  ` : `  Current tab: ${current_tab}`;

  const prompt =
  `You are a browser automation agent.
  This is Your Main Task: ${task}

  ${state}

  ${privateData} – optional credentials (private key strings)

  Todays date Time : ${getUTCTime()}

  Page data format
  Page data is in csv. (html format is converted to csv)

  id,text,href,role,ariaLabel,interactive

  where id is element ID, text is visible text, interactive (0 or 1) 0 means no interactive and 1 means interactive,

  example: 
  id,text,href,role,ariaLabel,interactive
  0,"About","","","",1
  1,"Gmail","https://mail.google.com/mail/&ogbl","","Gmail ",1
  example ends here.


  ${tabInfo}
  The current browser Tab ${current_tab} page data you can interact with :(Page data starts here)

  ${pageData} 
  (Page data ends here).

  Valid action schemas (JSON, no variations)

  { "type":"Click","elementId":"number","tabOnWhichToPerform": "number" }
  { "type":"Type","elementId":"number","text":"string","privateKey":"string""tabOnWhichToPerform": "number" }   // privateKey optional
  { "type":"Navigate","url":"string","tabOnWhichToPerform": "number" }
  { "type":"OpenTab","url":"string" }
  ${isChunkActionAvailable  ? '{ "type":"getPageDataChunk","chunk":"number" }' : "" }
  ${useVision ? '{ "type":"Screenshot","elementId":"number" }' : ""}

  Required response JSON
  {
      "summary":"string", // what you are trying to do with next action based on what you have done so far. (keep it really short and on point. use less tokens.). keep it in past tense.
      "infoCollected": "string", // All info collected so far to help solve the task (keep it really short and on point. use less tokens.). so everyti time you just have to add new info if required else keep it as is (add t info here only if its relevent to solve the main goal and not there already in  gathered relevent data else keep it empty string).
      "action": { }, / one of the action schemas above
      "status":"in_progress" | "completed" | "failed", 
      "answer":"string" //final answer ONLY if status is completed else empty
  }

${guidePrompt}

  Critical rules

  Only interact with interactive elements (input, button, select, textarea, a).
  Read all elements for context.
  Produce exactly one action per response.
  If an action fails, retry it before moving on.
  Handle CAPTCHAs automatically.
  Use Google search (Navigate with Google URL) when web research is required.
  Strict formatting
  make sure to add "tabOnWhichToPerform" when usign type action, navigate action and click action.
  make sure to add "elementId" when using  type action and click action.
  ${needVision}
  No narrative text, comments, or deviation from the JSON schema.
  No additional fields.
  Output only the JSON defined above.DO NOT include anything outside the JSON object. No comments, explanations, or extra keys.` 

    return prompt;
}


const guidePrompt = `You are a browser-based research agent.

When the user’s query or task is related to social and community impact — especially topics like:

finding volunteer programs

community initiatives

NGOs, social causes, environmental or educational programs

follow these steps:

Search on Google for relevant and active volunteer or community programs related to the user’s query.

Identify 2 genuine opportunities that are:

currently active or upcoming

relevant to the user’s intent

from credible sources (NGOs, official websites, trusted platforms)

Open the result pages and extract the following details for each opportunity:

Title of the program

Date / duration (or clearly state “Ongoing” if no date is mentioned)

Location (online / city / country)

Official link

Return the final answer in a clear, structured format, without extra commentary.`


module.exports = {
    createPrompt
}