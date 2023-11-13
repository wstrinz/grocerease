require("dotenv").config(); // This line should be at the very top
const express = require("express");
const { OpenAI } = require("openai");
const fs = require("fs").promises;
const app = express();
const path = require("path");
const session = require("express-session");
const basicAuth = require("express-basic-auth");
const RedisStore = require('connect-redis').default;
const redis = require('redis');

app.use(express.json({ limit: "50mb" }));

app.use(express.static("public"));

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

redisClient.on('error', function(err) {
  console.log('Could not establish a connection with Redis. ' + err);
});
redisClient.on('connect', function(err) {
  console.log('Connected to Redis successfully');
});

// Session configuration
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SECRET_KEY_BASE,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 6 * 30.44 * 24 * 60 * 60 * 1000, // 6 months
    }
  })
);

// Authentication middleware
const myAuthorizer = (username, password) => {
  const userMatches = basicAuth.safeCompare(
    username,
    process.env.BASIC_AUTH_USERNAME
  );
  const passwordMatches = basicAuth.safeCompare(
    password,
    process.env.BASIC_AUTH_PASSWORD
  );

  return userMatches & passwordMatches;
};

const authMiddleware = (req, res, next) => {
  if (req.session.authenticated) {
    return next(); // Skip auth check if session is authenticated
  }

  basicAuth({ authorizer: myAuthorizer, challenge: true })(req, res, () => {
    req.session.authenticated = true; // Set session as authenticated
    next();
  });
};

// Apply auth middleware
app.use(authMiddleware);

const openai = new OpenAI(process.env.OPENAI_API_KEY);


async function transcribeImage(imageData) {
  const message = `
    This is a picture of a grocery list. Please transcribe it, and organize the items into categories.

    If you are absolutely certain this is not a picture of a grocery list, please say so. Also say something moderately insulting about what the user wrote, in a style one might find in a Terry Pratchett book. Really, seriously roast them.
    Don't actually mention Terry Pratchett or any specific items from his books, just use the style. Don't specifically mention groceries or lists, and don't use any newlines.

    If this is a picture of a grocery list, please transcribe it and organize the items into categories according to the following rules:

    Do not extemporize or talk like Terry Pratchett or insult the user.

    Include emojis in each category name, but place them at the end. Always try to give a category an emoji, but don't give any individual item an emoji.

    If any text is illegible, make your best guess as to what it says and put it in a category called "Unsure".

    If an item doesn't belong in a clear category and it is not "Unsure", place it in "Other".

    Only list the items and categories, not any speculation or explanation.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: message,
          },
          {
            type: "image_url",
            image_url: `data:image/jpeg;base64,${imageData}`,
          },
        ],
      },
    ],
    max_tokens: 4000,
  });

  console.log(response.choices[0]);

  return response.choices[0].message.content;
}

async function parseItems(text) {
  const message = `
  Take this text grocery list and please parse it into a JSON object.

  Include emojis in each category name, but place them at the end. Always include the category emoji/s even if you have to make it up.

  Here is the text:

  ${text}
  `;

  const messages = [{ role: "user", content: message }];
  const tools = [
    {
      type: "function",
      function: {
        name: "grocery_items",
        description: "Parse a list of grocery items from a string",
        parameters: {
          type: "object",
          description: "List of grocery items with name and category",
          properties: {
            items: {
              type: "array",
              description: "Array of grocery items with name and category",
              items: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    description: "The category of the item",
                  },
                  name: { type: "string", description: "The name of the item" },
                  emoji: {
                    type: "string",
                    description: "The emoji or emojis for the item's category",
                  },
                },
                required: ["category", "name", "emoji"],
              },
            },
          },
        },
      },
    },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    messages: messages,
    tools: tools,
    tool_choice: "auto", // auto is default, but we'll be explicit
  });

  console.log(response.choices[0].message.tool_calls);
  const responseMessage = response.choices[0].message;

  return responseMessage;
}

async function isGrocerylist(text) {
  const firstHundredChars = text.slice(0, 100);

  const message = `
  Please tell me if the following message is a transcribe grocery list, or a message about something that is not a grocery list.

  ${firstHundredChars}
  `;

  const messages = [{ role: "user", content: message }];
  const tools = [
    {
      type: "function",
      function: {
        name: "is_grocery_list",
        description: "Determine if a string is a grocery list or not",
        parameters: {
          type: "object",
          description: "Whether or not the message is a grocery list",
          properties: {
            isGrocerylist: {
              type: "boolean",
              description: "Whether or not the message is a grocery list",
            },
          },
          required: ["isGrocerylist"],
        },
      },
    },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4-1106-preview",
    messages: messages,
    tools: tools,
    tool_choice: "auto", // auto is default, but we'll be explicit
  });

  const isList = JSON.parse(
    response.choices[0].message.tool_calls[0].function.arguments
  ).isGrocerylist;

  console.log("islist", response.choices[0].message.tool_calls, isList);

  return isList;
}

app.post("/transcribe", async (req, res) => {
  const base64image = req.body.imagePath; // Assuming the request includes the path to the image

  try {
    const transcribed = await transcribeImage(base64image);

    const isList = await isGrocerylist(transcribed);

    if (isList) {
      const formatted = await parseItems(transcribed);

      // Process the response to fit your needs before sending it back
      res.json({ text: formatted });
    } else {
      res.json({ error: transcribed });
    }
  } catch (error) {
    debugger;
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the image." });
  }
});

app.get("/client.js", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "client.js"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(3000, () => console.log("Server is running on port 3000."));
