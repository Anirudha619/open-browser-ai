const { chromium } = require('playwright');
const {createPrompt} = require('./prompt')
const {gemini} = require('./llm')
const fs = require('fs');
const path = require('path');

const inquirer = require("inquirer");
const { New } = require('chrome-remote-interface');

async function captchaWaitcli() {
  while (true) {
    const answers = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'captchaSolved',
        message: "Have you solved the CAPTCHA?",
        default: false,
      },
    ]);

    if (answers.captchaSolved) {
      if(process.env.ENABLE_LOGS)console.log("Proceeding...");
      return;
    }
    if(process.env.ENABLE_LOGS)console.log("Waiting... Solve the CAPTCHA, then confirm.");
  }
}

async function highlightBox(page, box) {
  await page.evaluate(({ x, y, w, h }) => {
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.width = w + "px";
    el.style.height = h + "px";
    el.style.border = "3px solid red";
    el.style.zIndex = 999999;
    el.style.pointerEvents = "none";  // don't block clicks
    el.style.background = "rgba(255,0,0,0.15)";
    el.className = "playwright-highlight-box";

    document.body.appendChild(el);
  }, box);
}

async function getCompressedElements(page) {
  return await page.evaluate(() => {
    const results = [];
    let idCounter = 0;

    // Get ALL elements in the document
    const allElements = document.querySelectorAll('*');

    // Helper to check if element is visible
    // function isVisible(el) {
    //   if (!el) return false;
      
    //   const style = window.getComputedStyle(el);
    //   if (style.display === 'none' || 
    //       style.visibility === 'hidden' || 
    //       style.opacity === '0') {
    //     return false;
    //   }

    //   const rect = el.getBoundingClientRect();
    //   return rect.width > 0 && rect.height > 0;
    // }

    function isVisible(el) {
      if (!el) return false;
      
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || 
          style.visibility === 'hidden' || 
          style.opacity === '0') {
        return false;
      }

      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      
      // NEW: Check if element is actually visible at its center point
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const topElement = document.elementFromPoint(centerX, centerY);
      
      // Element is only truly visible if it (or one of its children) is at the top
      return topElement && (el.contains(topElement) || topElement.contains(el));
    }

    // Check if element is interactive
    function isInteractive(el) {
      const tag = el.tagName.toLowerCase();
      
      // Interactive tags
      if (['a', 'button', 'input', 'textarea', 'select'].includes(tag)) {
        return true;
      }

      // Interactive attributes/roles
      if (el.hasAttribute('onclick') || 
          el.hasAttribute('role') && ['button', 'link', 'tab', 'menuitem'].includes(el.getAttribute('role')) ||
          el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1') {
        return true;
      }

      return false;
    }

    // Check if element is a leaf (no visible children with text/interactive content)
    function isLeafElement(el, allVisibleElements) {
      // For interactive elements, check if they contain other interactive elements
      if (isInteractive(el)) {
        return !Array.from(el.querySelectorAll('*')).some(child => 
          isInteractive(child) && allVisibleElements.includes(child)
        );
      }

      // For non-interactive text elements
      const text = el.textContent?.trim() || '';
      if (!text || text.length === 0) return false;

      // Check if this element's text is just a container for child elements
      // If all text content comes from children, skip this parent
      const childrenText = Array.from(el.children)
        .map(child => child.textContent?.trim() || '')
        .join('');
      
      const ownText = Array.from(el.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent?.trim() || '')
        .filter(t => t.length > 0)
        .join('');

      // This element has its own text content (not just from children)
      return ownText.length > 0;
    }

    // Container tags to skip (they usually just wrap content)
    const skipTags = ['html', 'body', 'head', 'script', 'style', 'meta', 'link', 'title'];

    // First pass: collect all visible elements
    const visibleElements = Array.from(allElements).filter(el => {
      if (skipTags.includes(el.tagName.toLowerCase())) return false;
      return isVisible(el);
    });

    // Second pass: filter to leaf elements only
    const leafElements = visibleElements.filter(el => {
      if (isInteractive(el)) {
        // For interactive elements, only keep if no interactive children
        return !visibleElements.some(other => 
          other !== el && el.contains(other) && isInteractive(other)
        );
      } else {
        // For text elements, check if it's a leaf
        return isLeafElement(el, visibleElements);
      }
    });

    // Extract data from leaf elements
    leafElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const tag = el.tagName.toLowerCase();
      
      // Get text content
      let text = '';
      if (tag === 'input' || tag === 'textarea') {
        text = el.value || el.placeholder || '';
      } else if (tag === 'img') {
        text = el.alt || '';
      } else {
        // For text elements, get only direct text content (not from children)
        text = Array.from(el.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent?.trim() || '')
          .filter(t => t.length > 0)
          .join(' ');
        
        // If no direct text, fall back to innerText
        if (!text) {
          text = el.innerText?.trim() || '';
        }
      }

      // Skip if no meaningful content
      if (!text && !isInteractive(el) && tag !== 'img') return;
      
      const data = {
        id: idCounter++,
        tag: tag,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: text.substring(0, 200), // Limit text length
        interactive: isInteractive(el)
      };

      // Add relevant attributes for interactive elements
      if (el.href) data.href = el.href;
      if (el.type) data.type = el.type;
      if (el.name) data.name = el.name;
      if (el.id) data.elementId = el.id;
      if (el.className) data.className = el.className;
      
      // Add role if present
      const role = el.getAttribute('role');
      if (role) data.role = role;

      // Add aria-label if present
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) data.ariaLabel = ariaLabel;

      // Add src for images
      if (el.src) data.src = el.src;

      results.push(data);
    });

    return results;
  });
}
  
