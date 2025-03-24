//Webex Bot Starter - featuring the webex-node-bot-framework - https://www.npmjs.com/package/webex-node-bot-framework
require("dotenv").config();
var framework = require("webex-node-bot-framework");
var webhook = require("webex-node-bot-framework/webhook");
var express = require("express");
var bodyParser = require("body-parser");
const fetch = require('node-fetch');
var app = express();
app.use(bodyParser.json());
app.use(express.static("images"));

const config = {
  token: process.env.BOTTOKEN,
  pdApiKey: process.env.PAGERDUTY_API_KEY
};

if (!config.pdApiKey) {
  console.error('WARNING: PAGERDUTY_API_KEY is not set in environment variables');
}

console.log('Environment check:');
console.log('BOTTOKEN:', process.env.BOTTOKEN ? 'Present' : 'Missing');
console.log('PAGERDUTY_API_KEY:', process.env.PAGERDUTY_API_KEY ? 'Present' : 'Missing');

// Handler for card submissions
async function addNoteToPagerDuty(incidentId, noteContent, pdApiKey) {
  if (!pdApiKey) {
      console.error('PagerDuty API key is missing');
      return {
          success: false,
          message: 'PagerDuty API key is not configured'
      };
  }

  const url = `https://api.pagerduty.com/incidents/${incidentId}/notes`;
  
  console.log(`Making request to: ${url}`);
  
  const headers = {
      'Accept': 'application/vnd.pagerduty+json;version=2',
      'Authorization': `Token token=${pdApiKey}`,
      'Content-Type': 'application/json',
      'From': 'gcastillo@pagerduty.com'
  };

  const payload = {
      note: {
          content: noteContent
      }
  };

  console.log('Request payload:', JSON.stringify(payload, null, 2));

  try {
      const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response body:', responseText);

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      return {
          success: true,
          message: 'Note added successfully',
          data: data
      };
  } catch (error) {
      console.error('Error in addNoteToPagerDuty:', error);
      return {
          success: false,
          message: `Failed to add note: ${error.message}`
      };
  }
}


// Only pass the webhook URL and port if it has been set in the environment
if (process.env.WEBHOOKURL && process.env.PORT) {
  config.webhookUrl = process.env.WEBHOOKURL;
  config.port = process.env.PORT;
}

// init framework
var bot = new framework(config);
bot.start();
console.log("Starting framework, please wait...");

// Add attachment action handler
bot.on('attachmentAction', async (bot, trigger) => {
  console.log('Card submission received:', JSON.stringify(trigger.attachmentAction, null, 2));

  try {
      const inputs = trigger.attachmentAction.inputs;
      console.log('Inputs:', JSON.stringify(inputs, null, 2));

      // Simple check for required fields
      if (!inputs || !inputs.noteContent || !inputs.incidentId) {
          console.log('Missing required fields:', inputs);
          await bot.say('Missing required information in the submission.');
          return;
      }

      // Log the values we're about to use
      console.log('Using values:', {
          incidentId: inputs.incidentId,
          noteContent: inputs.noteContent,
          hasApiKey: !!process.env.PAGERDUTY_API_KEY
      });

      // Call PagerDuty API
      const result = await addNoteToPagerDuty(
          inputs.incidentId,
          inputs.noteContent,
          process.env.PAGERDUTY_API_KEY
      );

      // Log the result
      console.log('PagerDuty API result:', result);

      // Send response to user
      if (result.success) {
          await bot.say('Note added successfully to PagerDuty!');
      } else {
          await bot.say(`Failed to add note: ${result.message}`);
      }

  } catch (error) {
      console.error('Error in attachment action handler:', error);
      await bot.say('Sorry, there was an error processing your note submission.');
  }
});

bot.on("initialized", () => {
  console.log("framework is all fired up! [Press CTRL-C to quit]");
});

bot.on("spawn", (bot, id, actorId) => {
  if (!actorId) {
    console.log(
      `While starting up, the framework found our bot in a space called: ${bot.room.title}`
    );
  } else {
    var msg =
      "You can say `help` to get the list of words I am able to respond to.";
    bot.webex.people
      .get(actorId)
      .then((user) => {
        msg = `Hello there ${user.displayName}. ${msg}`;
      })
      .catch((e) => {
        console.error(
          `Failed to lookup user details in framwork.on("spawn"): ${e.message}`
        );
        msg = `Hello there. ${msg}`;
      })
      .finally(() => {
        if (bot.isDirect) {
          bot.say("markdown", msg);
        } else {
          let botName = bot.person.displayName;
          msg += `\n\nDon't forget, in order for me to see your messages in this group space, be sure to *@mention* ${botName}.`;
          bot.say("markdown", msg);
        }
      });
  }
});

