<br/>
<br/>
<br/>

<a id="Connext"></a>

<h2>Connext</h2>Class representing an instance of a Connext client.

**Kind**: global class  

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

<h2>connext.register(initialDeposit, sender, challenge) ⇒ <code>Promise</code></h2>Opens a ledger channel with Ingrid (Hub) at the address provided when instantiating the Connext instance with the given initial deposit. 

Sender defaults to accounts[0] if not supplied to the register function.

Ledger channel challenge timer is determined by Ingrid (Hub) if the parameter is not supplied. Current default value is 3600s (1 hour).

Uses the internal web3 instance to call the createChannel function on the Channel Manager contract, and logs the transaction hash of the channel creation. The function returns the ID of the created channel.

Once the channel is created on chain, users should call the requestJoinLc function to request that the hub joins the channel. This function should be called on a timeout sufficient for the hub to detect the channel and add it to its database.

If Ingrid is unresponsive, or does not join the channel within the challenge period, the client function "LCOpenTimeoutContractHandler" can be called by the client to recover the funds.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the ledger channel id of the created channel  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| initialDeposit | <code>BN</code> |  | deposit in wei |
| sender | <code>String</code> | <code></code> | (optional) counterparty with hub in ledger channel, defaults to accounts[0] |
| challenge | <code>Number</code> | <code></code> | (optional) challenge period in seconds |

**Example**  
```js
const deposit = Web3.utils.toBN(Web3.utils.toWei('1', 'ether))
const lcId = await connext.register(deposit)
```
<br/>
<br/>
<br/>

<a id="Connext+deposit"></a>

<h2>connext.deposit(depositInWei, sender, recipient) ⇒ <code>Promise</code></h2>Adds a deposit to an existing ledger channel by calling the contract function "deposit" using the internal web3 instance.

Can be used by any either channel party.

If sender is not supplied, it defaults to accounts[0]. If the recipient is not supplied, it defaults to the sender.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the transaction hash of the onchain deposit.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| depositInWei | <code>BN</code> |  | value of the deposit |
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

<h2>connext.openChannel(params) ⇒ <code>Promise</code></h2>Opens a virtual channel between "to" and sender with Ingrid as the hub. Both users must have a ledger channel open with ingrid.

If there is no deposit provided, then 100% of the ledger channel balance is added to virtual channel deposit. This function is to be called by the "A" party in a unidirectional scheme.

Signs a copy of the initial virtual channel state, and generates a proposed ledger channel update to the hub for countersigning that updates the number of open virtual channels and the root hash of the ledger channel state.

This proposed state update serves as the opening certificate for the virtual channel, and is used to verify Ingrid agreed to facilitate the creation of the virtual channel and take on the counterparty risk.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the virtual channel ID recieved by Ingrid  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.to | <code>String</code> | ETH address you want to open a virtual channel with |
| params.deposit | <code>BN</code> | (optional) deposit in wei for the virtual channel, defaults to the entire LC balance |
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

<h2>connext.joinChannel(channelId, sender) ⇒ <code>Promise</code></h2>Joins virtual channel with provided channelId with a deposit of 0 (unidirectional channels).

This function is to be called by the "B" party in a unidirectional scheme.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the virtual channel ID  

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

<h2>connext.updateBalance(params) ⇒ <code>Promise</code></h2>Updates channel balance by provided ID and balances.

In the unidirectional scheme, this function is called by the "A" party only, and only updates that increase the balance of the "B" party are accepted.

Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the signature of the "A" party on the balance update  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.channelId | <code>String</code> | ID of channel |
| params.balanceA | <code>BigNumber</code> | channel balance in Wei (of "A" party) |
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

<h2>connext.closeChannel(channelId) ⇒ <code>Promise</code></h2>Closes a virtual channel.

Retrieves the latest virtual state update, and decomposes the virtual channel into their respective ledger channel updates.

The virtual channel agent who called this function signs the closing ledger-channel update, and forwards the signature to Ingrid.

Ingrid verifies the signature, returns her signature of the proposed virtual channel decomposition, and proposes the LC update for the other virtual channel participant. 

