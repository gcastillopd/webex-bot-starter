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

// Get incident details
async function getIncidentDetails(incidentId, pdApiKey) {
    console.log('pdApiKey:', pdApiKey);
    if (!pdApiKey) {
        return {
            success: false,
            message: 'PagerDuty API key is not configured'
        };
    }

    try {
        const url = `https://api.pagerduty.com/incidents/${incidentId}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.pagerduty+json;version=2',
                'Authorization': `Token token=${pdApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return {
            success: true,
            incident: data.incident
        };
    } catch (error) {
        console.error('Error in getIncidentDetails:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Get incident notes
async function getIncidentNotes(incidentId, limit = 10, ApiKey) {
    console.log('pdApiKey 1:', process.env.PAGERDUTY_API_KEY);
    if (!process.env.PAGERDUTY_API_KEY) {
        console.error('PagerDuty API key is missing');
        return {
            success: false,
            message: 'PagerDuty API key is not configured'
        };
    }

    const url = `https://api.pagerduty.com/incidents/${incidentId}/notes`;
    
    console.log(`Fetching notes from: ${url}`);
    
    const headers = {
        'Accept': 'application/vnd.pagerduty+json;version=2',
        'Authorization': `Token token=${process.env.PAGERDUTY_API_KEY}`,
        'Content-Type': 'application/json',
        'From': 'gcastillo@pagerduty.com'
    };

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Response body:', responseText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
        }

        const data = JSON.parse(responseText);
        // Sort notes by created_at in descending order and limit the number
        const notes = data.notes
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit);

        return {
            success: true,
            notes: notes
        };
    } catch (error) {
        console.error('Error in getIncidentNotes:', error);
        return {
            success: false,
            message: `Failed to fetch notes: ${error.message}`
        };
    }
}

// Add note to incident
async function addNoteToPagerDuty(incidentId, noteContent, pdApiKey) {
    console.log('pdApiKey 2:', pdApiKey);
    if (!pdApiKey) {
        console.error('PagerDuty API key is missing');
        return {
            success: false,
            message: 'PagerDuty API key is not configured'
        };
    }

    const url = `https://api.pagerduty.com/incidents/${incidentId}/notes`;
    
    const headers = {
        'Accept': 'application/vnd.pagerduty+json;version=2',
        'Authorization': `Token token=${pdApiKey}`,
        'Content-Type': 'application/json',
        'From': process.env.PAGERDUTY_USER_EMAIL
    };

    const payload = {
        note: {
            content: noteContent
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
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

// Update incident priority
async function updateIncidentPriority(incidentId, priorityId, pdApiKey) {
    console.log('pdApiKey 3:', pdApiKey);
    if (!pdApiKey) {
      console.error('PagerDuty API key is missing');
      return {
          success: false,
          message: 'PagerDuty API key is not configured'
      };
    }
    const url = `https://api.pagerduty.com/incidents/${incidentId}`;
    console.log(`Making request to update priority: ${url}`);
    const headers = {
        'Accept': 'application/vnd.pagerduty+json;version=2',
        'Authorization': `Token token=${pdApiKey}`,
        'Content-Type': 'application/json',
        'From': 'gcastillo@pagerduty.com'
    };

    const payload = {
        incident: {
            type: "incident_reference",
            priority: {
                type: "priority_reference",
                id: priorityId
            }
        }
    };
    console.log('Priority update payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(url, {
            method: 'PUT',
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
            message: 'Priority updated successfully',
            data: data
        };
    } catch (error) {
        console.error('Error in updateIncidentPriority:', error);
        return {
            success: false,
            message: `Failed to update priority: ${error.message}`
        };
    }
    }

// Acknowledge incident
async function acknowledgeIncident(incidentId, pdApiKey) {
    if (!apiKey) {
        return {
            success: false,
            message: 'PagerDuty API key is not configured'
        };
    }

    try {
        const url = `https://api.pagerduty.com/incidents/${incidentId}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Accept': 'application/vnd.pagerduty+json;version=2',
                'Authorization': `Token token=${pdApiKey}`,
                'Content-Type': 'application/json',
                'From': process.env.PAGERDUTY_USER_EMAIL
            },
            body: JSON.stringify({
                incident: {
                    type: 'incident_reference',
                    status: 'acknowledged'
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('Error in acknowledgeIncident:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Resolve incident
async function resolveIncident(incidentId, pdApiKey) {
    if (!pdApiKey) {
        return {
            success: false,
            message: 'PagerDuty API key is not configured'
        };
    }

    try {
        const url = `https://api.pagerduty.com/incidents/${incidentId}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Accept': 'application/vnd.pagerduty+json;version=2',
                'Authorization': `Token token=${pdApiKey}`,
                'Content-Type': 'application/json',
                'From': process.env.PAGERDUTY_USER_EMAIL
            },
            body: JSON.stringify({
                incident: {
                    type: 'incident_reference',
                    status: 'resolved'
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('Error in resolveIncident:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

module.exports = {
    getIncidentDetails,
    getIncidentNotes,
    addNoteToPagerDuty,
    updateIncidentPriority,
    acknowledgeIncident,
    resolveIncident
};


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

        // Handle priority update
        if (inputs.actionTitle === 'update_priority') {
            if (!inputs.incidentId || !inputs.newPriority) {
                console.log('Missing required fields for priority update:', inputs);
                await bot.say('Missing required information for priority update.');
                return;
            }

            console.log('Updating priority with values:', {
                incidentId: inputs.incidentId,
                newPriority: inputs.newPriority,
                hasApiKey: !!process.env.PAGERDUTY_API_KEY
            });

            const result = await updateIncidentPriority(
                inputs.incidentId,
                inputs.newPriority,
                process.env.PAGERDUTY_API_KEY
            );

            console.log('PagerDuty API result:', result);

            if (result.success) {
                await bot.say('Priority updated successfully!');
            } else {
                await bot.say(`Failed to update priority: ${result.message}`);
            }
            return;
        }

        // Handle note submission
        if (inputs.actionTitle === 'Add Note') {
            if (!inputs.noteContent || !inputs.incidentId) {
                console.log('Missing required fields:', inputs);
                await bot.say('Please enter a note before submitting.');
                return;
            }

            // Log the values we're about to use
            console.log('Using values:', {
                incidentId: inputs.incidentId,
                noteContent: inputs.noteContent,
                hasApiKey: !!process.env.PAGERDUTY_API_KEY,
                hasUserEmail: !!process.env.PAGERDUTY_USER_EMAIL
            });

            // Add the new note
            const result = await addNoteToPagerDuty(
                inputs.incidentId,
                inputs.noteContent,
                process.env.PAGERDUTY_API_KEY
            );

            if (!result.success) {
                console.error('Failed to add note:', result.message);
                
                // More specific error messages based on the error
                if (result.message.includes('401')) {
                    await bot.say('Authentication failed. Please check the API key.');
                } else if (result.message.includes('403')) {
                    await bot.say('Permission denied. Please check your access rights.');
                } else if (result.message.includes('404')) {
                    await bot.say('Incident not found. Please check the incident ID.');
                } else if (result.message.includes('429')) {
                    await bot.say('Too many requests. Please try again in a minute.');
                } else {
                    await bot.say(`Failed to add note: ${result.message}`);
                }
                return;
            }

            // Fetch the incident details to get updated information
            const incidentDetails = await getIncidentDetails(inputs.incidentId, process.env.PAGERDUTY_API_KEY);
            if (!incidentDetails.success) {
                await bot.say('Note added successfully, but failed to refresh incident details.');
                return;
            }

            // Fetch recent notes
            const notesResult = await getIncidentNotes(inputs.incidentId, process.env.PAGERDUTY_API_KEY);
            if (!notesResult.success) {
                await bot.say('Note added successfully, but failed to refresh notes.');
                return;
            }

            // Format notes for display
            const formattedNotes = notesResult.notes.map(note => ({
                title: `${new Date(note.created_at).toLocaleString()} - ${note.user.summary}`,
                value: note.content
            }));

            // Create updated card
            const updatedCard = {
                "type": "AdaptiveCard",
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "version": "1.3",
                "body": [
                    {
                        "type": "Container",
                        "style": "emphasis",
                        "items": [
                            {
                                "type": "ColumnSet",
                                "columns": [
                                    {
                                        "type": "Column",
                                        "width": "stretch",
                                        "items": [
                                            {
                                                "type": "TextBlock",
                                                "text": `#${inputs.incidentId}`,
                                                "wrap": true,
                                                "weight": "Bolder"
                                            }
                                        ]
                                    },
                                    {
                                        "type": "Column",
                                        "width": "auto",
                                        "items": [
                                            {
                                                "type": "ActionSet",
                                                "actions": [
                                                    {
                                                        "type": "Action.OpenUrl",
                                                        "title": "View",
                                                        "url": incidentDetails.incident.html_url
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "type": "Container",
                        "spacing": "Small",
                        "items": [
                            {
                                "type": "FactSet",
                                "facts": [
                                    {
                                        "title": "Service:",
                                        "value": incidentDetails.incident.service.summary
                                    },
                                    {
                                        "title": "Status:",
                                        "value": incidentDetails.incident.status
                                    },
                                    {
                                        "title": "Assigned:",
                                        "value": incidentDetails.incident.assignments[0]?.assignee.summary || "Unassigned"
                                    },
                                    {
                                        "title": "Urgency:",
                                        "value": incidentDetails.incident.urgency
                                    },
                                    {
                                        "title": "Priority:",
                                        "value": `**${incidentDetails.incident.priority?.summary || "None"}**`
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "type": "Container",
                        "spacing": "Small",
                        "style": "emphasis",
                        "items": [
                            {
                                "type": "ActionSet",
                                "actions": [
                                    {
                                        "type": "Action.Submit",
                                        "title": "🔔 Acknowledge",
                                        "style": "default",
                                        "data": {
                                            "actionTitle": "Acknowledge",
                                            "incidentId": inputs.incidentId
                                        }
                                    },
                                    {
                                        "type": "Action.Submit",
                                        "title": "✓ Resolve",
                                        "style": "default",
                                        "data": {
                                            "actionTitle": "Resolve",
                                            "incidentId": inputs.incidentId
                                        }
                                    },
                                    {
                                        "type": "Action.ToggleVisibility",
                                        "title": "📝 Notes",
                                        "style": "default",
                                        "targetElements": ["Notes_Container", "Recent_Notes_Container"]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "type": "Container",
                        "id": "Recent_Notes_Container",
                        "isVisible": true,
                        "spacing": "Small",
                        "style": "emphasis",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": "Recent Notes",
                                "weight": "Bolder",
                                "size": "Medium",
                                "spacing": "Medium"
                            },
                            {
                                "type": "Container",
                                "items": [
                                    {
                                        "type": "FactSet",
                                        "facts": formattedNotes.length > 0 ? formattedNotes : [{
                                            "title": "No Notes",
                                            "value": "No notes have been added to this incident"
                                        }]
                                    }
                                ],
                                "style": "default",
                                "spacing": "Small"
                            }
                        ]
                    },
                    {
                        "type": "Container",
                        "id": "Notes_Container",
                        "isVisible": true,
                        "spacing": "Small",
                        "style": "emphasis",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": "Add New Note",
                                "weight": "Bolder",
                                "spacing": "Medium"
                            },
                            {
                                "type": "Input.Text",
                                "placeholder": "Add Notes",
                                "id": "noteContent",
                                "isMultiline": true
                            },
                            {
                                "type": "ActionSet",
                                "actions": [
                                    {
                                        "type": "Action.Submit",
                                        "title": "✓ Add Note",
                                        "style": "default",
                                        "data": {
                                            "actionTitle": "Add Note",
                                            "incidentId": inputs.incidentId
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            // Update the card in the chat
            try {
                await bot.sendCard(updatedCard, 'Note added successfully!');
                console.log('Card updated successfully with new notes');
            } catch (error) {
                console.error('Error updating card:', error);
                await bot.say('Note added successfully, but failed to update the display.');
            }
        }

        // Handle acknowledge action
        if (inputs.actionTitle === 'Acknowledge') {
            const result = await acknowledgeIncident(inputs.incidentId, process.env.PAGERDUTY_API_KEY);
            if (result.success) {
                await bot.say('Incident acknowledged successfully!');
            } else {
                await bot.say(`Failed to acknowledge incident: ${result.message}`);
            }
        }

        // Handle resolve action
        if (inputs.actionTitle === 'Resolve') {
            const result = await resolveIncident(inputs.incidentId, process.env.PAGERDUTY_API_KEY);
            if (result.success) {
                await bot.say('Incident resolved successfully!');
            } else {
                await bot.say(`Failed to resolve incident: ${result.message}`);
            }
        }

    } catch (error) {
        console.error('Error in attachment action handler:', error);
        await bot.say('Sorry, there was an error processing your request.');
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


bot.hears('card please', (bot, trigger) => {
    bot.sendCard(
     {
       "type": "AdaptiveCard",
       "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
       "version": "1.3",
       "body": [
           {
               "type": "Container",
               "style": "emphasis",
               "items": [
                   {
                       "type": "ColumnSet",
                       "columns": [
                           {
                               "type": "Column",
                               "width": "stretch",
                               "items": [
                                   {
                                       "type": "TextBlock",
                                       "text": "#000001",
                                       "wrap": true,
                                       "weight": "Bolder"
                                   }
                               ]
                           },
                           {
                               "type": "Column",
                               "width": "auto",
                               "items": [
                                   {
                                       "type": "ActionSet",
                                       "actions": [
                                           {
                                               "type": "Action.OpenUrl",
                                               "title": "View",
                                               "url": "https://pagerduty.com/incidents/000001"
                                           }
                                       ]
                                   }
                               ]
                           }
                       ]
                   }
               ]
           },
           {
               "type": "Container",
               "spacing": "Small",
               "items": [
                   {
                       "type": "FactSet",
                       "facts": [
                           {
                               "title": "Service:",
                               "value": "Test Service"
                           },
                           {
                               "title": "Status:",
                               "value": "Triggered"
                           },
                           {
                               "title": "Assigned:",
                               "value": "User1"
                           },
                           {
                               "title": "Ack By:",
                               "value": "Not Acknowledged"
                           },
                           {
                               "title": "Urgency:",
                               "value": "High"
                           },
                           {
                               "title": "Priority:",
                               "value": "**P1**"
                           }
                       ]
                   }
               ]
           },
           {
               "type": "Container",
               "spacing": "Small",
               "style": "emphasis",
               "items": [
                   {
                       "type": "ActionSet",
                       "actions": [
                           {
                               "type": "Action.Submit",
                               "title": "🔔 Acknowledge",
                               "style": "default",
                               "data": {
                                   "actionTitle": "Acknowledge",
                                   "incidentId": "000001"
                               }
                           },
                           {
                               "type": "Action.Submit",
                               "title": "✓ Resolve",
                               "style": "default",
                               "data": {
                                   "actionTitle": "Resolve",
                                   "incidentId": "000001"
                               }
                           },
                           {
                               "type": "Action.ToggleVisibility",
                               "title": "📝 Notes",
                               "style": "default",
                               "targetElements": ["Notes_Container"]
                           },
                           {
                               "type": "Action.ShowCard",
                               "title": "⚙️ More Actions",
                               "card": {
                                   "type": "AdaptiveCard",
                                   "body": [
                                       {
                                           "type": "ActionSet",
                                           "actions": [
                                               {
                                                   "type": "Action.ShowCard",
                                                   "title": "⚠️ Change Priority",
                                                   "card": {
                                                       "type": "AdaptiveCard",
                                                       "body": [
                                                           {
                                                               "type": "TextBlock",
                                                               "text": "Current Priority:",
                                                               "weight": "Bolder"
                                                           },
                                                           {
                                                               "type": "TextBlock",
                                                               "text": "P1",
                                                               "spacing": "Small"
                                                           },
                                                           {
                                                               "type": "TextBlock",
                                                               "text": "Select new priority:",
                                                               "weight": "Bolder",
                                                               "spacing": "Medium"
                                                           },
                                                           {
                                                               "type": "Input.ChoiceSet",
                                                               "id": "newPriority",
                                                               "style": "expanded",
                                                               "choices": [
                                                                   {
                                                                       "title": "P1 - Critical",
                                                                       "value": "P1"
                                                                   },
                                                                   {
                                                                       "title": "P2 - High",
                                                                       "value": "P2"
                                                                   },
                                                                   {
                                                                       "title": "P3 - Medium",
                                                                       "value": "P3"
                                                                   },
                                                                   {
                                                                       "title": "P4 - Low",
                                                                       "value": "P4"
                                                                   }
                                                               ],
                                                               "wrap": true
                                                           },
                                                           {
                                                               "type": "ActionSet",
                                                               "actions": [
                                                                   {
                                                                       "type": "Action.Submit",
                                                                       "title": "✓ Update Priority",
                                                                       "style": "default",
                                                                       "data": {
                                                                           "actionTitle": "update_priority",
                                                                           "incidentId": "000001"
                                                                       }
                                                                   }
                                                               ]
                                                           }
                                                       ]
                                                   }
                                               },
                                               {
                                                   "type": "Action.ShowCard",
                                                   "title": "📋 Custom Fields",
                                                   "card": {
                                                       "type": "AdaptiveCard",
                                                       "body": [
                                                           {
                                                               "type": "TextBlock",
                                                               "text": "Custom Fields",
                                                               "weight": "Bolder",
                                                               "size": "Medium",
                                                               "spacing": "Medium"
                                                           },
                                                           {
                                                               "type": "Container",
                                                               "items": [
                                                                   {
                                                                       "type": "FactSet",
                                                                       "facts": [
                                                                           {
                                                                               "title": "No Custom Fields",
                                                                               "value": "No custom fields are configured for this incident"
                                                                           }
                                                                       ]
                                                                   }
                                                               ]
                                                           }
                                                       ]
                                                   }
                                               }
                                           ]
                                       }
                                   ]
                               }
                           }
                       ]
                   }
               ]
           },
           {
               "type": "Container",
               "id": "Notes_Container",
               "isVisible": false,
               "spacing": "Small",
               "style": "emphasis",
               "items": [
                   {
                       "type": "TextBlock",
                       "text": "Recent Notes",
                       "weight": "Bolder",
                       "size": "Medium",
                       "spacing": "Medium"
                   },
                   {
                       "type": "Container",
                       "items": [
                           {
                               "type": "FactSet",
                               "facts": [
                                   {
                                       "title": "No Notes",
                                       "value": "No notes have been added to this incident"
                                   }
                               ]
                           }
                       ],
                       "style": "default",
                       "spacing": "Small"
                   },
                   {
                       "type": "TextBlock",
                       "text": "Add New Note",
                       "weight": "Bolder",
                       "spacing": "Medium"
                   },
                   {
                       "type": "Input.Text",
                       "placeholder": "Add Notes",
                       "id": "noteContent",
                       "isMultiline": true
                   },
                   {
                       "type": "ActionSet",
                       "actions": [
                           {
                               "type": "Action.Submit",
                               "title": "✓ Add Note",
                               "style": "default",
                               "data": {
                                   "actionTitle": "Add Note",
                                   "incidentId": "000001"
                               }
                           }
                       ]
                   }
               ]
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