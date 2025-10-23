Overview of the WhatsApp Business Platform with Twilio
(warning)
Warning

Twilio is launching a new Console. Some screenshots on this page may show the Legacy Console and therefore may no longer be accurate. We are working to update all screenshots to reflect the new Console experience. Learn more about the new Console

.

WhatsApp is the most popular messaging app in many parts of the world. With the WhatsApp Business Platform with Twilio

, you can send notifications, have two-way conversations, and build chatbots. If you're trying to reach and better converse with users in LATAM, EMEA, and APAC, then you need to consider using WhatsApp.
What is the WhatsApp Business Platform?

WhatsApp has three messaging products:

    WhatsApp Consumer app, with users around the globe
    WhatsApp Business app, generally used by small businesses and micro businesses
    WhatsApp Business Platform, previously known as the WhatsApp Business API

Twilio offers access to the WhatsApp Business Platform. Developers can use WhatsApp with all of Twilio's products, including the Programmable Messaging API, Conversations API, Twilio Flex and Studio. For more information, see WhatsApp Business Accounts with Twilio.
WhatsApp opt-in requirements
WhatsApp requires that your application implement explicit user opt-ins

to deliver messages over WhatsApp. You may gather this opt-in information either via a web page or a mobile app, such as during your application's sign-up flow, in your application's account settings, via SMS, etc. WhatsApp also requires businesses to respect opt-out requests from end users to maintain high number quality.
(warning)
Warning

Sending messages to end users without an opt-in may result in users blocking your business and may ultimately lead to the suspension of your WhatsApp Business account.
Using Twilio Phone Numbers with WhatsApp

On WhatsApp, users message each other using their phone numbers as identifiers. To send and receive WhatsApp messages using the Twilio Programmable Messaging API, you'll need a phone number as well. The Twilio API addresses WhatsApp users and your numbers, using the following prefixed address format:

whatsapp:<E.164 formatted phone number>

(E.164 is an international telephone number format; you will see it often in the strings that represent Twilio phone numbers.)
Enabling WhatsApp with a Twilio Number

To use WhatsApp messaging in production apps, you must enable WhatsApp on your Twilio number. For a step-by-step walkthrough of the process, visit our Self-Signup Guide for WhatsApp. If you're registering for WhatsApp on behalf of a third party, such as one of your clients, then you may be an Independent Software Vendor (ISV) and should follow the WhatsApp Tech Provider Program guide.

For information about using a non-Twilio number with WhatsApp, check out our Support guide Can I activate my own phone number for WhatsApp on Twilio?
Connect your Meta Business Manager Account

WhatsApp uses your Meta Business Manager account to identify your business and associate your WhatsApp Business Account (WABA) with it. To scale with WhatsApp, you will also need to verify your Meta Business Manager account. You can create or connect your Meta Business Manager account through Twilio's Self-Signup process in the Console.

If you are an ISV, you will need to provide Twilio with your Meta Business Manager ID before you or your end clients begin onboarding. If you do not already have a Meta Business Manager account, follow Facebook's instructions to create one
. Your Meta Business Manager ID can be found in the "Business Info" section

under Business Settings.
Twilio business manager info with verification status and contact details.
Manage and configure your WhatsApp-enabled Twilio numbers

You can register new numbers for WhatsApp directly in the Twilio Console by following our Self-Signup Guide for WhatsApp. If you are an ISV following the WhatsApp Tech Provider Program, you'll need to request to have WhatsApp numbers registered by Twilio's Operations team. As part of the onboarding process, either you or Twilio's Operations team will create a WhatsApp Business Account (WABA) and associate it with your Twilio Account SID. Only one WABA is allowed per Twilio Account at this time.

As of January 2023, WhatsApp has imposed new limitations on phone numbers and WABAs:

    Phone Number limits applied across all WABAs per single Meta Business Manager
        Businesses that don't have a verified Meta Business Manager are allowed a max of 2 phone numbers per Meta Business Manager across all WABAs.
        Businesses with a verified Meta Business Manager account can have up to 20 phone numbers. An exception for up to 50 phone numbers can be requested by opening a support ticket. Higher limits may be made available with a second appeal and a valid use case justification, at WhatsApp's discretion.

    WABA limits:
        Businesses with a verified Meta Business Manager can have a max of 20 WABAs across their Meta Business Manager.
        Businesses that have an Official Business Account (OBA) are allowed up to 1000 WABAs.

Most businesses that onboarded prior to January 2023, and those with higher limits previously, are exempt from these limitations. WhatsApp reserves the right to restrict the numbers and WABAs for any reasons and if they see any evidence of scams or severe spam on an account, at their discretion.
WhatsApp enabled senders list with status approved by WhatsApp.

