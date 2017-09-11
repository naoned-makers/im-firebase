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
    const clientId = req.get('X-Client-ID');
    const tokenId = req.get('Authorization');
    if (clientId == functions.config().client.id && tokenId == 'Bearer ' + functions.config().client.key) {
        const webHookResponse = buildWebHookResponse(req.body.result.metadata.intentName, req.body.result.action, req.body.result.parameters, req.body.result.fulfillment, req.body.originalRequest);

        // Push the command in the right path
        admin.database()
            .ref(webHookResponse.commandPath)
            .set(webHookResponse.commandPlayLoad)
            .then(snapshot => {
                //TODO try not wait firebase response before api.ai response
                res.setHeader('Content-Type', 'application/json'); //Requires application/json MIME type
                res.send(JSON.stringify({
                    "source": "im-function",      //response data origin: internal code logic
                    "speech": webHookResponse.speech, //"speech" is the spoken version of the response
                    "displayText": webHookResponse.displayText,  //"displayText" is the visual version
                    "data": webHookResponse.data
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
function buildWebHookResponse(intentName, intentAction, intentParameter, apiaiUserResponse, originalRequest) {

    console.log('apiaiUserResponse',apiaiUserResponse);
    //originalRequest is undefined if the user is on api.ai ( test or web demo)
    if(!originalRequest){
        originalRequest = {source:'api.ai'}
    }
    console.log('originalRequest',originalRequest);
    
    let webHookResponse = {};
    if (intentName == 'sidepartmove') {
        //For MQTT broker throw firebase
        let entityCommand = intentParameter.side + intentParameter.sidepart + '/move';
        webHookResponse.commandPath = '/im/command/' + entityCommand;
        webHookResponse.commandPlayLoad = { origin: originalRequest.source, ts:Date.now() };
        //TODO remove entityCommand
        webHookResponse.speech = entityCommand+'->'+apiaiUserResponse.speech;
        webHookResponse.displayText = entityCommand;
    } else {
        webHookResponse.commandPath = '/im/command/' + intentAction;
        webHookResponse.commandPlayLoad = { origin: originalRequest.source, ts:Date.now() };
        //TODO remove entityCommand
        webHookResponse.speech = intentAction+'->'+apiaiUserResponse.speech;
        webHookResponse.displayText = intentAction;
    }
    //TODO for specific intégration
    webHookResponse.data = {
        "slack": { "text": "Ok Slack" } //put here the slack integration reponse exemple color,
    };
    return webHookResponse;
}