If Ingrid does not return her signature on the proposed virtual channel decomposition, the caller goes to chain by calling initVC and settleVC.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the signature of the hub on the generated update if accepted, or the result of closing the channel on chain if there is a dispute  

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

<h2>connext.closeChannels(channelIds)</h2>Closes many virtual channels by calling closeChannel on each channel ID in the provided array.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| channelIds | <code>Array.&lt;String&gt;</code> | array of virtual channel IDs you wish to close |

**Example**  
```js
const channels = [
    0xasd310..,
    0xadsf11..,
]
await connext.closeChannels(channels)
```
<br/>
<br/>
<br/>

<a id="Connext+withdraw"></a>

<h2>connext.withdraw(sender) ⇒ <code>Promise</code></h2>Withdraws bonded funds from an existing ledger channel.

All virtual channels must be closed before a ledger channel can be closed.

Generates the state update from the latest ingrid signed state with fast-close flag.

Ingrid should countersign the closing update if it matches what she has signed previously, and the channel will fast close by calling consensusCloseChannel on the contract.

If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to an object with the structure: { response: transactionHash, fastClosed: true}  

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

<h2>connext.withdrawFinal(sender) ⇒ <code>Promise</code></h2>Withdraw bonded funds from ledger channel after a channel is challenge-closed and the challenge period expires by calling withdrawFinal using the internal web3 instance.

Looks up LC by the account address of the client-side user if sender parameter is not supplied.

Calls the "byzantineCloseChannel" function on the contract.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the transaction hash from calling byzantineCloseChannel  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| sender | <code>String</code> | <code></code> | (optional) the person sending the on chain transaction, defaults to accounts[0] |

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

<a id="Connext+cosignLatestLcUpdate"></a>

<h2>connext.cosignLatestLcUpdate(lcId, sender) ⇒ <code>Promise</code></h2>Verifies and cosigns the latest ledger state update.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the cosigned ledger channel state update  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| lcId | <code>String</code> |  | ledger channel id |
| sender | <code>String</code> | <code></code> | (optional) the person who cosigning the update, defaults to accounts[0] |

**Example**  
```js
const lcId = await connext.getLcId() // get ID by accounts[0] and open status by default
await connext.cosignLatestLcUpdate(lcId)
```
<br/>
<br/>
<br/>

<a id="Connext+cosignLCUpdate"></a>

<h2>connext.cosignLCUpdate(params) ⇒ <code>Promise</code></h2>Verifies and cosigns the ledger state update indicated by the provided nonce.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the cosigned ledger channel state update  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.lcId | <code>String</code> | ledger channel id |
| params.sender | <code>String</code> | (optional) the person who cosigning the update, defaults to accounts[0] |

**Example**  
```js
const lcId = await connext.getLcId() // get ID by accounts[0] and open status by default
await connext.cosignLatestLcUpdate(lcId)
```
<br/>
<br/>
<br/>

<a id="Connext+LCOpenTimeoutContractHandler"></a>

<h2>connext.LCOpenTimeoutContractHandler(lcId, sender) ⇒ <code>Promise</code></h2>Watchers or users should call this to recover bonded funds if Ingrid fails to join the ledger channel within the challenge window.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the result of sending the transaction  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| lcId | <code>String</code> |  | ledger channel id the hub did not join |
| sender | <code>String</code> | <code></code> | (optional) who is calling the transaction (defaults to accounts[0]) |

<br/>
<br/>
<br/>

<a id="Connext+getChannelsByLcId"></a>

<h2>connext.getChannelsByLcId(ledgerChannelId) ⇒ <code>Promise</code></h2>Returns an array of the virtual channel states associated with the given ledger channel.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to an Array of virtual channel objects  

| Param | Type | Description |
| --- | --- | --- |
| ledgerChannelId | <code>String</code> | ID of the ledger channel |

<br/>
<br/>
<br/>

<a id="Connext+getLcId"></a>

<h2>connext.getLcId(partyA, status) ⇒ <code>Promise</code></h2>Returns the ledger channel id between the supplied address and ingrid.