Once your number has been enabled for WhatsApp, it can be used as a WhatsApp Sender. Clicking on a specific Sender takes you to its specific Configuration page. This includes the Endpoint configuration section, where you can specify what action Twilio should take when it receives a WhatsApp message at this number. You can configure this sender as part of a Messaging Service or with an individual webhook URL.

You can also update all your profile details here.
WhatsApp sender configuration with webhook URLs and HTTP Post methods.
Sending notifications with WhatsApp

WhatsApp requires that business-initiated notifications sent by your application be templated and pre-registered, with the exception of messages sent as a reply to a user-initiated message. (See Conversational Messaging on WhatsApp for more details).

To manage your own WhatsApp profile, go to Messaging > Senders > WhatsApp Senders in the Console. There, you can see the list of your WhatsApp-enabled Twilio phone numbers (senders).

To see and manage templates and their approvals, go to Messaging > Content Template Builder.

To learn more, consult our Guide to Sending WhatsApp Notifications Using Message Templates.
Conversational Messaging on WhatsApp

To have 2-way conversations with end users, you need to be able to receive messages from them. Users can send your business messages either directly or in response to a templated notification.
How to initiate a customer service window

A customer service window begins when a user sends a message to your app. Customer service windows are valid for 24 hours after the most recently received message, during which you can communicate with customers using free-form messages. To send a message outside the customer service window, you must use a pre-approved message template. (See our Guide to WhatsApp Message Templates).
Configuring inbound message webhooks

When customers send you a WhatsApp message, Twilio sends a webhook (a request to a URL that you specify) to your application. You can configure the URL to which Twilio sends a webhook when it receives inbound messages in the Twilio Console:

    on the Sandbox page
    on the page for WhatsApp-enabled numbers
    under the "Integration" section of your settings for a specific Messaging Service (Under the Messaging Services section of the Console)

Configuring Fallback URLs for your WhatsApp-enabled Senders

Optionally, you can configure a Fallback URL in the same place that you set your default webhook URL. If a fatal error occurs while making a request to your primary webhook URL, Twilio "falls back" to this secondary fallback URL.

When making the request to your fallback URL, Twilio also submits the ErrorCode and ErrorUrl parameters, indicating the error code of the failure and the URL for which the failure occurred.
WhatsApp sandbox setup with number, phrase, and callback URL fields.
Configure WhatsApp Sender.
Configuring Inbound Message Webhooks for Twilio Sandbox for WhatsApp	Configuring Inbound Message webhooks for your WhatsApp enabled Twilio number

For details on the data provided in the request that Twilio makes to your application (via the webhook URL), read more about Twilio's requests to your application.
Receiving a WhatsApp message

The webhook for inbound messages uses the same format as incoming SMS and MMS messages, with the exception that To and From addresses will be set to WhatsApp addresses (whatsapp:<your E.164 number> and whatsapp:<User's E.164 phone number>), respectively.

Incoming messages may include text or media. The Body field contains the message text, and the MediaUrl0 field contains a link to the media file. You can learn how to download incoming media included in a message in the Receive and Download Images on Incoming MMS Messages tutorial. Supported media include images (JPG, JPEG, PNG), audio files, and PDF files, with a size limit of 16MB per message.
Responding to Incoming Messages with TwiML

WhatsApp incoming messages are fully supported by TwiML, allowing you to seamlessly use your existing SMS app with WhatsApp. For more information, check out Documentation on How to Use TwiML.
Sending a freeform WhatsApp message using the API

Within a WhatsApp session, you can send freeform messages using the Programmable Messaging API. Freeform messages may include text, media and certain rich messages created with Content Templates.
Web links in freeform WhatsApp messages

Freeform WhatsApp messages that include web links will display a web page snippet preview when received on the WhatsApp client.
Send an outbound freeform WhatsApp Message

// Download the helper library from https://www.twilio.com/docs/node/install

const twilio = require("twilio"); // Or, for ESM: import twilio from "twilio";


// Find your Account SID and Auth Token at twilio.com/console

// and set the environment variables. See http://twil.io/secure

const accountSid = process.env.TWILIO_ACCOUNT_SID;

const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);


async function createMessage() {

  const message = await client.messages.create({

    body: "Hello, there!",

    from: "whatsapp:+14155238886",

    to: "whatsapp:+15005550006",

  });


  console.log(message.body);

}


createMessage();

Response

