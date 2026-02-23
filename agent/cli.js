#!/usr/bin/env node

const { OpenBrowserAI } = require('./openBrowserai');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const LOGO = `
╔═══════════════════════════════════════╗
║             OpenBrowserAI             ║
║     AI-Powered Browser Automation     ║
╚═══════════════════════════════════════╝
`;

const COMMANDS = {
  exit: ['exit', 'quit', 'q'],
  clear: ['clear', 'cls'],
  help: ['help', 'h', '?']
};

function showHelp() {
  console.log('\n📖 Commands:');
  console.log('  <task>              - Execute a browser task');
  console.log('  exit/quit           - Exit the application');
  console.log('  clear               - Clear the screen');
  console.log('  help                - Show this help\n');
  console.log('📁 Private Data:');
  console.log('  --private <file>    - Load private data from JSON file\n');
  console.log('Examples:');
  console.log('  openbrowserai "login" --private ./secrets.json');
  console.log('  openbrowserai --private data.json "check email"\n');
}

function clearScreen() {
  console.clear();
  console.log(LOGO);
}

function isCommand(input, cmds) {
  return cmds.includes(input.toLowerCase().trim());
}

function parseArgs(args) {
  const result = { task: [], privateFile: null };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--private' && i + 1 < args.length) {
      result.privateFile = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      result.task.push(args[i]);
    }
  }
  
  return result;
}

function loadPrivateData(filePath) {
  try {
    const resolvedPath = path.resolve(filePath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Private data file not found: ${resolvedPath}`);
    }
    
    const content = fs.readFileSync(resolvedPath, 'utf8');
    const data = JSON.parse(content);
    
    if (typeof data !== 'object' || data === null) {
      throw new Error('Private data must be a JSON object');
    }
    
    console.log(`🔐 Loaded ${Object.keys(data).length} private key(s)\n`);
    return data;
  } catch (error) {
    throw new Error(`Failed to load private data: ${error.message}`);
  }
}

async function runTask(task, privateData) {
  console.log('\n🚀 Executing:', task);
  if (privateData && Object.keys(privateData).length > 0) {
    console.log('🔐 Private keys available:', Object.keys(privateData).join(', '));
  }
  console.log('─'.repeat(50));
  
  try {
    const result = await OpenBrowserAI(task, privateData);
    console.log('─'.repeat(50));
    console.log('✅ Result:', result);
    console.log('');
  } catch (error) {
    console.log('─'.repeat(50));
    console.error('❌ Error:', error.message);
    console.log('');
  }
}

function prompt(rl, privateData) {
  rl.question('💬 > ', async (input) => {
    const trimmed = input.trim();
    
    if (!trimmed) {
      prompt(rl, privateData);
      return;
    }
    
    if (isCommand(trimmed, COMMANDS.exit)) {
      console.log('\n👋 Goodbye!');
      rl.close();
      process.exit(0);
    }
    
    if (isCommand(trimmed, COMMANDS.clear)) {
      clearScreen();
      prompt(rl, privateData);
      return;
    }
    
    if (isCommand(trimmed, COMMANDS.help)) {
      showHelp();
      prompt(rl, privateData);
      return;
    }
    
    await runTask(trimmed, privateData);
    prompt(rl, privateData);
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(LOGO);
    showHelp();
    process.exit(0);
  }
  
  const { task, privateFile } = parseArgs(args);
  
  let privateData = {};
  if (privateFile) {
    try {
      privateData = loadPrivateData(privateFile);
    } catch (error) {
      console.error('❌', error.message);
      process.exit(1);
    }
  }
  
  // Single task mode
  if (task.length > 0) {
    console.log(LOGO);
    await runTask(task.join(' '), privateData);
    process.exit(0);
  }
  
  // Interactive chat mode
  console.log(LOGO);
  if (privateFile) {
    console.log('🔐 Private data loaded:', Object.keys(privateData).join(', '));
  }
  console.log('Type your task or "help" for commands\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  prompt(rl, privateData);
}

main();