bot.on("log", (msg) => {
  console.log(msg);
});

bot.hears("hola", (bot, trigger) => {
  console.log("hola command received");
  let personName = trigger.person.displayName;
  bot.say(`Hola ${personName}.`);
});

bot.hears(
  "framework",
  (bot) => {
    console.log("framework command received");
    bot.say(
      "markdown",
      "The primary purpose for the [webex-node-bot-framework](https://github.com/WebexCommunity/webex-node-bot-framework) was to create a framework based on the [webex-jssdk](https://webex.github.io/webex-js-sdk) which continues to be supported as new features and functionality are added to Webex. This version of the project was designed with two themes in mind: \n\n\n * Mimimize Webex API Calls. The original flint could be quite slow as it attempted to provide bot developers rich details about the space, membership, message and message author. This version eliminates some of that data in the interests of efficiency, (but provides convenience methods to enable bot developers to get this information if it is required)\n * Leverage native Webex data types. The original flint would copy details from the webex objects such as message and person into various flint objects. This version simply attaches the native Webex objects. This increases the framework's efficiency and makes it future proof as new attributes are added to the various webex DTOs "
    );
  },
  "**framework**: (learn more about the Webex Bot Framework)",
  0
);

bot.hears(
  "info",
  (bot, trigger) => {
    console.log("info command received");
    let personAvatar = trigger.person.avatar;
    let personEmail = trigger.person.emails[0];
    let personDisplayName = trigger.person.displayName;
    let outputString = `Here is your personal information: \n\n\n **Name:** ${personDisplayName}  \n\n\n **Email:** ${personEmail} \n\n\n **Avatar URL:** ${personAvatar}`;
    bot.say("markdown", outputString);
  },
  "**info**: (get your personal details)",
  0
);

bot.hears(
  "space",
  (bot) => {
    console.log("space. the final frontier");
    let roomTitle = bot.room.title;
    let spaceID = bot.room.id;
    let roomType = bot.room.type;

    let outputString = `The title of this space: ${roomTitle} \n\n The roomID of this space: ${spaceID} \n\n The type of this space: ${roomType}`;

    console.log(outputString);
    bot
      .say("markdown", outputString)
      .catch((e) => console.error(`bot.say failed: ${e.message}`));
  },
  "**space**: (get details about this space) ",
  0
);

bot.hears(
  "say hi to everyone",
  (bot) => {
    console.log("say hi to everyone.  Its a party");
    bot.webex.memberships
      .list({ roomId: bot.room.id })
      .then((memberships) => {
        for (const member of memberships.items) {
          if (member.personId === bot.person.id) {
            continue;
          }
          let displayName = member.personDisplayName
            ? member.personDisplayName
            : member.personEmail;
          bot.say(`Hello ${displayName}`);
        }
      })
      .catch((e) => {
        console.error(`Call to sdk.memberships.get() failed: ${e.messages}`);
        bot.say("Hello everybody!");
      });
  },
  "**say hi to everyone**: (everyone gets a greeting using a call to the Webex SDK)",
  0
);