class BrowserController {
    constructor() {
        this.browser = null;
        this.page = null;
        this.context = null;
        this.pages =[]
        this.activePage = 0;
        this.eventListenersSetup = false;
    }

async initialize(headless = false) {

        this.browser = await chromium.launch({ 
          // channel:"chrome",
          headless: headless,
          // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          args: [
            "--disable-blink-features=AutomationControlled"
            // '--disable-web-security',               // Disable CORS
            // '--disable-features=IsolateOrigins,site-per-process', // Disable origin isolation
            // '--disable-blink-features=AutomationControlled', // Hide automation
            // '--window-size=600,700',
            // "viewport=600,700"
            // '--no-sandbox',                          // Disable sandbox (useful in Docker)
            // '--ignore-certificate-errors',           // Accept self-signed certs
          ]
        });
        const context = await this.browser.newContext(
          // { viewport: null }
          
        );
        this.context = context;
        
        // Setup event listeners for automatic page synchronization
        this.setupEventListeners();
        

    }

setupEventListeners() {
        if (!this.context || this.eventListenersSetup) return;

        // Listen for new pages being created (new tabs)
        this.context.on('page', (page) => {
            if(process.env.ENABLE_LOGS)console.log('New page created:', page.url());
            this.syncPageData();
        });

        // Listen for pages being closed
        this.context.on('pageclose', (page) => {
            if(process.env.ENABLE_LOGS)console.log('Page closed:', page.url());
            this.syncPageData();
        });

        this.eventListenersSetup = true;
    }

    syncPageData() {
        if (!this.context) return null;

        const pages = this.context.pages();
        if (pages.length === 0) return null;
        
        // Update pages array with current browser state
        this.pages = pages;
        
        // If active page is out of bounds, reset to first page
        if (this.activePage >= this.pages.length) {
            this.activePage = Math.max(0, this.pages.length - 1);
        }
        
        if(process.env.ENABLE_LOGS)console.log(`Synced: ${this.pages.length} pages, active tab: ${this.activePage + 1}`);
        return { pageCount: this.pages.length, activePage: this.activePage };
    }

    // Get current active page
    getCurrentPage() {
        this.syncPageData();
        return this.pages[this.activePage] || null;
    }

    // Switch to specific tab
    async switchToTab(tabIndex) {
        this.syncPageData();
        if (tabIndex >= 0 && tabIndex < this.pages.length) {
            this.activePage = tabIndex;
            await this.pages[tabIndex].bringToFront();
            if(process.env.ENABLE_LOGS)console.log(`Switched to tab ${tabIndex + 1}`);
            return true;
        }
        return false;
    }


