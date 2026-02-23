const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { ChatOllama } = require("@langchain/ollama");
const { OpenRouter } = require("@openrouter/sdk");
const dotenv = require('dotenv');
const {Reasoning, None} =require('@openrouter/sdk/types')
const fs = require('fs');
const path = require('path');
dotenv.config();

const Cerebras = require('@cerebras/cerebras_cloud_sdk');

const cerebras = new Cerebras({
  apiKey: "csk-955nvd56x89nvdh2n62ervffvv4k9pfkd5jdndp9kwyte3yj", // key added so that tester can easily test it //process.env['CEREBRAS_API_KEY']
});

async function cere(prompt, visionData, parentTrace) {
  let span;


  const completion = await cerebras.chat.completions.create({
    messages: [
        visionData.useVision && visionData.image 
      ? { role: "user", content: [
          { type: "text", text: prompt },
          { type: "image", source: { type: "base64", data: visionData.image } }
        ]}
      : { role: "user", content: prompt }
    ],
    
    model: 'gpt-oss-120b',
    temperature: 0,
    stream: false
  });

  const response = completion.choices[0].message.content;

  if (span) {
    span.end({
      output: { response: response, model: 'gpt-oss-120b' },
    });
  }

  return response;
}

function convertPrompt(res1) {
  // const res1 ={action, summary, infoCollected, status}
  const isWholegoalFinish = res1.status === "completed";

  // if(process.env.ENABLE_LOGS)console.log("action ",action)

  function mapAction(action) {
    if (!action) return [];

    switch (action.type) {
      case "getPageDataChunk":
        return [{
          type: "getPageDataChunk",
          chunk: action.chunk
        }]
      case "Click":
        return [{
          type: "click",
          id: action.elementId,
          tabOnWhichToPerform: action.tabOnWhichToPerform
        }];

      case "Type":
        return [{
          type: "type",
          id: action.elementId,
          textToType: action.text ?? "",
          privateDataKeyName: action.privateKey ?? "",
          tabOnWhichToPerform: action.tabOnWhichToPerform
        }];

      case "Navigate":
        return [{
          type: "search",
          url: action.url ?? "",
          tabOnWhichToPerform: action.tabOnWhichToPerform
        }];

      case "OpenTab":
        return [{
          type: "openNewTab",
          url: action.url
        }];
      case "Screenshot":
        return [{
          type: "Screenshot",
          id: action.elementId,
        }];

      default:
        return [];
    }
  }

  return {
    Summary: res1.summary || "",

    information_gather_so_far: res1.infoCollected || "",

    isWholegoalFinish,

    isCaptcha: false,

    answer: isWholegoalFinish ? res1.answer : "",

    actions: isWholegoalFinish ? [] : mapAction(res1.action)
  };
}



async function query(data) {
	const response = await fetch(
		"https://router.huggingface.co/v1/chat/completions",
		{
			headers: {
				Authorization: `Bearer ${process.env.HF_TOKEN}`,
				"Content-Type": "application/json",
			},
			method: "POST",
			body: JSON.stringify(data),
		}
	);
	const result = await response.json();
	return result;
}

function saveObjectToJsonFile(obj, filename) {
  const filePath = path.resolve(filename);

  // Get the folder path (dirname)
  const dir = path.dirname(filePath);

  // Create folder if not exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Convert object to JSON
  const json = JSON.stringify(obj, null, 2);

  // Save file
  fs.writeFileSync(filePath, json, "utf-8");

  if(process.env.ENABLE_LOGS)console.log("Saved:", filePath);
}

