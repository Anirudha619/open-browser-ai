# OpenBrowserAI - Open Source Browser AI Agent

OpenBrowserAI is an AI agent that can control your browser and can automate your browser tasks.
<img width="1000" alt="image" src="https://github.com/user-attachments/assets/19c95e32-a6a1-46ac-8bd5-e1cc27e6b231" />


## Demo

Watch the demo video: [OpenBrowserAI Demo](https://drive.google.com/file/d/1H8ocpMhVtr5twvEHcH1OkLC8-s3eQDKa/view?usp=sharing)

## Installation

### Clone and Install Locally

```bash
git clone https://github.com/anirudhat101/OpenBrowserAI.git
cd OpenBrowserAI
npm install
```

```bash
npx playwright install  
```

Environment Variables (optional: unless you want to run opik integration and its evalution)

Create a `.env` file in the root directory as per .env.example file.

```
LLM_PROVIDER="cera" 

OPIK_URL_OVERRIDE=
OPIK_PROJECT_NAME=
OPIK_API_KEY=
OPIK_WORKSPACE=

OPIK_DISABLED=
```


If you cloned the repository:

```bash
# Run directly
node agent/cli.js "Price of Apple share"
```


## Example Commands

```bash
openbrowserai "Search Amazon for iPhone 13 under ₹50,000."

openbrowserai "Compare prices of AirPods on Amazon and Flipkart."

openbrowserai "Price of Apple share"
```

## Architecture
```
User Task → Agent Loop → LLM → Browser Actions → Output
                ↑_________________↓
                    (feedback loop)
```

## How It Works

### 1. Task Input
User provides a natural language task (e.g., *"find education wellness volunteer program in US"*)

### 2. Agent Loop
The agent runs an iterative loop until the task is complete:
- **Observe**: Captures current page state (elements, text, URL)
- **Reason**: LLM analyzes the page and decides next actions
- **Act**: Executes actions (click, type, navigate, screenshot)
- **Learn**: Updates context with gathered information

### 3. Browser Actions
- Navigate to URLs
- Click elements by ID
- Type text into forms
- Take screenshots (vision mode)
- Open/manage multiple tabs
- Extract page data in chunks

### 4. Multi-LLM Support
Works with Gemini, Cerebras, OpenRouter, and HuggingFace models

## Project Structure

```
OpenBrowserAI/
├── agent/              # Core agent code
│   ├── cli.js         # Command-line interface
│   ├── openBrowserai.js # Main agent logic
│   ├── browser.js     # Browser automation
│   ├── llm.js         # LLM integrations
│   └── prompt.js      # Prompts
├── opik/              # Opik evaluation framework
├── frontend/          # Next.js frontend
└── package.json
```