bot.hears('card please', (bot, trigger) => {
 bot.sendCard(
  {
    "type": "AdaptiveCard",
    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
    "version": "1.3",
    "body": [
        {
            "type": "ColumnSet",
            "columns": [
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "Incident",
                            "wrap": true,
                            "weight": "Bolder",
                            "color": "Good"
                        }
                    ]
                },
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "#000001",
                            "wrap": true,
                            "weight": "Bolder",
                            "color": "Good",
                            "isSubtle": true
                        }
                    ]
                }
            ]
        },
        {
            "type": "ColumnSet",
            "columns": [
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "Service",
                            "wrap": true
                        }
                    ]
                },
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "Test Service\n",
                            "wrap": true,
                            "color": "Good",
                            "isSubtle": true
                        }
                    ]
                }
            ]
        },
        {
            "type": "ColumnSet",
            "columns": [
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "Triggered By",
                            "wrap": true
                        }
                    ]
                },
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "User1",
                            "wrap": true,
                            "color": "Good",
                            "isSubtle": true
                        }
                    ]
                }
            ]
        },
        {
            "type": "ColumnSet",
            "columns": [
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "Assign To",
                            "wrap": true
                        }
                    ]
                },
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "GCP",
                            "wrap": true,
                            "color": "Good",
                            "isSubtle": true
                        }
                    ]
                }
            ]
        },
        {
            "type": "ColumnSet",
            "columns": [
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "Urgency",
                            "wrap": true
                        }
                    ]
                },
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "Low",
                            "wrap": true,
                            "color": "Good"
                        }
                    ]
                }
            ]
        },
        {
            "type": "ColumnSet",
            "columns": [
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "Priority",
                            "wrap": true
                        }
                    ]
                },
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "P4",
                            "wrap": true,
                            "color": "Good"
                        }
                    ]
                }
            ]
        },
        {
            "type": "Container",
            "items": [
                {
                    "type": "TextBlock",
                    "text": "Incident Actions",
                    "wrap": true
                },
                {
                    "type": "ActionSet",
                    "actions": [
                        {
                            "type": "Action.OpenUrl",
                            "title": "Acknowledge",
                            "url": "https://www.no.com"
                        },
                        {
                            "type": "Action.OpenUrl",
                            "title": "Resolve",
                            "url": "https://www.no.com"
                        },
                        {
                            "type": "Action.ToggleVisibility",
                            "title": "Add Notes",
                            "targetElements": [
                                "Notes_Container"
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "type": "Container",
            "items": [
                {
                    "type": "TextBlock",
                    "text": "Add Notes",
                    "wrap": true
                },
                {
                    "type": "Input.Text",
                    "placeholder": "Add Notes",
                    "id": "Add_Notes",
                    "isMultiline": true
                },
                {
                    "type": "ActionSet",
                    "actions": [
                        {
                            "type": "Action.Submit",
                            "title": "Submit",
                            "data": {
                                "id": "000001",
                                "type": "note_submission"
                            }
                        },
                        {
                            "type": "Action.OpenUrl",
                            "title": "Agregar",
                            "url": "https://www.noi.com"
                        }
                    ]
                }
            ],
            "id": "Notes_Container",
            "isVisible": false
        }
    ]
  },
   "This is the fallback text if the client can't render this card");
 }, '**card please** - ask the bot to post a card to the space');

bot.hears(
  "reply",
  (bot, trigger) => {
    console.log("someone asked for a reply.  We will give them two.");
    bot.reply(
      trigger.message,
      "This is threaded reply sent using the `bot.reply()` method.",
      "markdown"
    );
    var msg_attach = {
      text: "This is also threaded reply with an attachment sent via bot.reply(): ",
      file: "https://media2.giphy.com/media/dTJd5ygpxkzWo/giphy-downsized-medium.gif",
    };
    bot.reply(trigger.message, msg_attach);
  },
  "**reply**: (have bot reply to your message)",
  0
);

bot.hears(
  /help|what can i (do|say)|what (can|do) you do/i,
  (bot, trigger) => {
    console.log(`someone needs help! They asked ${trigger.text}`);
    bot
      .say(`Hello ${trigger.person.displayName}.`)
      .then(() => bot.say("markdown", bot.showHelp()))
      .catch((e) => console.error(`Problem in help hander: ${e.message}`));
  },
  "**help**: (what you are reading now)",
  0
);

bot.hears(
  /.*/,
  (bot, trigger) => {
    console.log(`catch-all handler fired for user input: ${trigger.text}`);
    bot
      .say(`Sorry, I don't know how to respond to "${trigger.text}"`)
      .then(() => bot.say("markdown", bot.showHelp()))
      .catch((e) =>
        console.error(`Problem in the unexepected command hander: ${e.message}`)
      );
  },
  99999
);

//Server config & housekeeping
app.get("/", (req, res) => {
  res.send(`I'm alive.`);
});

app.post("/", webhook(bot));

var server = app.listen(config.port, () => {
  console.log("framework listening on port %s", config.port);
});

process.on("SIGINT", () => {
  console.log("stopping...");
  server.close();
  bot.stop().then(() => {
    process.exit();
  });
});