{

  "account_sid": "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

  "api_version": "2010-04-01",

  "body": "Hello, there!",

  "date_created": "Thu, 24 Aug 2023 05:01:45 +0000",

  "date_sent": "Thu, 24 Aug 2023 05:01:45 +0000",

  "date_updated": "Thu, 24 Aug 2023 05:01:45 +0000",

  "direction": "outbound-api",

  "error_code": null,

  "error_message": null,

  "from": "whatsapp:+14155238886",

  "num_media": "0",

  "num_segments": "1",

  "price": null,

  "price_unit": null,

  "messaging_service_sid": "MGaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

  "sid": "SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

  "status": "queued",

  "subresource_uris": {

    "media": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Media.json"

  },

  "to": "whatsapp:+15005550006",

  "uri": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json"

}

Send a freeform WhatsApp message with media

// Download the helper library from https://www.twilio.com/docs/node/install

const twilio = require("twilio"); // Or, for ESM: import twilio from "twilio";


// Find your Account SID and Auth Token at twilio.com/console

// and set the environment variables. See http://twil.io/secure

const accountSid = process.env.TWILIO_ACCOUNT_SID;

const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);


async function createMessage() {

  const message = await client.messages.create({

    body: "Here's that picture of an owl you requested.",

    from: "whatsapp:+14155238886",

    mediaUrl: ["https://demo.twilio.com/owl.png"],

    to: "whatsapp:+15017122661",

  });


  console.log(message.body);

}


createMessage();

Response

{

  "account_sid": "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

  "api_version": "2010-04-01",

  "body": "Here's that picture of an owl you requested.",

  "date_created": "Thu, 24 Aug 2023 05:01:45 +0000",

  "date_sent": "Thu, 24 Aug 2023 05:01:45 +0000",

  "date_updated": "Thu, 24 Aug 2023 05:01:45 +0000",

  "direction": "outbound-api",

  "error_code": null,

  "error_message": null,

  "from": "whatsapp:+14155238886",

  "num_media": "0",

  "num_segments": "1",

  "price": null,

  "price_unit": null,

  "messaging_service_sid": "MGaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

  "sid": "SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

  "status": "queued",

  "subresource_uris": {

    "media": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Media.json"

  },

  "to": "whatsapp:+15017122661",

  "uri": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json"

}

Monitor the status of your WhatsApp outbound message

To receive real-time status updates for outbound messages, you can choose to set a Status Callback URL. Twilio sends a request to this URL each time your message status changes to one of the transition values in the Message Status Callback Event Flow diagram.

You can set the Status Callback URL in the Console, or when you send an individual outbound message, by including the StatusCallback parameter. You can set the status callback URL in different parts of the Twilio Console depending on your messaging setup:

    For the WhatsApp Sandbox

or an individual WhatsApp Sender
-read WhatsApp and other messaging channels for additional properties that Twilio sends to your callback URL
For a Messaging Service

    (under the Integration settings for a specific Messaging Service) - read the status callback with a Messaging service guide for configuration options

When you set the Status Callback URL, Twilio sends a POST request to that URL, including the message sid (the Message's Unique identifier) and other standard request parameters as well as a status and an associated error_code if any. Refer to the API Reference for the Message Resource for a list of parameters that Twilio sends to your callback URL.
Send a WhatsApp Message and specify a StatusCallback URL

// Download the helper library from https://www.twilio.com/docs/node/install

const twilio = require("twilio"); // Or, for ESM: import twilio from "twilio";


// Find your Account SID and Auth Token at twilio.com/console

// and set the environment variables. See http://twil.io/secure

const accountSid = process.env.TWILIO_ACCOUNT_SID;

const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);


async function createMessage() {

  const message = await client.messages.create({

    body: "Hey, I just met you, and this is crazy...",

    from: "whatsapp:+14155238886",

    statusCallback: "http://postb.in/1234abcd",

    to: "whatsapp:+15005550006",

  });


  console.log(message.body);

}


createMessage();

Response

{

  "account_sid": "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

  "api_version": "2010-04-01",

  "body": "Hey, I just met you, and this is crazy...",

  "date_created": "Thu, 24 Aug 2023 05:01:45 +0000",

  "date_sent": "Thu, 24 Aug 2023 05:01:45 +0000",

  "date_updated": "Thu, 24 Aug 2023 05:01:45 +0000",

  "direction": "outbound-api",

  "error_code": null,

  "error_message": null,

  "from": "whatsapp:+14155238886",

  "num_media": "0",

  "num_segments": "1",

  "price": null,

  "price_unit": null,

  "messaging_service_sid": "MGaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

  "sid": "SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

  "status": "queued",

  "subresource_uris": {

    "media": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Media.json"

  },

  "to": "whatsapp:+15005550006",

  "uri": "/2010-04-01/Accounts/ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Messages/SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json"

}