async createNewTab(url=null) {
      const _page = await this.context.newPage();
      
      // Wait a bit for the event listener to update pages array
      await this.wait(100);
      this.syncPageData();
      
      if(url){
        await _page.goto(url, { waitUntil: "domcontentloaded" });
        await this.wait(500);
      }
      
      // Switch to the new tab (it will be the last one)
      this.activePage = this.pages.length - 1;
      await _page.bringToFront();
      
      if(process.env.ENABLE_LOGS)console.log(`Created new tab, now on tab ${this.activePage + 1}`);
      return this.activePage + 1; // Return 1-based tab number
    }

    getPage(index){
      return this.pages[index];
    }

    // Get comprehensive browser state
    getBrowserState() {
      this.syncPageData();
      return {
        totalTabs: this.pages.length,
        activeTabIndex: this.activePage,
        activeTabNumber: this.activePage + 1, // 1-based
        pages: this.pages.map((page, index) => ({
          index: index,
          number: index + 1,
          url: page.url(),
          isActive: index === this.activePage
        }))
      };
    }

    async goto(page, url) {
        // if (this.page) {
            await page.goto(url);

            // const data = await getCompressedElements(this.page)
            
            // if(process.env.ENABLE_LOGS)console.log(JSON.stringify(data, null, 2));
        // }
    }

    async click(page, x, y, button = 'left', delayMs = 1000) {
      // draw marker
  await page.evaluate(({ x, y }) => {
    const dot = document.createElement('div');
    dot.style.position = 'fixed';
    dot.style.left = `${x - 5}px`;
    dot.style.top = `${y - 5}px`;
    dot.style.width = '10px';
    dot.style.height = '10px';
    dot.style.background = 'red';
    dot.style.borderRadius = '50%';
    dot.style.zIndex = '999999';
    dot.id = '__pw_click_marker__';
    document.body.appendChild(dot);
  }, { x, y });

  // wait so YOU can see it
  await page.waitForTimeout(delayMs);

  // remove marker
  await page.evaluate(() => {
    document.getElementById('__pw_click_marker__')?.remove();
  });

        // const el = page.locator(`#${CSS.escape(id)}`);
        // await el.click();
        // await page.waitForLoadState("domcontentloaded");
        // if (this.page) {
            await page.mouse.click(x, y, { button });
            // await page.waitForLoadState("domcontentloaded");
        // }
    }

    async type(page, text) {
        // if (this.page) {
            await page.keyboard.type(text);
        // }
    }

    async wait(ms = 1000) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    async screenshot(path = 'screenshot.png', page = this.page) {
        if (page) {
            await page.screenshot({ path });
        }
    }

    async screenshotBase63(page = this.page) {
        if (page) {
            await page.screenshot({ 
              encoding: 'base64',
              type: 'jpeg', 
              quality: 80 
            });
        }
    }


    async stop() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}



