'use strict';
// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = global.functions || require('firebase-functions');
const firebase = global.firebase || require('firebase');
const admin = global.admin || require('firebase-admin');

let firebaseConfig = functions.config().firebase;
firebaseConfig.databaseAuthVariableOverride = { uid: "im-function" };
admin.initializeApp(firebaseConfig);

/*
* HTTP Cloud Function.
*
* @param {Object} req Cloud Function request context.
* @param {Object} res Cloud Function response context.
*/
exports.webhook = functions.https.onRequest((req, res) => {
    //Ansure the incoming request is from an authorized client
    //Check that the header 'X-Client-ID''apiai',
    //Check that the header 'Authorization': `Bearer <apiai.key>`
    var clientId = req.get('X-Client-ID');
    var tokenId = req.get('Authorization');
    if(!clientId){
        clientId =  request.query.X-Client-ID
    }
    if(!tokenId){
        tokenId = req.query.Authorization;
    }

    if (tokenId == 'Bearer ' + functions.config().client.key) {
        const webHookResponse = buildWebHookResponse(req.body.result.metadata.intentName, req.body.result.action, req.body.result.parameters, req.body.result.fulfillment, req.body.originalRequest, req.body.result.resolvedQuery);

        // Push the command in the right path
        admin.database()
            .ref(webHookResponse.commandPath)
            .set(webHookResponse.commandPayLoad)
            .then(snapshot => {
                console.log(req.body);
                console.log(webHookResponse);
                //TODO try not wait firebase response before api.ai response
                res.setHeader('Content-Type', 'application/json'); //Requires application/json MIME type
                res.send(JSON.stringify({
                    "source": "im-function",      //response data origin: internal code logic
                    "speech": webHookResponse.speech, //"speech" is the spoken version of the response
                    // "displayText": webHookResponse.displayText,  //"displayText" is the visual version
                    // "data": webHookResponse.data
                }));
            });
    } else {
        //UNKNOW client or auth token
        res.status(403).send('Auth Token is invalid');
        return;
    }
});

/*
* Build the im command and bot response
*
* @param {Object} intentName api.ai intentName
* @param {Object} intentAction api.ai intent declared action
* @param {Object} intentParameter api.ai guessed parameter
* @param {Object} apiaiUserResponse api.ai configured reponse to user
* @param {Object} originSource the original incoming request to the bot
* @return {Object} webHookResponse firebase and api.ai reponse data
*/
function buildWebHookResponse(intentName, intentAction, intentParameter, apiaiUserResponse, originalRequest, resolvedQuery) {

    console.log('apiaiUserResponse', apiaiUserResponse);
    //originalRequest is undefined if the user is on api.ai ( test or web demo)
    if (!originalRequest) {
        originalRequest = { source: 'api.ai' }
    }

    let webHookResponse = {};
    if (intentName == 'sidepartmove') {
        //For MQTT broker throw firebase
        let entityCommand = intentParameter.side + intentParameter.sidepart + '/move';
        webHookResponse.commandPath = '/im/command/' + entityCommand;
        //TODO remove entityCommand
        webHookResponse.speech = apiaiUserResponse.speech;
    } else {
        //For MQTT broker throw firebase
        webHookResponse.commandPath = '/im/command/' + intentAction;
        //TODO remove intentAction
        webHookResponse.speech = apiaiUserResponse.speech
    }
    webHookResponse.commandPayLoad = {
        origin: originalRequest.source,
        intent: intentName,
        parameter: intentParameter,
        request: resolvedQuery,
        response: apiaiUserResponse.speech,
        messages: apiaiUserResponse.messages,
        ts: Date.now()
    };
    //webHookResponse.displayText = entityCommand;
    //webHookResponse.data = {
    //    "slack": { "text": entityCommand } //put here the slack integration reponse exemple color,
    //};
    return webHookResponse;
    /** 
{
    speech: 'Doucement sur mon ciboulot',   //Text to be pronounced to the user / shown on the screen
        messages: 
    [{
        type: 0,                                //Equals to 0 for the Text response message type, Equals to 2 for the Quick replies message type.
        platform: 'slack',
        speech: 'Doucement sur mon ciboulot'    //Agent's text reply. 
    },
    { type: 0, 
        platform: 'slack',
         speech: 'For Slack' },
    { type: 0, 
        speech: 'Arrêtes, j\'ai mal au crâne' }]
}
*/
}
