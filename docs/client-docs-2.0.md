# Connext Client Method Reference

#### Table of Contents

* [Connext](client-docs-2.0.md#connext)
  * [Parameters](client-docs-2.0.md#parameters)
  * [openChannel](client-docs-2.0.md#openchannel)
  * [deposit](client-docs-2.0.md#deposit)
  * [openThread](client-docs-2.0.md#openthread)
  * [joinThread](client-docs-2.0.md#jointhread)
  * [updateBalances](client-docs-2.0.md#updatebalances)
  * [closeThread](client-docs-2.0.md#closethread)
  * [closeThreads](client-docs-2.0.md#closethreads)
  * [closeChannel](client-docs-2.0.md#closechannel)
  * [withdraw](client-docs-2.0.md#withdraw)
  * [cosignLatestChannelUpdate](client-docs-2.0.md#cosignlatestchannelupdate)
  * [cosignChannelUpdate](client-docs-2.0.md#cosignchannelupdate)
  * [ChannelOpenTimeoutContractHandler](client-docs-2.0.md#channelopentimeoutcontracthandler)
  * [getUnjoinedThreads](client-docs-2.0.md#getunjoinedthreads-1)
  * [getThreadsByChannelId](client-docs-2.0.md#getthreadsbychannelid-1)
  * [getChannelIdByPartyA](client-docs-2.0.md#getchannelidbypartya-1)
  * [getThreadById](client-docs-2.0.md#getthreadbyid-1)
  * [getThreadByParties](client-docs-2.0.md#getthreadbyparties-1)
  * [getChannelById](client-docs-2.0.md#getchannelbyid-1)
  * [getChannelByPartyA](client-docs-2.0.md#getchannelbypartya-1)
  * [requestHubDeposit](client-docs-2.0.md#requesthubdeposit-1)
  * [getNewChannelId](client-docs-2.0.md#getnewchannelid-1)
  * [createChannelStateUpdateFingerprint](client-docs-2.0.md#createchannelstateupdatefingerprint-1)
  * [recoverSignerFromChannelStateUpdate](client-docs-2.0.md#recoversignerfromchannelstateupdate-1)
  * [createThreadStateUpdateFingerprint](client-docs-2.0.md#createthreadstateupdatefingerprint-1)
  * [recoverSignerFromThreadStateUpdate](client-docs-2.0.md#recoversignerfromthreadstateupdate-1)

### Connext

Class representing an instance of a Connext client.

#### Parameters

* `$0` [**Object**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) 
  * `$0.web3`  
  * `$0.hubAddress`   \(optional, default `''`\)
  * `$0.watcherUrl`   \(optional, default `''`\)
  * `$0.hubUrl`   \(optional, default `''`\)
  * `$0.contractAddress`   \(optional, default `''`\)
  * `$0.hubAuth`   \(optional, default `''`\)
  * `$0.useAxios`   \(optional, default `false`\)
* `web3Lib`   \(optional, default `Web3`\)
* `params` [**Object**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) the constructor object

#### openChannel

Opens a channel with hub \(Hub\) at the address provided when instantiating the Connext instance with the given initial deposit.

Sender defaults to accounts\[0\] if not supplied to the openChannel function.

channel challenge timer is determined by hub \(Hub\) if the parameter is not supplied. Current default value is 3600s \(1 hour\).

Uses the internal web3 instance to call the createChannel function on the Channel Manager contract, and logs the transaction hash of the channel creation. The function returns the ID of the created channel.

Once the channel is created on chain, users should call the requestJoinLc function to request that the hub joins the channel. This function should be called on a timeout sufficient for the hub to detect the channel and add it to its database.

If hub is unresponsive, or does not join the channel within the challenge period, the client function "ChannelOpenTimeoutContractHandler" can be called by the client to recover the funds.

**Parameters**

* `initialDeposits` [**Object**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) deposits in wei \(must have at least one deposit\)
  * `initialDeposits.ethDeposit` **BN** deposit in eth \(may be null\)
  * `initialDeposits.tokenDeposit` **BN** deposit in tokens \(may be null\)
* `tokenAddress`   \(optional, default `null`\)
* `sender` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) counterparty with hub in channel, defaults to accounts\[0\] \(optional, default `null`\)
* `challenge` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) \(optional\) challenge period in seconds \(optional, default `null`\)

**Examples**

```javascript
const deposit = Web3.utils.toBN(Web3.utils.toWei('1', 'ether))
const lcId = await connext.openChannel(deposit)
```

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to the channel id of the created channel

#### deposit

Adds a deposit to an existing channel by calling the contract function "deposit" using the internal web3 instance.

Can be used by any either channel party.

If sender is not supplied, it defaults to accounts\[0\]. If the recipient is not supplied, it defaults to the sender.

**Parameters**

* `deposits` [**Object**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) deposit object
  * `deposits.ethDeposit` **BN** value of the channel deposit in ETH
  * `deposits.tokenDeposit` **BN** value of the channel deposit in tokens
* `sender` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) ETH address sending funds to the channel \(optional, default `null`\)
* `recipient` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) ETH address recieving funds in their channel \(optional, default `sender`\)
* `tokenAddress` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional, for testing\) contract address of channel tokens \(optional, default `null`\)

**Examples**

```javascript
// get a BN
const deposit = Web3.utils.toBN(Web3.utils.toWei('1','ether'))
const txHash = await connext.deposit(deposit)
```

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to the transaction hash of the onchain deposit.

#### openThread

Opens a thread between "to" and sender with hub as the hub. Both users must have a channel open with hub.

If there is no deposit provided, then 100% of the channel balance is added to thread deposit. This function is to be called by the "A" party in a unidirectional scheme.

Signs a copy of the initial thread state, and generates a proposed channel update to the hub for countersigning that updates the number of open threads and the root hash of the channel state.

This proposed state update serves as the opening certificate for the thread, and is used to verify hub agreed to facilitate the creation of the thread and take on the counterparty risk.

**Parameters**

* `params` [**Object**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) the method object
  * `params.to` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ETH address you want to open a thread with
  * `params.deposit` **BN** \(optional\) deposit in wei for the thread, defaults to the entire LC balance \(optional, default `null`\)
  * `params.sender` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) who is initiating the thread creation, defaults to accounts\[0\] \(optional, default `null`\)

**Examples**

```javascript
const myFriendsAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
await connext.openThread({ to: myFriendsAddress })
```

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to the thread ID recieved by hub

#### joinThread

Joins thread with provided channelId with a deposit of 0 \(unidirectional channels\).

This function is to be called by the "B" party in a unidirectional scheme.

**Parameters**

* `threadId`  
* `sender` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) ETH address of the person joining the thread \(partyB\) \(optional, default `null`\)
* `channelId` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ID of the thread

**Examples**

```javascript
const channelId = 10 // pushed to partyB from hub
await connext.joinThread(channelId)
```

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to the thread ID

#### updateBalances

Send multiple balance updates simultaneously from a single account.

**Parameters**

* `payments` [**Array**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)**&lt;**[**Object**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&gt;** payments object
* `sender` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) defaults to accounts\[0\] \(optional, default `null`\)

#### closeThread

Closes a thread.

Retrieves the latest thread state update, and decomposes the thread into their respective channel updates.

The thread agent who called this function signs the closing channel update, and forwards the signature to hub.

hub verifies the signature, returns her signature of the proposed thread decomposition, and proposes the LC update for the other thread participant.

If hub does not return her signature on the proposed thread decomposition, the caller goes to chain by calling initVC and settleVC.

**Parameters**

* `threadId`  
* `sender`   \(optional, default `null`\)
* `channelId` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) ID of the thread to close

**Examples**

```javascript
await connext.closeThread({
  channelId: 0xadsf11..,
  balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
})
```

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to the signature of the hub on the generated update if accepted, or the result of closing the channel on chain if there is a dispute

#### closeThreads

Closes many threads by calling closeThread on each channel ID in the provided array.

**Parameters**

* `channelIds` [**Array**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)**&lt;**[**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&gt;** array of thread IDs you wish to close
* `sender`   \(optional, default `null`\)

**Examples**

```javascript
const channels = [
    0xasd310..,
    0xadsf11..,
]
await connext.closeThreads(channels)
```

#### closeChannel

Withdraws bonded funds from an existing channel.

All threads must be closed before a channel can be closed.

Generates the state update from the latest hub signed state with fast-close flag.

hub should countersign the closing update if it matches what she has signed previously, and the channel will fast close by calling consensuscloseThread on the contract.

If the state update doesn't match what hub previously signed, then updateLCState is called with the latest state and a challenge flag.

**Parameters**

* `sender`   \(optional, default `null`\)
* `null-null` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) who the transactions should be sent from, defaults to account\[0\]

**Examples**

```javascript
const success = await connext.closeChannel()
```

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to an object with the structure: { response: transactionHash, fastClosed: true}

#### withdraw

closeChannel bonded funds from channel after a channel is challenge-closed and the challenge period expires by calling withdraw using the internal web3 instance.

Looks up LC by the account address of the client-side user if sender parameter is not supplied.

Calls the "byzantinecloseThread" function on the contract.

**Parameters**

* `sender` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) the person sending the on chain transaction, defaults to accounts\[0\] \(optional, default `null`\)

**Examples**

```javascript
const success = await connext.closeChannel()
if (!success) {
  // wait out challenge timer
  await connext.withdraw()
}
```

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to the transaction hash from calling byzantinecloseThread

#### cosignLatestChannelUpdate

Verifies and cosigns the latest channel state update.

**Parameters**

* `channelId`  
* `sender` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) the person who cosigning the update, defaults to accounts\[0\] \(optional, default `null`\)
* `lcId` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) channel id

**Examples**

```javascript
const lcId = await connext.getChannelIdByPartyA() // get ID by accounts[0] and open status by default
await connext.cosignLatestChannelUpdate(channelId)
```

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to the cosigned channel state update

#### cosignChannelUpdate

Verifies and cosigns the channel state update indicated by the provided nonce.

**Parameters**

* `params` [**Object**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) the method object
  * `params.sender` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) the person who cosigning the update, defaults to accounts\[0\] \(optional, default `null`\)
  * `params.lcId` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) channel id
  * `params.channelId`  
  * `params.nonce`  

**Examples**

```javascript
const lcId = await connext.getChannelIdByPartyA() // get ID by accounts[0] and open status by default
await connext.cosignLatestChannelUpdate(lcId)
```

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to the cosigned channel state update

#### ChannelOpenTimeoutContractHandler

Watchers or users should call this to recover bonded funds if hub fails to join the channel within the challenge window.

**Parameters**

* `channelId`  
* `sender` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) who is calling the transaction \(defaults to accounts\[0\]\) \(optional, default `null`\)
* `lcId` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) channel id the hub did not join

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to the result of sending the transaction

#### getUnjoinedThreads

Requests the unjoined threads that have been initiated with you. All threads are unidirectional, and only the reciever of payments may have unjoined threads.

**Parameters**

* `partyB` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) ETH address of party who has yet to join thread threads. \(optional, default `null`\)

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to an array of unjoined thread objects

#### getThreadsByChannelId

Returns an array of the thread states associated with the given channel.

**Parameters**

* `channelId` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ID of the channel

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to an Array of thread objects

#### getChannelIdByPartyA

Returns the channel id between the supplied address and hub.

If no address is supplied, accounts\[0\] is used as partyA.

**Parameters**

* `partyA` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) address of the partyA in the channel with hub. \(optional, default `null`\)
* `status` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) \(optional\) state of thread, can be 0 \(opening\), 1 \(opened\), 2 \(settling\), or 3 \(settled\). Defaults to open channel. \(optional, default `null`\)

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to either the channel id between hub and supplied partyA, or an Array of the channel IDs between hub and partyA.

#### getThreadById

Returns an object representing the thread in the database.

**Parameters**

* `threadId` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) the ID of the thread

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to an object representing the thread

#### getThreadByParties

Returns an object representing the open thread between the two parties in the database.

**Parameters**

* `params` [**Object**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) the method object
  * `params.partyA` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ETH address of partyA in thread
  * `params.partyB` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ETH address of partyB in thread

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to the thread

#### getChannelById

Returns an object representing a channel.

**Parameters**

* `channelId`  
* `lcId` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) the channel id

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to the channel object

#### getChannelByPartyA

Returns object representing the channel between partyA and hub

**Parameters**

* `partyA` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \(optional\) partyA in channel. Default is accounts\[0\] \(optional, default `null`\)
* `status` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) \(optional\) state of thread, can be 0 \(opening\), 1 \(opened\), 2 \(settling\), or 3 \(settled\). Defaults to open channel. \(optional, default `null`\)

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to channel object

#### requestHubDeposit

Requests hub deposits into a given subchannel. hub must have sufficient balance in the "B" subchannel to cover the thread balance of "A" since hub is assuming the financial counterparty risk.

This function is to be used if the hub has insufficient balance in the channel to create proposed threads.

**Parameters**

* `params` [**Object**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) the method object
  * `params.channelId` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) id of the channel
  * `params.deposit` **BN** the deposit in Wei

Returns [**Promise**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to the transaction hash of hub calling the deposit function

#### getNewChannelId

Returns a new channel id that is a random hex string.

Returns [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) a random 32 byte channel ID.

#### createChannelStateUpdateFingerprint

Hashes the channel state update information using soliditySha3.

**Parameters**

* `params` [**Object**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) the method object
  * `params.isClose` [**Boolean**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean) flag indicating whether or not this is closing state
  * `params.nonce` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) the sequence of the channel update
  * `params.openVcs` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) the number of open threads associated with this channel
  * `params.vcRootHash` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) the root hash of the Merkle tree containing all initial states of the open threads
  * `params.partyA` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ETH address of partyA in the ledgerchannel
  * `params.partyI` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ETH address of the hub \(hub\)
  * `params.balanceA` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) updated balance of partyA
  * `params.balanceI` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) updated balance of partyI
  * `params.channelId`  
  * `params.ethBalanceA`  
  * `params.ethBalanceI`  
  * `params.tokenBalanceA`  
  * `params.tokenBalanceI`  

Returns [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) the hash of the state data

#### recoverSignerFromChannelStateUpdate

Recovers the signer from the hashed data generated by the Connext.createChannelStateUpdateFingerprint function.

**Parameters**

* `params` [**Object**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) the method object
  * `params.channelId` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ID of the channel you are creating a state update for
  * `params.sig` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) the signature of the data from an unknown agent
  * `params.isClose` [**Boolean**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean) flag indicating whether or not this is closing state
  * `params.nonce` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) the sequence of the channel update
  * `params.openVcs` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) the number of open threads associated with this channel
  * `params.vcRootHash` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) the root hash of the Merkle tree containing all initial states of the open threads
  * `params.partyA` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ETH address of partyA in the ledgerchannel
  * `params.partyI` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ETH address of the hub \(hub\)
  * `params.balanceA` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) updated balance of partyA
  * `params.balanceI` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) updated balance of partyI
  * `params.ethBalanceA`  
  * `params.ethBalanceI`  
  * `params.tokenBalanceA`  
  * `params.tokenBalanceI`  

