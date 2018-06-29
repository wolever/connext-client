<br/>
<br/>
<br/>

<a id="Connext"></a>

<h2>Connext</h2>Class representing an instance of a Connext client.

**Kind**: global class  

* [Connext](#Connext)
    * [new Connext(params)](#new_Connext_new)
    * _instance_
        * [.register(initialDeposit, sender, challenge)](#Connext+register) ⇒ <code>String</code>
        * [.deposit(depositInWei, sender, recipient)](#Connext+deposit) ⇒ <code>String</code>
        * [.openChannel(params)](#Connext+openChannel) ⇒ <code>String</code>
        * [.joinChannel(channelId, sender)](#Connext+joinChannel)
        * [.updateBalance(params)](#Connext+updateBalance) ⇒ <code>String</code>
        * [.closeChannel(channelId)](#Connext+closeChannel)
        * [.closeChannels(channelIds)](#Connext+closeChannels)
        * [.withdraw(sender)](#Connext+withdraw) ⇒ <code>Object</code> \| <code>String</code> \| <code>Boolean</code>
        * [.withdrawFinal()](#Connext+withdrawFinal)
        * [.checkpoint()](#Connext+checkpoint)
        * [.cosignLCUpdate(params)](#Connext+cosignLCUpdate)
        * [.createLCStateUpdate(params)](#Connext+createLCStateUpdate) ⇒ <code>String</code>
        * [.createVCStateUpdate(params)](#Connext+createVCStateUpdate) ⇒ <code>String</code>
        * [.LCOpenTimeoutContractHandler(params)](#Connext+LCOpenTimeoutContractHandler)
        * [.getLcId(partyA)](#Connext+getLcId) ⇒ <code>Object</code>
        * [.getChannelById(channelId)](#Connext+getChannelById) ⇒ <code>Object</code>
        * [.getChannelByParties(params)](#Connext+getChannelByParties) ⇒ <code>Object</code>
        * [.getLcById(lcId)](#Connext+getLcById) ⇒ <code>Object</code>
        * [.getLcByPartyA(partyA)](#Connext+getLcByPartyA) ⇒ <code>Object</code>
        * [.getLatestVCStateUpdate(channelId)](#Connext+getLatestVCStateUpdate) ⇒ <code>Object</code>
    * _static_
        * [.getNewChannelId()](#Connext.getNewChannelId) ⇒ <code>String</code>
        * [.createLCStateUpdateFingerprint(params)](#Connext.createLCStateUpdateFingerprint) ⇒ <code>String</code>
        * [.recoverSignerFromLCStateUpdate(params)](#Connext.recoverSignerFromLCStateUpdate) ⇒ <code>String</code>
        * [.createVCStateUpdateFingerprint(params)](#Connext.createVCStateUpdateFingerprint) ⇒ <code>String</code>
        * [.recoverSignerFromVCStateUpdate(params)](#Connext.recoverSignerFromVCStateUpdate) ⇒ <code>String</code>

<br/>
<br/>
<br/>

<a id="new_Connext_new"></a>

<h2>new Connext(params)</h2>Create an instance of the Connext client.


| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the constructor object |
| params.web3 | <code>Web3</code> | the web3 instance |
| params.ingridAddress | <code>String</code> | ETH address of intermediary (defaults to Connext hub) |
| params.watcherUrl | <code>String</code> | url of watcher server (defaults to Connext hub) |
| params.ingridUrl | <code>String</code> | url of intermediary server (defaults to Connext hub) |
| params.contractAddress | <code>String</code> | address of deployed contract (defaults to latest deployed contract) |
| params.hubAuth | <code>String</code> | token authorizing client package to make requests to hub |

<br/>
<br/>
<br/>

<a id="Connext+register"></a>

<h2>connext.register(initialDeposit, sender, challenge) ⇒ <code>String</code></h2>Opens a ledger channel with ingridAddress and bonds initialDeposit. 

Ledger channel challenge timer is determined by Ingrid (Hub) if the parameter is not supplied.

Sender defaults to accounts[0] if not supplied by register.

Uses web3 to call createChannel function on the contract, and pings Ingrid with opening signature and initial deposit so she may join the channel.

If Ingrid is unresponsive, or does not join the channel within the challenge period, the client function "LCOpenTimeoutContractHandler" can be called by the client to recover the funds.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - the ledger channel id of the created channel  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| initialDeposit | <code>BigNumber</code> |  | deposit in wei |
| sender | <code>String</code> | <code></code> | (optional) counterparty with hub in ledger channel, defaults to accounts[0] |
| challenge | <code>Number</code> | <code></code> | (optional) challenge period in seconds |

**Example**  
```js
// get a BN of a deposit value in wei
const deposit = Web3.utils.toBN(Web3.utils.toWei('1', 'ether))
const lcId = await connext.register(deposit)
```
<br/>
<br/>
<br/>

<a id="Connext+deposit"></a>

<h2>connext.deposit(depositInWei, sender, recipient) ⇒ <code>String</code></h2>Adds a deposit to an existing ledger channel. Calls contract function "deposit".

Can be used by any party who wants to deposit funds into a ledger channel.

If sender is not supplied, it defaults to accounts[0]. If the recipient is not supplied, it defaults to the sender.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - the transaction hash of the onchain deposit.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| depositInWei | <code>BigNumber</code> |  | value of the deposit |
| sender | <code>String</code> | <code></code> | (optional) ETH address sending funds to the ledger channel |
| recipient | <code>String</code> |  | (optional) ETH address recieving funds in their ledger channel |

**Example**  
```js
// get a BN
const deposit = Web3.utils.toBN(Web3.utils.toWei('1','ether'))
const txHash = await connext.deposit(deposit)
```
<br/>
<br/>
<br/>

<a id="Connext+openChannel"></a>

<h2>connext.openChannel(params) ⇒ <code>String</code></h2>Opens a virtual channel between "to" and caller with Ingrid as the hub. Both users must have a ledger channel open with ingrid.

If there is no deposit provided, then 100% of the ledger channel balance is added to virtual channel deposit. This function is to be called by the "A" party in a unidirectional scheme.

Signs a copy of the initial virtual channel state, and generates a proposed ledger channel update to the hub for countersigning that updates the number of open virtual channels and the vcRootHash of the ledger channel state.

This proposed state update serves as the opening certificate for the virtual channel, and is used to verify Ingrid agreed to facilitate the creation of the virtual channel and take on the counterparty risk.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - the virtual channel ID recieved by Ingrid  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.to | <code>String</code> | ETH address you want to open a virtual channel with |
| params.deposit | <code>BigNumber</code> | (optional) deposit in wei for the virtual channel, defaults to the entire LC balance |
| params.sender | <code>String</code> | (optional) who is initiating the virtual channel creation, defaults to accounts[0] |

**Example**  
```js
const myFriendsAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
await connext.openChannel({ to: myFriendsAddress })
```
<br/>
<br/>
<br/>

<a id="Connext+joinChannel"></a>

<h2>connext.joinChannel(channelId, sender)</h2>Joins channel by channelId with a deposit of 0 (unidirectional channels).

This function is to be called by the "B" party in a unidirectional scheme.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| channelId | <code>String</code> |  | ID of the virtual channel |
| sender | <code>String</code> | <code></code> | (optional) ETH address of the person joining the virtual channel (partyB) |

**Example**  
```js
const channelId = 10 // pushed to partyB from Ingrid
await connext.joinChannel(channelId)
```
<br/>
<br/>
<br/>

<a id="Connext+updateBalance"></a>

<h2>connext.updateBalance(params) ⇒ <code>String</code></h2>Updates channel balance by provided ID.

In the unidirectional scheme, this function is called by the "A" party only.

Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - returns signature of balance update.  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object. |
| params.channelId | <code>String</code> | ID of channel. |
| params.balanceA | <code>BigNumber</code> | channel balance in Wei (of "A" party). |
| params.balanceB | <code>BigNumber</code> | channel balance in Wei (of "B" party) |

**Example**  
```js
await connext.updateBalance({
  channelId: 10,
  balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
})
```
<br/>
<br/>
<br/>

<a id="Connext+closeChannel"></a>

<h2>connext.closeChannel(channelId)</h2>Closes a virtual channel.

Retrieves the latest signed virtual state update, and decomposes the virtual channel into their respective ledger channel updates.

The virtual channel agent who called this function signs the closing ledger-channel update, and forwards the signature to Ingrid.

Ingrid verifies the signature, returns her signature of the proposed virtual channel decomposition, and proposes the LC update for the other virtual channel participant. 

If Ingrid does not return her signature on the proposed virtual channel decomposition, the caller goes to chain by calling initVC and settleVC.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| channelId | <code>Number</code> | ID of the virtual channel to close |

**Example**  
```js
await connext.closeChannel({
  channelId: 0xadsf11..,
  balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
})
```
<br/>
<br/>
<br/>

<a id="Connext+closeChannels"></a>

<h2>connext.closeChannels(channelIds)</h2>Close many virtual channels by calling closeChannel on each channel ID in the provided array.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| channelIds | <code>Array.&lt;String&gt;</code> | array of virtual channel IDs you wish to close |

**Example**  
```js
const channels = [
  {
    channelId: 0xasd310..,
    balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
  },
  {
    channelId: 0xadsf11..,
    balance: web3.utils.toBN(web3.utils.toWei(0.2, 'ether'))
  }
]
await connext.closeChannels(channels)
```
<br/>
<br/>
<br/>

<a id="Connext+withdraw"></a>

<h2>connext.withdraw(sender) ⇒ <code>Object</code> \| <code>String</code> \| <code>Boolean</code></h2>Withdraws bonded funds from ledger channel with ingrid.
All virtual channels must be closed before a ledger channel can be closed.

Generates the state update from the latest ingrid signed state with fast-close flag.
Ingrid should countersign if the state update matches what she has signed previously, and the channel will fast close by calling consensusCloseChannel on the Channel Manager contract.

If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - contains the transaction hash of the resulting transaction, and a boolean indicating if it was fast closed<code>String</code> - the transaction hash of either consensusCloseChannel or withdrawFinal<code>Boolean</code> - true if successfully withdrawn, false if challenge process commences  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| sender | <code>String</code> | <code></code> | (optional) who the transactions should be sent from, defaults to account[0] |

**Example**  
```js
const success = await connext.withdraw()
```
<br/>
<br/>
<br/>

<a id="Connext+withdrawFinal"></a>

<h2>connext.withdrawFinal()</h2>Withdraw bonded funds from ledger channel after a channel is challenge-closed and the challenge period expires by calling withdrawFinal using Web3.

Looks up LC by the account address of the client-side user if sender parameter is not supplied.

Calls the "byzantineCloseChannel" function on the contract.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Example**  
```js
const success = await connext.withdraw()
if (!success) {
  // wait out challenge timer
  await connext.withdrawFinal()
}
```
<br/>
<br/>
<br/>

<a id="Connext+checkpoint"></a>

<h2>connext.checkpoint()</h2>Sync signed state updates with chain.

Generates client signature on latest Ingrid-signed state update, and uses web3 to call updateLCState on the contract without challenge flag.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Example**  
```js
await connext.checkpoint()
```
<br/>
<br/>
<br/>

<a id="Connext+cosignLCUpdate"></a>

<h2>connext.cosignLCUpdate(params)</h2>Verifies and cosigns the ledger state update with the specified nonce.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.lcId | <code>String</code> | ledger channel id |
| params.nonce | <code>Number</code> | nonce of update you are cosigning |
| params.sender | <code>String</code> | (optional) the person who cosigning the update, defaults to accounts[0] |

<br/>
<br/>
<br/>

<a id="Connext+createLCStateUpdate"></a>

<h2>connext.createLCStateUpdate(params) ⇒ <code>String</code></h2>Generates a signed ledger channel state update.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - signature of signer on data provided  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.isClose | <code>Boolean</code> | (optional) flag indicating whether or not this is closing state, defaults to false |
| params.channelId | <code>String</code> | ID of the ledger channel you are creating a state update for |
| params.nonce | <code>Number</code> | the sequence of the ledger channel update |
| params.openVcs | <code>Number</code> | the number of open virtual channels associated with this ledger channel |
| params.vcRootHash | <code>String</code> | the root hash of the Merkle tree containing all initial states of the open virtual channels |
| params.partyA | <code>String</code> | ETH address of partyA in the ledgerchannel |
| params.partyI | <code>String</code> | (optional) ETH address of the hub, defaults to this.ingridAddress |
| params.balanceA | <code>Number</code> | updated balance of partyA |
| params.balanceI | <code>Number</code> | updated balance of partyI |
| params.unlockedAccountPresent | <code>Boolean</code> | (optional) whether to use sign or personal sign, defaults to false if in prod and true if in dev |
| params.signer | <code>String</code> | (optional) ETH address of person signing data, defaults to account[0] |

<br/>
<br/>
<br/>

<a id="Connext+createVCStateUpdate"></a>

<h2>connext.createVCStateUpdate(params) ⇒ <code>String</code></h2>Creates a signed virtual channel state update

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - signature of signer on data provided  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.channelId | <code>String</code> | ID of the virtual channel you are creating a state update for |
| params.nonce | <code>Number</code> | the sequence of the state update |
| params.partyA | <code>String</code> | ETH address of partyA |
| params.partyB | <code>String</code> | ETH address of partyB |
| params.balanceA | <code>Number</code> | updated balance of partyA |
| params.balanceB | <code>Number</code> | updated balance of partyB |
| params.unlockedAccountPresent | <code>Boolean</code> | (optional) whether to use sign or personal sign, defaults to false if in prod and true if in dev |
| params.signer | <code>String</code> | (optional) ETH address of person signing data, defaults to account[0] |

<br/>
<br/>
<br/>

<a id="Connext+LCOpenTimeoutContractHandler"></a>

<h2>connext.LCOpenTimeoutContractHandler(params)</h2>Function to be called if Ingrid fails to join the ledger channel in the challenge window.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> |  |
| params.lcId | <code>String</code> | ledger channel id the hub did not join |
| params.sender | <code>String</code> | (optional) who is calling the transaction (defaults to accounts[0]) |

<br/>
<br/>
<br/>

<a id="Connext+getLcId"></a>

<h2>connext.getLcId(partyA) ⇒ <code>Object</code></h2>Returns the ledger channel id between the supplied address and ingrid.

If no address is supplied, accounts[0] is used as partyA.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - ledger channel between hub and supplied partyA  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| partyA | <code>String</code> | <code></code> | (optional) address of the partyA in the channel with Ingrid. |

<br/>
<br/>
<br/>

<a id="Connext+getChannelById"></a>

<h2>connext.getChannelById(channelId) ⇒ <code>Object</code></h2>Returns an object representing the virtual channel in the database.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - the virtual channel  

| Param | Type | Description |
| --- | --- | --- |
| channelId | <code>String</code> | the ID of the virtual channel |

<br/>
<br/>
<br/>

<a id="Connext+getChannelByParties"></a>

<h2>connext.getChannelByParties(params) ⇒ <code>Object</code></h2>Returns an object representing the virtual channel between the two parties in the database.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - the virtual channel  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.partyA | <code>String</code> | ETH address of partyA in virtual channel |
| params.partyB | <code>String</code> | ETH address of partyB in virtual channel |

<br/>
<br/>
<br/>

<a id="Connext+getLcById"></a>

<h2>connext.getLcById(lcId) ⇒ <code>Object</code></h2>Returns an object representing a ledger channel.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - the ledger channel object  

| Param | Type | Description |
| --- | --- | --- |
| lcId | <code>String</code> | the ledger channel id |

<br/>
<br/>
<br/>

<a id="Connext+getLcByPartyA"></a>

<h2>connext.getLcByPartyA(partyA) ⇒ <code>Object</code></h2>Returns object representing the ledger channel between partyA and Ingrid

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - ledger channel object  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| partyA | <code>String</code> | <code></code> | (optional) partyA in ledger channel. Default is accounts[0] |

<br/>
<br/>
<br/>

<a id="Connext+getLatestVCStateUpdate"></a>

<h2>connext.getLatestVCStateUpdate(channelId) ⇒ <code>Object</code></h2>Returns the latest signed virtual channel state as an object.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - representing the latest signed virtual channel state  

| Param | Type | Description |
| --- | --- | --- |
| channelId | <code>String</code> | ID of the virtual channel |

<br/>
<br/>
<br/>

<a id="Connext.getNewChannelId"></a>

<h2>Connext.getNewChannelId() ⇒ <code>String</code></h2>Returns a new channel id that is a random hex string.

**Kind**: static method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - a random 32 byte channel ID.  
<br/>
<br/>
<br/>

<a id="Connext.createLCStateUpdateFingerprint"></a>

<h2>Connext.createLCStateUpdateFingerprint(params) ⇒ <code>String</code></h2>Hashes the ledger channel state update information using soliditySha3.

**Kind**: static method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - the hash of the state data  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.isClose | <code>Boolean</code> | flag indicating whether or not this is closing state |
| params.channelId | <code>String</code> | ID of the ledger channel you are creating a state update for |
| params.nonce | <code>Number</code> | the sequence of the ledger channel update |
| params.openVcs | <code>Number</code> | the number of open virtual channels associated with this ledger channel |
| params.vcRootHash | <code>String</code> | the root hash of the Merkle tree containing all initial states of the open virtual channels |
| params.partyA | <code>String</code> | ETH address of partyA in the ledgerchannel |
| params.partyI | <code>String</code> | ETH address of the hub (Ingrid) |
| params.balanceA | <code>Number</code> | updated balance of partyA |
| params.balanceI | <code>Number</code> | updated balance of partyI |

<br/>
<br/>
<br/>

<a id="Connext.recoverSignerFromLCStateUpdate"></a>

<h2>Connext.recoverSignerFromLCStateUpdate(params) ⇒ <code>String</code></h2>Recovers the signer from the hashed data generated by the Connext.createLCStateUpdate function.

**Kind**: static method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - the ETH address of the person who signed the data  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.sig | <code>String</code> | the signature of the data from an unknown agent |
| params.isClose | <code>Boolean</code> | flag indicating whether or not this is closing state |
| params.channelId | <code>String</code> | ID of the ledger channel you are creating a state update for |
| params.nonce | <code>Number</code> | the sequence of the ledger channel update |
| params.openVcs | <code>Number</code> | the number of open virtual channels associated with this ledger channel |
| params.vcRootHash | <code>String</code> | the root hash of the Merkle tree containing all initial states of the open virtual channels |
| params.partyA | <code>String</code> | ETH address of partyA in the ledgerchannel |
| params.partyI | <code>String</code> | ETH address of the hub (Ingrid) |
| params.balanceA | <code>Number</code> | updated balance of partyA |
| params.balanceI | <code>Number</code> | updated balance of partyI |

<br/>
<br/>
<br/>

<a id="Connext.createVCStateUpdateFingerprint"></a>

<h2>Connext.createVCStateUpdateFingerprint(params) ⇒ <code>String</code></h2>Hashes data from a virtual channel state update using soliditySha3

**Kind**: static method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - hash of the virtual channel state data.  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.channelId | <code>String</code> | ID of the virtual channel you are creating a state update for |
| params.nonce | <code>Number</code> | the sequence of the state update |
| params.partyA | <code>String</code> | ETH address of partyA |
| params.partyB | <code>String</code> | ETH address of partyB |
| params.balanceA | <code>Number</code> | updated balance of partyA |
| params.balanceB | <code>Number</code> | updated balance of partyB |

<br/>
<br/>
<br/>

<a id="Connext.recoverSignerFromVCStateUpdate"></a>

<h2>Connext.recoverSignerFromVCStateUpdate(params) ⇒ <code>String</code></h2>Hashes data from a virtual channel state update using soliditySha3

**Kind**: static method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - ETH address of the person who signed the data  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.sig | <code>String</code> | signature of the data created in Connext.createVCStateUpdate |
| params.channelId | <code>String</code> | ID of the virtual channel you are creating a state update for |
| params.nonce | <code>Number</code> | the sequence of the state update |
| params.partyA | <code>String</code> | ETH address of partyA |
| params.partyB | <code>String</code> | ETH address of partyB |
| params.balanceA | <code>Number</code> | updated balance of partyA |
| params.balanceB | <code>Number</code> | updated balance of partyB |

