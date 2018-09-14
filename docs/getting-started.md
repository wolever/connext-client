# Getting Started

_As mentioned in_ [_Architecture_](what-is-connext/architecture.md)_, Connext is composed of several discrete repositories that interoperate. Here, we outline typical end-to-end usage of the Connext Client package, an npm package designed to be used in conjunction with the Connext Hub and pre-deployed contracts._

_The client package is available through_ [_NPM_](https://www.npmjs.com/package/connext) _and or can be cloned from its_ [_open source repository_](https://github.com/ConnextProject/connext-client)_. In this section, we will outline installation of the client and important package methods._

_The Connext Client is typically integrated into either the frontend of your application or directly into the wallet layer, allowing you to abstract away the technicalities of channels and threads._

_The Client offers the following functionality, described in detail below:_

1. _Opening a channel to any counterparty and depositing funds._ 
2. _Opening a thread to any counterparty._
3. _Closing a thread and automatically submitting the latest available mutually agreed update._
4. _Closing a channel and automatically submitting the latest available mutually agreed update._
5. _Handling a dispute._
6. _Generating/signing/sending and validating/receiving state updates over HTTPs. The Client takes in the address of the server that is being used to pass messages in the constructor._

## **Prerequisites** 

This package is designed for use within a DApp. The package relies on an injected Web3 object from the browser \(e.g., MetaMask, which is how the package was developed and tested\).

## async/await 

Most functions in this package return Promises. The preferred way to consume the package is to use async/await syntax.

```javascript
// React App.js 
async componentDidMount () {
    try {
     const connext = new Connext(this.state.web3)
     await connext.openChannel(Web3.utils.toBN(Web3.utils.toWei(1, 'ether'))) 
     } catch (e) {
        console.log(e)
   }
}  
```

## Installation

To get started, you can clone [this repository](https://github.com/ConnextProject/connext-client) or download the Connext package via npm.

```text
npm i connext
```

## Interacting with the Hub

As we mentioned earlier, the Connext Client is used in conjunction with Connext Hubs. All of your interactions with the hub will be done via the Client.

## Initiating a new Client instance 

Before we can open channels and conduct transactions, we need to initiate a new Client instance. We've already authenticated the Hub, so we can go ahead and calling the class constructor:

```javascript
// Initiate client instance
  client = new Connext({
    web3,
    hubAddress,
    watcherUrl,
    hubUrl,
    contractAddress
  })
```

## Opening a channel between the Hub and a counterparty

The first step in transacting is opening a channel between the Connext Hub and a counterparty \(that is, someone the hub wants to transact with\). The client is initiated, so we can call [`openChannel()`](client-docs-2.0.md#openchannel) to open a channel between the hub and its first counterparty \(let's call her Alice\).

```javascript
// Open channel between Hub and Alice
async () => {
  channelForAlice = await client.openChannel(
  Web3.utils.toBN(Web3.utils.toWei('1', 'ether')),
  partyA
  )
}
```

Once the channel is opened, the Hub will automatically join with balance 0.

Keep in mind that opening a channel involves a transaction on the blockchain and will incur confirmation time. As a result, we'll want to use an `interval()` or other similar method to ensure that the channel has opened before moving forward in our script.

This process can be repeated for additional counterparties that wish to transact with the hub. The main constraint is collateralization in channels; the quantity of funds in each channel opened must be matched equally by funds held by the hub. 

## Requesting a deposit from the Hub

In the case that the hub is under-collateralized for a specific channel, we can call [`requestHubDeposit()`](client-docs-2.0.md#requesthubdeposit-1) to request a deposit into that channel:

```javascript
//Request deposit into channel to cover the funds that Alice has placed in the channel
const deposit = Web3.utils.toBN(channelForAlice.balanceA) 
async() =>{
  await client.requestHubDeposit({
    channelId: channelForAlice,
    deposit
  })
}
```

If the hub has insufficient funds, it will return a 500 error code. 

## Opening a Thread

Once we have opened channels with at least two parties \(let's call them Alice and Bob\), we can open a thread between those parties _without_ opening a channel between them. We do this by calling [`openThread()`](client-docs-2.0.md#openthread):

```javascript
//Open thread between Alice and Bob
async() =>{
aliceToBobThread = await client.openThread({
          to: Bob,
          sender: Alice,
          deposit: initialDeposit
        })
} 
```

This will open a unidirectional thread from Alice to Bob, in which _she can pay him_ \(not the other way around\). If Bob wishes to pay Alice, another channel can be opened in the opposite direction \(that is, with Bob as the sender\).

As you may have guessed, this means that parties can have multiple threads open at once, in either direction. They will be able to send and receive state updates in multiple open threads, bounded by the quantity of funds they've deposited.

## Transacting in a channel or thread

Now that we've opened both channels and threads, let's get started with payments! To change the balances in our thread or channel, we call [`updateBalances()`](client-docs-2.0.md#updatebalances). This will allow us to specify new balances. For example, if Alice starts a thread with Bob using 1 ETH and wants to pay Bob 0.5 ETH, we would submit a balance update in which both parties have 0.5 ETH. When a valid update is sent, it is "signed" by both parties, and both parties retain a record of the update.

```javascript
//Update balances in thread
await client.updateBalances(
        [
          {
            type: 'VIRTUAL',
            channelId: aliceToBobThread,
            payment: {
              balanceAlice,
              balanceBob
            },
            meta: {
              receiver: '{hubAddress}',
              type: 'UNCATEGORIZED',
              fields: {
                productSku: 1234,
                productName: 'newProduct',
              }
            }
          }
        ],
        Alice
      )
```

`updateBalances()` can be called on either channels or threads. Depending on your use case, you may only need to open channels; if your users are mostly transacting with you \(i.e., the hub\), channels may be sufficient. Threads are particularly suited to interactions between participants in your ecosystem that needn't directly involve you.

With `updateBalances()`, parties can send and receive multiple updates across multiple VCs.

Please note that the `meta` field in the example specifies type as `UNCATEGORIZED`. It should be left as such for general use; other use-case-specific types may be added in the future.

## Closing Threads 

When Alice and Bob are finished transacting in their thread, we can close it using [`closeThread()`](client-docs-2.0.md#closethread). When `closeThread()` is called, there are two possible scenarios: \(i\) the hub agrees with the balance that Alice has submitted and countersigns the submitted update or \(ii\) the hub disagrees and does not countersign the update. 

**Let's look at the "happy case" \(they agree\) first:**

```javascript
//Closing thread: Happy case
await client.closeThread(aliceToBobThread.channelId, Alice)
```

When the hub countersigns the transaction, Bob and Alice's balances will automatically be updated in their respective channels with the hub.

**How to handle dispute case:**

If Alice and the hub disagree on final thread balances, the hub will not countersign the update that Alice submits using `closeThread()` and will instead return error code `651`. 

To resolve the error, we will need to initiate a dispute resolution process. First, we call `initThreadStateContractHandler()` to put the initial state on the blockchain. Essentially, this tells the blockchain that the two parties agreed to enter into their channel with a given set of funds, under a set of dispute conditions. 

```javascript
//Put initial thread state on-chain
await client.initThreadStateContractHandler({
        channelId: channelForAlice, // caller channel
        aliceToBobThread,//Thread Id
        nonce: 0,
        Alice, //Thread sender
        Bob, // Thread recipient
        balanceA: Web3.utils.toBN(aliceToBobThread.balanceA), // initial balance
        balanceB: Web3.utils.toBN(aliceToBobThread.balanceB), // initial balance; should always be 0
        sigAlice: aliceToBobThread.sigAlice, //signature provided when starting channel
        sender: Alice // optional, for testing
      })
```

Once that transaction is confirmed on-chain \(which may take a few minutes\), we identify the most recent double-signed thread update \(the update with the highest "nonce"\) using `getLatestThreadStateUpdate()` and submit it to the blockchain using `settleThreadContractHandler()`.

```javascript
//Settle thread using latest nonce
let threadN = await client.getLatestThreadStateUpdate(aliceToBobThread)
const response = await client.settleThreadContractHandler({
  channelId: channelForAlice,
  aliceToBobThread,
  nonce: threadN.nonce,
  Alice,
  Bob, 
  balanceA: Web3.utils.toBN(aliceToBobThread.balanceA),
  balanceB: Web3.utils.toBN(aliceToBobThread.balanceB),
  sigAlice: vcN.sigAlice, //signature on latest nonce-dd transaction
  sender: Alice 
})
```

Calling this function will initiate a challenge period, during which Alice will have the opportunity to submit a more recent, double-signed state update using the same method. For her, this complexity is easily abstracted away through UX.

Once the challenge period expires, we can resolve the channels off-chain \(with the information that we settled on-chain\) using `closeThreadContractHandler()`:

```javascript
 //Resolve virtual channels using information settled via the blockchain
 await client.closeThreadContractHandler({
    channelId: channelForAlice, // Sender's channel
    aliceToBobThread,
    sender: Alice // optional, defaults to accounts[0]
   })
```

While this ensures that Alice and Bob receive \(or pay\) the funds consistent with the most recent amount to which they agreed, it entails three on-chain transactions and is therefore a costly and time-consuming process. This discourages Alice from submitting falsified state updates.

## Closing Channels

Once all of Alice's virtual channels are closed, she can close her channel with the hub. In the happy case \(where everyone agrees on the balances\), this works in a similar manner to `closeThread()`: we call `closeChannel()` and funds are disbursed appropriately to the hub's wallet and Alice's wallet.

```javascript
//Close channel: Happy case
await client.closeChannel(Alice)
```

**How to handle dispute case:** 

If Alice and the hub disagree on final channel balances, the hub will not countersign the update that Alice submits using `closeChannel()` and will instead return error code `601`. To resolve the error, we will need to initiate another dispute resolution process. First, we call `updateChannelStateContractHandler()` to put the current state of the channel on the blockchain. Recall that the channel was established with an on-chain transaction, so we only need to put the most recent state on-chain rather than both states.

```javascript
//Update channel state on blockchain
const response = await client.updateChannelStateContractHandler({
        channelId: channelForAlice, 
        nonce: channelForAlice.nonce,
        balanceAlice,
        balanceHub,
        sigAlice: channelForAlice.sigAlice,
        sigHub: channelForAlice.sigHub,
        threadRootHash,
        sender: null
      })
```

This function call will initiate a challenge timer, during which Alice can attempt to submit a state update with a higher nonce. At the end of that challenge timer, funds will be distributed within the channel in accordance with the highest nonce-d state update. 

Finally, we will need to call `withdraw()`, which will allocate funds to the hub's and Alice's respective wallets:

```javascript
//Withdraw funds from settled channel
await client.withdraw()
```