async function gemini(prompt, visionData = {useVision : false, image: null}, parentTrace) {
  if(process.env.ENABLE_LOGS)console.log("gemini1", prompt.length);

  

  let llm;
  const provider = process.env.LLM_PROVIDER || 'cera';
  if(process.env.ENABLE_LOGS)console.log("Provider detected:", provider);
  let text = "";

    // await saveObjectToJsonFile({prompt:prompt}, "zzz.json")

    if(provider === 'cera'){
       const res = await cere(prompt, visionData, parentTrace)
        text = res || ""

    } else
      if (provider === 'huggingface') {
    if(process.env.ENABLE_LOGS)console.log("Using Hugging Face");
    const { HfInference } = require('@huggingface/inference');
    
    const hf = new HfInference(process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY);
    




    
    // await saveObjectToJsonFile({prompt:prompt}, "zzz.json")
    const completion = await hf.chatCompletion({
      model: process.env.HF_MODEL || "openai/gpt-oss-20b:groq",//"Qwen/Qwen3-VL-30B-A3B-Instruct:novita" ,//"openai/gpt-oss-20b:groq",//"Qwen/Qwen3-VL-30B-A3B-Instruct:novita", // "openai/gpt-oss-20b:groq",//,//"Qwen/Qwen3-4B-Instruct-2507:nscale",//"Qwen/Qwen3-VL-30B-A3B-Instruct:novita",//"meta-llama/Llama-Guard-4-12B",//"meta-llama/Llama-3.2-3B-Instruct",//"Qwen/Qwen3-4B-Instruct-2507",//"Qwen/Qwen3-4B-Thinking-2507",//"Qwen/Qwen2.5-7B-Instruct",//"Qwen/Qwen2.5-32B-Instruct",//"openai/gpt-oss-20b",//"Qwen/Qwen2.5-32B-Instruct",///"Qwen/Qwen2.5-7B-Instruct",//"deepseek-ai/DeepSeek-V3.2",//"Qwena/Qwen3-235B-A22B-Instruct-2507",
      messages: [
        
        { role: "system", content: "Reasoning: low" },
        {
          role: 'user',
          content: visionData.useVision && visionData.image
            ? [
                { type: "text", text: prompt + "Dont call or use your tool (tool_choice)." },
                // { type: "image_url", image_url: { url: visionData.image } }
                { type: "image", source: { type: "base64", data: visionData.image } }
              ]
            : prompt + "Dont call or use your tool (tool_choice)."
        }


        // { role: "system", content: "Reasoning: low" },
        // {
        //   role: 'user',
        //   content: prompt + "Dont call or use your tool (tool_choice).",
        // },
      ],
      
      tools: [],
      temperature:0,
      tool_choice: "none"
      // max_new_tokens: 200000
    });
    // await saveObjectToJsonFile(completion,"hfinstruct.json")
    

    if(process.env.ENABLE_LOGS)console.log(" completion?.choices?.[0]?.message ::", completion?.choices?.[0])
    if(process.env.ENABLE_LOGS)console.log(" completion?.choices?.[0]?.message ::", completion?.choices?.[0]?.message)
    text = completion?.choices?.[0]?.message?.content || "";
  } else
  if (provider === 'openrouter') {
    if(process.env.ENABLE_LOGS)console.log("Using OpenRouter");
    const client = new OpenRouter({
      apiKey: process.env.OR || process.env.OPENROUTER_API_KEY,
    });

    const completion = await client.chat.send({
      // "deepseek/deepseek-v3.2" , "meta-llama/llama-3.3-70b-instruct"  "openai/gpt-oss-20b" openai/gpt-oss-safeguard-20b
      model: process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b",//"moonshotai/kimi-k2-0905",//"openai/gpt-oss-20b",//"qwen/qwen-2.5-7b-instruct",//"qwen/qwq-32b",// "deepseek/deepseek-v3.2", //"tngtech/deepseek-r1t-chimera:free", // "meta-llama/llama-3.2-3b-instruct:free", // qwen/qwen3-embedding-8b
      messages: [
        {
          role: 'user',
          content: visionData.useVision && visionData.image
            ? [
                { type: "text", text: prompt },
                // { type: "image_url", image_url: { url: visionData.image } }
                { type: "image", source: { type: "base64", data: visionData.image } }
              ]
            : prompt
        }
      ],
      stream: false,
      // topP:1,
      temperature:0,
      reasoning: {effort: "low"}
    });

    text = completion?.choices?.[0]?.message?.content || "";

  } else {
    if(process.env.ENABLE_LOGS)console.log("Using Gemini");
    llm = new ChatGoogleGenerativeAI({
      // model: "gemini-flash-latest",
      model:"gemini-3-flash-preview", 
      apiKey: process.env.GEMINI_KEY,
    });
    

    const response = await llm.invoke(
      // ["user", prompt]

      visionData.useVision && visionData.image
      ? [["user", [
          { type: "text", text: prompt },
          // { type: "image_url", image_url: { url: visionData.image } }
          // { type: "image", data: visionData.image }
          { 
            type: "image_url", 
            image_url: `data:image/jpeg;base64,${visionData.image}` 
          }


        ]]]
      : [["user", prompt]]

    );

    if(process.env.ENABLE_LOGS)console.log("gemini2");
    text = response.content;
  }

  text = text.replace(/```json|```/g, '').trim();
  if(process.env.ENABLE_LOGS)console.log("gemini3");

  let jsonObject = JSON.parse(text);
  jsonObject = convertPrompt(jsonObject)
  if(process.env.ENABLE_LOGS)console.log("gemini4");

  if (parentTrace) {
    const span = parentTrace.span({
      name: "LLM Call",
      input: { prompt: prompt.substring(0, 1000), useVision: visionData.useVision },
      output: { response: jsonObject, provider: provider },
      type: "llm"
    });
    span.end();
  }

  return jsonObject;
}


module.exports = {
  gemini
};