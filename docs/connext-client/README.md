# Connext Client

As described in [Architecture](../what-is-connext/architecture.md), the Connext Client package is a JavaScript interface which communicates with deployed Connext contracts and with other clients. The client package is available through [NPM](https://www.npmjs.com/package/connext) and or can be cloned from its [open source repository](https://github.com/ConnextProject/connext-client). In this section, we will outline installation of the client and important package methods.

The Connext Client is typically integrated into either the frontend of your application or directly into the wallet layer, allowing you to abstract away the technicalities of channels and threads.

The Client offers the following functionality, described in detail on the next pages:

1. Opening a channel to any counterparty and depositing funds. 
2. Opening a thread to any counterparty.
3. Closing a thread and automatically submitting the latest available mutually agreed update.
4. Closing a channel and automatically submitting the latest available mutually agreed update.
5. Handling a dispute.
6. Generating/signing/sending and validating/receiving state updates over HTTPs. The Client takes in the address of the server that is being used to pass messages in the constructor.



  
   
   