If no address is supplied, accounts[0] is used as partyA.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to either the ledger channel id between hub and supplied partyA, or an Array of the channel IDs between hub and partyA.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| partyA | <code>String</code> | <code></code> | (optional) address of the partyA in the channel with Ingrid. |
| status | <code>Number</code> | <code></code> | (optional) state of virtual channel, can be 0 (opening), 1 (opened), 2 (settling), or 3 (settled). Defaults to open channel. |

<br/>
<br/>
<br/>

<a id="Connext+getChannelById"></a>

<h2>connext.getChannelById(channelId) ⇒ <code>Promise</code></h2>Returns an object representing the virtual channel in the database.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to an object representing the virtual channel  

| Param | Type | Description |
| --- | --- | --- |
| channelId | <code>String</code> | the ID of the virtual channel |

<br/>
<br/>
<br/>

<a id="Connext+getChannelByParties"></a>

<h2>connext.getChannelByParties(params) ⇒ <code>Promise</code></h2>Returns an object representing the open virtual channel between the two parties in the database.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the virtual channel  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.partyA | <code>String</code> | ETH address of partyA in virtual channel |
| params.partyB | <code>String</code> | ETH address of partyB in virtual channel |

<br/>
<br/>
<br/>

<a id="Connext+getLcById"></a>

<h2>connext.getLcById(lcId) ⇒ <code>Promise</code></h2>Returns an object representing a ledger channel.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the ledger channel object  

| Param | Type | Description |
| --- | --- | --- |
| lcId | <code>String</code> | the ledger channel id |

<br/>
<br/>
<br/>

<a id="Connext+getLcByPartyA"></a>

<h2>connext.getLcByPartyA(partyA, status) ⇒ <code>Promise</code></h2>Returns object representing the ledger channel between partyA and Ingrid

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to ledger channel object  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| partyA | <code>String</code> | <code></code> | (optional) partyA in ledger channel. Default is accounts[0] |
| status | <code>Number</code> | <code></code> | (optional) state of virtual channel, can be 0 (opening), 1 (opened), 2 (settling), or 3 (settled). Defaults to open channel. |

<br/>
<br/>
<br/>

<a id="Connext+requestIngridDeposit"></a>

<h2>connext.requestIngridDeposit(params) ⇒ <code>Promise</code></h2>Requests ingrid deposits into a given subchannel. Ingrid must have sufficient balance in the "B" subchannel to cover the virtual channel balance of "A" since Ingrid is assuming the financial counterparty risk. 

This function is to be used if the hub has insufficient balance in the ledger channel to create proposed virtual channels.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the transaction hash of Ingrid calling the deposit function  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | the method object |
| params.lcId | <code>String</code> | id of the ledger channel |
| params.deposit | <code>BN</code> | the deposit in Wei |

<br/>
<br/>
<br/>

<a id="Connext+requestJoinLc"></a>

<h2>connext.requestJoinLc(lcId) ⇒ <code>Promise</code></h2>Requests Ingrid joins the ledger channel after it has been created on chain. This function should be called after the register() returns the ledger channel ID of the created contract.

May have to be called after a timeout period to ensure the transaction performed in register to create the channel on chain is properly mined.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Promise</code> - resolves to the transaction hash of Ingrid joining the channel  

| Param | Type | Description |
| --- | --- | --- |
| lcId | <code>String</code> | ID of the ledger channel you want the Hub to join |

**Example**  
```js
// use register to create channel on chain
const deposit = Web3.utils.toBN(1000)
const lcId = await connext.register(deposit)
const response = await connext.requestJoinLc(lcId)
```
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

<h2>Connext.recoverSignerFromLCStateUpdate(params) ⇒ <code>String</code></h2>Recovers the signer from the hashed data generated by the Connext.createLCStateUpdateFingerprint function.

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

<h2>Connext.createVCStateUpdateFingerprint(params) ⇒ <code>String</code></h2>Hashes data from a virtual channel state update using soliditySha3.

**Kind**: static method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - hash of the virtual channel state data  

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

<h2>Connext.recoverSignerFromVCStateUpdate(params) ⇒ <code>String</code></h2>Recovers the signer from the hashed data generated by the Connext.createVCStateUpdateFingerprint function.

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

