const {createPrompt} = require('./prompt')
const {gemini} = require('./llm')

const {saveToTxtFile} = require('./utils/fileStore')

const {
    BrowserController,
    getCompressedElements,
    executeActions,
    markBoundingBoxes,
    elementsToPromptCSVChunks,
    getDimentionOfElement,
    getPrivateData,
    highlightBox,
    captchaWaitcli
} = require('./browser.js')

const { isOpikEnabled } = require('./utils/opikConfig');

let Opik, disableLogger, opikClient;

if (isOpikEnabled()) {
  ({ Opik, disableLogger } = require("opik"));
  opikClient = new Opik();
  disableLogger();
}

async function OpenBrowserAI(task, privateData = {}){
  // const task = "check the price of eth on coingecko. if its price is greater than $6000 then open trading view chart of eth/usdt binace perp. else check price of BTC on coinmarketcap and see it its price is greater than $100000 if yes then open btc goolgle price page else open excalidraw."
  // const task = "check the price of eth on coingecko then check price on coinmarketcap"
  // const task = "Find a volunteer opportunity for beach cleanup in Mumbai"
  const useVision = true
  let isDone = false 
  
  let pageData =""
  let information_gather_so_far =""
  let previousTaskOutcome=""
  let summary =""
  let tabSummary = "Currently 0 tabs are open."

  let pageNo = null

  const b = new BrowserController();
  await b.initialize();
  
  let current_tab = b.pages.length

  let stepsCounter = 0
  
  const pageDataList = []
  let currentUrl = ""

  const trace = opikClient ? opikClient.trace({
    name: "Browser Task",
    input: { task },
    tags: ["browser-automation"]
  }) : null;

  let firstRes = await executeActions([{type: "openNewTab"}], b, privateData, trace)
  let browserState = b.getBrowserState();
  let actionsLog = firstRes.actionLog
  pageNo =1
  let compressedElement;

  let currentPageOfAgent
  let askedChunk = 0
  let isChunkActionAvailable = false

  let visionData = {
      useVision: false,
      image: null 
  }
  let finalAnswer
  while (!isDone){
    stepsCounter++
    if(process.env.ENABLE_LOGS)console.log("creating prompt")

    let stepSpan = null;
    if (trace) {
      stepSpan = trace.span({
        name: `Step ${stepsCounter}`,
        input: { step: stepsCounter, pageNo },
        type: "general"
      });
    }

    if(stepsCounter == 1)compressedElement = await getCompressedElements(b.pages[pageNo-1])

    
    const prompt = createPrompt(pageData, task, information_gather_so_far, previousTaskOutcome, summary, pageNo, tabSummary, getPrivateData(privateData), currentUrl, actionsLog, stepsCounter, isChunkActionAvailable, useVision, browserState );
    
    
    await saveToTxtFile("prompt"+stepsCounter.toString()+".txt", prompt)
    if(process.env.ENABLE_LOGS)console.log("call gemini ")
    
    const res = await gemini(prompt, visionData, stepSpan)
    
    if(process.env.ENABLE_LOGS)console.log("gemini Done")
    if(process.env.ENABLE_LOGS)console.log("res ",res  )
    if(res.isWholegoalFinish){
      if (stepSpan) stepSpan.end({ output: { status: "completed" } });
      isDone = true
      finalAnswer = res.answer
      break
    }
    // if(res.actions.length <=0){

    // }
    {
      if(res.isCaptcha){
        if(process.env.ENABLE_LOGS)console.log("Captcha detected. Waiting for user confirmation...");
        await captchaWaitcli();
      }
      else {
        
        if(res.actions[0]?.x){
          if(process.env.ENABLE_LOGS)console.log({ x: res.actions[0].x, y: res.actions[0].y, w: res.actions[0].w, h: res.actions[0].h })
          await highlightBox(b.pages[pageNo-1], { x: res.actions[0].x, y: res.actions[0].y, w: res.actions[0].w, h: res.actions[0].h });
          // function sleep(ms) {
          //   return new Promise(resolve => setTimeout(resolve, ms));
          // }
          // await sleep(1000)
        }

        for(let i = 0; i < res.actions.length; i++){
          const _action = res.actions[i]
          if(_action.type.toLowerCase() =="click" || _action.type.toLowerCase() =="type" ){
            const {x, y, w, h} = getDimentionOfElement(_action.id, compressedElement);
            res.actions[i] = {...res.actions[i], x, y, w, h}
          }
        }
        if(res.actions[0].type == "Screenshot"){
          if(useVision){
            visionData.useVision = true;
            const _PageNo = pageNo ? pageNo : 1 // todo remove
            visionData.image = await b.screenshotBase63(b.pages[_PageNo-1]);
            
            const visionActionLog = "attached is the scrrenshot of the current page which you asked for in last step."
            actionsLog.push(visionActionLog)

            information_gather_so_far = information_gather_so_far + " " + res.information_gather_so_far;
            // previousTaskOutcome = res.previousTaskOutcome
            summary = summary + " " + res.Summary

            continue

          } else throw new Error("vision is not enabled by client but llm asked for it.")
        } else {
          visionData.image = null;
          visionData.useVision = false;
        }


        let exeRes = await executeActions(res.actions, b, privateData, stepSpan)
        askedChunk = exeRes.chunk
        let _pageno= exeRes.pageNo ? exeRes.pageNo :  pageNo
        let _actionLog = exeRes.actionLog
        actionsLog.push(..._actionLog)
        pageNo = _pageno
        
        // await b.pages[pageNo-1].bringToFront(); // todo : remove (we should listen to new page addition state change)
        if(process.env.ENABLE_LOGS)console.log("performed")

      }
  
      // await b.pages[pageNo-1].screenshot({ path: 'screenshot.png', fullPage: true });
      compressedElement = await getCompressedElements(b.pages[pageNo-1])
      // const pageDataStr = elementsToPromptCSV(compressedElement)
      let pageDataInCsv = elementsToPromptCSVChunks(compressedElement, askedChunk)
      currentPageOfAgent = pageDataInCsv
      function createPageDataPrompt(_pageDataCsv, chunk=0){
        let totalChunkInfo = ``
        let chunkPrompt = `if you want to see other chunk of current page then use the getPageDataChunk action. chunk number starts from 0. only use this when you think the data to answer or solve the main task can be in next chunk of page.`
        let isChunkActionAvailable = false
        if(_pageDataCsv.totalChunks > 1){
          isChunkActionAvailable = true
          totalChunkInfo = chunkPrompt + " "+ `The page data is big. SO attached page data is ${chunk}th of whole page data of current page. total chunks in page are ${_pageDataCsv.totalChunks} (which is 0 to ${totalChunks - 1}). the ${chunk}th chunk page data is here:`
        } else {
          // totalChunkInfo = "Only one chunk is available for this page which is 0th chunk. so you cannot use getPageDataChunk on this page as you are already on 0th chunk.\n"
        }
        const _pageDataStr = totalChunkInfo + _pageDataCsv.requestedChunk
        return {pageDataStr : _pageDataStr, isChunkActionAvailable}
      }
      await markBoundingBoxes(b.pages[pageNo-1], compressedElement)
  
      pageDataList.push(pageDataInCsv.completePageData)
      
      const pageDataRes = createPageDataPrompt(pageDataInCsv, askedChunk)
      pageData = pageDataRes.pageDataStr
      
      // if(process.env.ENABLE_LOGS)console.log('---- askedChunk --- ', askedChunk, pageData)
      isChunkActionAvailable = pageDataRes.isChunkActionAvailable
      information_gather_so_far = information_gather_so_far + " " + res.information_gather_so_far;
      previousTaskOutcome = res.previousTaskOutcome
      summary = summary + " " + res.Summary
      browserState = b.getBrowserState();
      
      if (stepSpan) stepSpan.end({ output: { actions: res.actions, status: "in_progress" } });
      // tabSummary = `Tabs open: ${currentBrowserState.totalTabs}. Active tab: ${currentBrowserState.activeTabNumber}. Tab details: ${currentBrowserState.pages.map(tab => `Tab ${tab.number}: ${tab.url}`).join(', ')}`;
      // if (res.tabSummary) {
      //   tabSummary += ` | ${res.tabSummary}`;
      // }
      currentUrl = b.pages[pageNo-1].url();

      
    }
    

  }

  if(process.env.ENABLE_LOGS)console.log("executed the task")

  if (trace) {
    trace.end({
      output: { 
        success: true,
        steps: stepsCounter,
        final_summary: summary,
        information_gathered: information_gather_so_far
      }
    });
  }
  if (opikClient) {
    await opikClient.flush();
  }

  return finalAnswer 
}

async function measureTime(fn) {
  const start = Date.now();

  const result = await fn();

  const end = Date.now();
  if(process.env.ENABLE_LOGS)console.log(`Time taken: ${end - start} ms`);

  return result;
}
// measureTime(OpenBrowserAI)

module.exports = { OpenBrowserAI };


