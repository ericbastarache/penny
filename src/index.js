/*
 Welcome and Intro
   - This is the entry file where our slack bot is created and initialized.
   - If you get lost, looks for big comment blocks like this one, and read them.
   - If you get lost, ask questions in our slack channel: https://penny-woyvoplzst.now.sh/
   - If you're looking for something to work on, grab an issue here: https://github.com/the-heap/penny/issues

 * Project Resources *
   - Node Slack SDK / API resources : https://slackapi.github.io/node-slack-sdk/
   - Node Slack SDK RTM examples: https://github.com/slackapi/node-slack-sdk
   - If you are unsure of how to contribute to open source, please checkout this resource:
   - http://theheap.us/page/resources/
  =========================== */

// ===========================
// Project setup!
// ===========================

// NATIVE NODE LIBRARIES
const readline = require("readline"); // for pasting the slack_bot_token if it wasn't exported to env
const fs = require("fs"); // final system

// THIRD PARTY LIBRARIES
const RtmClient = require("@slack/client").RtmClient;
const CLIENT_EVENTS = require("@slack/client").CLIENT_EVENTS;
const RTM_EVENTS = require("@slack/client").RTM_EVENTS;

// FOR SCHEDULED DRAWING PROMPTS
const ScheduledPrompt = require("./scheduled-prompt");
const simplePromptGenerator = require("./simple-prompt-generator");

// CONSTANTS
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// VARIABLES
var bot_token = process.env.SLACK_BOT_TOKEN || "";

//GLOBALS
var global = {
  penny: undefined
};

var prompts = fs.readFileSync("testprompts.json", "utf8");
var parsedAsJson = JSON.parse(prompts);
// check if slack bot token env var exists before booting the program
if (process.env.SLACK_BOT_TOKEN) {
  init_bot();
} else {
  rl.question("Please provide your SLACK_BOT_TOKEN for your team: ", answer => {
    bot_token = answer;
    rl.close();
    init_bot();
  });
}

// ===========================
// Bot setup!
// ===========================

function init_bot() {
  console.log("Initializing Penny...");
  var prompts = fs.readFileSync("testprompts.json", "utf8");
  console.log(prompts);

  /*** BOT variables and Constants ***/

  var rtm = new RtmClient(bot_token);
  let channel;

  /*** Real Time Event Handlers ***/

  // Function to handle the bot's authentication:
  // Sets the channel that Penny can activate in.
  // TODO: Allow penny to operate in multiple channels
  rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function(rtmStartData) {
    console.log(
      `Starting ${rtmStartData.self.name} for  ${rtmStartData.team.name}`
    );
    for (let c of rtmStartData.channels) {
      if (c.is_member && c.name === "draw_it") {
        channel = c.log;
      }
    }

    // Find penny and assign to the global object

    for (let u of rtmStartData.users) {
      if (u.name === "penny_bot") {
        global.penny = u;
        console.log(global.penny);
      }
    }
  });

  // Handle receiving a message
  // Check if the message includes penny's ID. If it does, send a message to the draw_it channel
  rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
    if (message.text.includes(`<@${global.penny.id}>`)) {
      let responseText = "";
      if (message.text.includes("give") && message.text.includes("prompt")) {
        let singlePrompt =
          parsedAsJson.prompts[
            Math.floor(Math.random() * parsedAsJson.prompts.length)
          ];
        responseText = singlePrompt;
        //responseText = parsedAsJson.prompts[0];
        rtm.sendMessage(responseText, "C63GFH05V");
      } else if (
        message.text.includes("submit") &&
        message.text.includes("prompt")
      ) {
        let submitPromptText = message.text.substr(27, message.text.length);

        fs.readFile("testprompts.json", "utf8", function(err, data) {
          let json = JSON.parse(data);
          json.prompts.push(submitPromptText);
          fs.writeFileSync("testprompts.json", JSON.stringify(json), "utf8");
        });

        rtm.sendMessage(`Prompt submitted: ${submitPromptText}`, "C63GFH05V");
      } else {
        responseText =
          "Hi I'm Penny; I can do the following if you `@` mention me!\n";
        responseText += "`@penny_bot give prompt` \n";
        responseText += "`@penny_bot, submit prompt '<your prompt here>'`";
        rtm.sendMessage(responseText, "C63GFH05V");
      }
    }
  });

  // Handle the connection opening
  rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function() {
    /*
    rtm.sendMessage(
      "Hello I am Penny, I just connected from the server!",
      "C63GFH05V"
    );
    */
  });

  // Handle the connection opening
  rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function() {
    /*
    rtm.sendMessage(
      "Hello I am Penny, I just connected from the server!",
      "C63GFH05V"
    );
    */
  });

  // rtm.on(CLIENT_EVENTS.RTM., function() {

  rtm.start();

  /*** Scheduled prompt setup ***/
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
    if (!rtm.connected) return;

    // send the prompt to the hardcoded #draw_it channel
    rtm.sendMessage(prompt, "C63GFH05V").catch(error => {
      console.error("error sending message", error);
    });
  });
}