Returns [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) the ETH address of the person who signed the data

#### createThreadStateUpdateFingerprint

Hashes data from a thread state update using soliditySha3.

**Parameters**

* `params` [**Object**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) the method object
  * `params.channelId` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ID of the thread you are creating a state update for
  * `params.nonce` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) the sequence of the state update
  * `params.partyA` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ETH address of partyA
  * `params.partyB` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ETH address of partyB
  * `params.balanceA` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) updated balance of partyA
  * `params.balanceB` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) updated balance of partyB
  * `params.ethBalanceA`  
  * `params.ethBalanceB`  
  * `params.tokenBalanceA`  
  * `params.tokenBalanceB`  

Returns [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) hash of the thread state data

#### recoverSignerFromThreadStateUpdate

Recovers the signer from the hashed data generated by the Connext.createThreadStateUpdateFingerprint function.

**Parameters**

* `params` [**Object**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) the method object
  * `params.sig` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) signature of the data created in Connext.createThreadStateUpdate
  * `params.channelId` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ID of the thread you are creating a state update for
  * `params.nonce` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) the sequence of the state update
  * `params.partyA` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ETH address of partyA
  * `params.partyB` [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ETH address of partyB
  * `params.balanceA` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) updated balance of partyA
  * `params.balanceB` [**Number**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) updated balance of partyB
  * `params.ethBalanceA`  
  * `params.ethBalanceB`  
  * `params.tokenBalanceA`  
  * `params.tokenBalanceB`  

Returns [**String**](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) ETH address of the person who signed the data

\`\`