async function executeActions(actions, browserController, privateData, parentTrace) {
  let pageNo = null
  let page = null
  let chunk = 0

  const actionLogs = [];
    for (const action of actions) {
        let span = null;
        
        // if(page)await page.mouse.move(300, 400, { steps: 20 });
        switch (action.type) {
            case 'getPageDataChunk':
                  actionLogs.push(`retrived ${action.chunk}th of page data.`);
                  chunk = action.chunk
                  break;
            case 'click':
                if (parentTrace) {
                  span = parentTrace.span({
                    name: "Browser Action: Click",
                    input: { elementId: action.id, tab: action.tabOnWhichToPerform, x: action.x, y: action.y },
                    type: "tool"
                  });
                }
                page = browserController.pages[action.tabOnWhichToPerform -1 ]
                pageNo = action.tabOnWhichToPerform 
                if (action.x !== undefined && action.y !== undefined) {
                  if(process.env.ENABLE_LOGS)console.log("---------undefined---------")    
                  const _x = action.x + action.w / 2
                    const _y = action.y + action.h / 2
                    if(process.env.ENABLE_LOGS)console.log("click cordinates: ", action.x, action.y, action.w, action.h)
                    await browserController.click(page, _x, _y);
                    actionLogs.push(`performed 'click' with params { id : ${action.id}, tab: ${action.tabOnWhichToPerform} }`);
                }
                if (span) span.end({ output: { success: true } });
                break;

            case 'type':
                if (parentTrace) {
                  span = parentTrace.span({
                    name: "Browser Action: Type",
                    input: { elementId: action.id, tab: action.tabOnWhichToPerform, hasPrivateData: !!action.privateDataKeyName },
                    type: "tool"
                  });
                }
                page = browserController.pages[action.tabOnWhichToPerform-1 ]
                pageNo = action.tabOnWhichToPerform

                // click
                if (action.x !== undefined && action.y !== undefined) {
                  if(process.env.ENABLE_LOGS)console.log("---------undefined 2---------")  
                  const _x = action.x + action.w / 2
                    const _y = action.y + action.h / 2
                    await browserController.click(page, _x, _y);
                    // actionLogs.push(`performed 'click' with params { id : ${action.id}, tab: ${action.tabOnWhichToPerform} }`);
                }
                else break;
                // click

                const textToType = action.privateDataKeyName ? privateData[action.privateDataKeyName] : action.textToType
                if (textToType != undefined) {

                  // // Detect OS and use correct modifier
                  // const isMac = process.platform === 'darwin';
                  // const modifierKey = isMac ? 'Meta' : 'Control';

                  // // Select all + delete
                  // await page.keyboard.down(modifierKey);
                  // await page.keyboard.press('A');
                  // await page.keyboard.up(modifierKey);
                  // await page.keyboard.press('Backspace');

                    await browserController.type(page, textToType);
                    const maskedText = action.privateDataKeyName ? '[PRIVATE]' : textToType;
                    actionLogs.push(`performed 'type' with params { text: "${maskedText}", tab: ${action.tabOnWhichToPerform} }`);
                }
                if (span) span.end({ output: { success: true } });
                break;

            case 'openNewTab':
                if (parentTrace) {
                  span = parentTrace.span({
                    name: "Browser Action: OpenNewTab",
                    input: { url: action.url },
                    type: "tool"
                  });
                }
                const newTabNumber = await browserController.createNewTab(action.url);
                pageNo = newTabNumber;
                if(process.env.ENABLE_LOGS)console.log("pageNo ", pageNo)
                actionLogs.push(`performed 'openNewTab' with params { newTabNumber: ${pageNo} }`);
                if (span) span.end({ output: { success: true, newTabNumber } });
                break;

            case 'search':
                if (parentTrace) {
                  span = parentTrace.span({
                    name: "Browser Action: Navigate",
                    input: { url: action.url, tab: action.tabOnWhichToPerform },
                    type: "tool"
                  });
                }
                page = browserController.pages[action.tabOnWhichToPerform-1 ]
                pageNo = action.tabOnWhichToPerform
                if (action.url !== undefined) {
                    const currentPage = page;
                    await browserController.goto(currentPage, action.url);
                    actionLogs.push(`performed 'search' with params { url: "${action.url}", tab: ${action.tabOnWhichToPerform} }`);
                }
                if (span) span.end({ output: { success: true } });
                break;

            default:
                console.warn(`Unknown action type: ${action.type}`);
                break;
        }

        // Optional delay between actions
        await browserController.wait(1500);
        await browserController.syncPageData();
    }

    return { pageNo, actionLog: actionLogs, chunk };
}

