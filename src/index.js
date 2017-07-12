/* Welcome and Intro
   - This is the entry file where our slack bot is created and initialized.
   - If you get lost, looks for big comment blocks like this one, and read them.
   - If you get lost, ask questions in our slack channel: https://penny-woyvoplzst.now.sh/
   - If you're looking for something to work on, grab an issue here: https://github.com/the-heap/penny/issues

 * Project Resources *
   - Node Slack SDK / API resources : https://slackapi.github.io/node-slack-sdk/
   - Node Slack SDK RTM examples: https://github.com/slackapi/node-slack-sdk
   - If you are unsure of how to contribute to open source, please checkout this resource: http://theheap.us/page/resources/
  =========================== */

// TODO:   // refactor: this should be a function so we can dynamically get set prompts?,

// ===========================
// Project setup!
// ===========================

// NATIVE NODE LIBRARIES
const readline = require("readline");
const fs = require("fs");
const RtmClient = require("@slack/client").RtmClient;
const rtmHandlers = require("./rtm-handlers");
const prompts = require("./prompt-handlers");
const ScheduledPrompt = require("./scheduled-prompt");
const simplePromptGenerator = require("./simple-prompt-generator");

// CONSTANTS
const READLINE = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// env == Envelope. Holds all our domain data. Important!
// This object gets passed around a lot in function params.
var env = {
  prompts: prompts.load(), // write function that reloads this?
  rtm: rtmHandlers.createClient(), // create new RTM client for all handlers.
  penny: undefined, // Our bot and all it's properties.
  channel: undefined // the channel(s) penny can live in.
};

// check if slack bot token env var exists before booting the program
if (process.env.SLACK_BOT_TOKEN) {
  init_bot();
} else {
  READLINE.question(
    "Please provide your SLACK_BOT_TOKEN for your team: ",
    answer => {
      bot_token = answer;
      READLINE.close();
      init_bot();
    }
  );
}

// ===========================
// Bot setup!
// ===========================

/**
 * This function sets up and runs our bot. 
 */
function init_bot() {
  console.log("Initializing Penny...");

  // rtmHandlers (real time message handlers)
  rtmHandlers.onAuthentication(env);
  rtmHandlers.onReceiveMessage(env);
  rtmHandlers.startRtm(env);

  /*** Scheduled prompt setup ***/
  // TODO: move to a new file -> handleScheduling or something like that.
  const scheduledPrompt = new ScheduledPrompt({
    cronSchedule: "1 31 * * * *",
    promptGenerator: simplePromptGenerator
  });

  // start listening for new prompts
  scheduledPrompt.on(ScheduledPrompt.PROMPT_EVENT, function(prompt) {
    // console.log("here's the prompt:", prompt);

    /**
     * Don't bother sending messages if bot is disconnected. Doing that
     * repeatedly leads to errors.
     *
     * Sometimes `connected` is incorrect, maybe it is only updated when a
     * message fails to go through? I haven't seen sending a message cause a
     * crash when connected is `true` but internet connection is disabled.
     * Crashes happen when connected is `false` and my internet connection is
     * disabled.
     */
    if (!env.rtm.connected) return;

    // send the prompt to the hardcoded #draw_it channel
    env.rtm.sendMessage(prompt, "C63GFH05V").catch(error => {
      console.error("error sending message", error);
    });
  });
}