function getPrivateData(obj) {
  const list =  Object.keys(obj);
  return JSON.stringify(list)
}

async function markBoundingBoxes(page, elements) {
  
  await page.evaluate((elements) => {
    // Remove any existing markers first
    // const existingMarkers = document.querySelectorAll('.bbox-marker');
    // existingMarkers.forEach(marker => marker.remove());

    const oldContainer = document.getElementById('bbox-container');
    if (oldContainer) {
      oldContainer.remove();
    }

    // Create a container for all markers
    const container = document.createElement('div');
    container.id = 'bbox-container';
    document.body.appendChild(container);

    elements.forEach((el) => {
      const color = el.interactive ? 'purple' : 'red';
      // Create the bounding box overlay
      const box = document.createElement('div');
      box.className = 'bbox-marker';
      box.style.cssText = `
        position: absolute;
        left: ${el.x}px;
        top: ${el.y}px;
        width: ${el.width}px;
        height: ${el.height}px;
        border: 2px solid ${color};
        background-color: ${el.interactive ? 'rgba(128, 0, 128, 0.15)' : 'rgba(255, 0, 0, 0.1)'};
        pointer-events: none;
        z-index: 999999;
        box-sizing: border-box;
      `;

      // Create the label
      const label = document.createElement('div');
      label.style.cssText = `
        position: absolute;
        top: -20px;
        left: 0;
        background-color: ${color};
        color: white;
        padding: 2px 6px;
        font-size: 12px;
        font-family: monospace;
        white-space: nowrap;
        border-radius: 3px;
      `;
      label.textContent = `#${el.id} ${el.tag}`;
      
      box.appendChild(label);
      container.appendChild(box);
    });
  }, elements);
}



function elementsToPromptCSVChunks(elements, part = 0) {
  const pagedataLimit = 100000;
  const header = "id,text,href,role,ariaLabel,interactive,tag\n";
  
  const chunks = [];
  let currentChunk = header;
  
  elements.forEach(el => {
    const escape = (str) => `"${(str || '').replace(/"/g, '""')}"`;
    const row = [
      el.id,
      escape(el.text || ''),
      escape(el.href || ''),
      escape(el.role || ''),
      escape(el.ariaLabel || el['aria-label'] || ''),
      el.interactive ? 1 : 0,
      el.tag ?? ''
    ].join(',') + '\n';
    
    // Check if adding this row would exceed the limit
    if ((currentChunk + row).length > pagedataLimit && currentChunk !== header) {
      // Save current chunk and start a new one with header
      chunks.push(currentChunk);
      currentChunk = header + row;
    } else {
      currentChunk += row;
    }
  });
  
  // Add the last chunk if it has content beyond just the header
  if (currentChunk !== header) {
    chunks.push(currentChunk);
  }

  // Create complete CSV by combining all chunks (remove duplicate headers)
  const completeCSV = header + chunks.map(chunk => 
    chunk.replace(header, '')
  ).join('');
  
  return {
    allChunks: chunks,
    requestedChunk: chunks[part] || null,
    totalChunks: chunks.length,
    completePageData:completeCSV
  };
}

function getDimentionOfElement(id, elements){
  for(const item of elements){
    if(item.id == id){
      return {
        x: item.x,
        y: item.y,
        w: item.width, 
        h: item.height
      }
    }
  }
}



module.exports = {
  BrowserController,
  getCompressedElements,
  executeActions,
  markBoundingBoxes,
  elementsToPromptCSVChunks,
  getDimentionOfElement,
  getPrivateData,
  highlightBox,
  captchaWaitcli
}