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
| params | <code>Object</code> | The constructor object. |
| params.web3 | <code>Web3</code> | the web3 instance. |
| params.ingridAddress | <code>String</code> | Eth address of intermediary (defaults to Connext hub). |
| params.watcherUrl | <code>String</code> | Url of watcher server (defaults to Connext hub). |
| params.ingridUrl | <code>String</code> | Url of intermediary server (defaults to Connext hub). |
| params.contractAddress | <code>String</code> | Address of deployed contract (defaults to latest deployed contract). |

<br/>
<br/>
<br/>

<a id="Connext+register"></a>

<h2>connext.register(initialDeposit) ⇒ <code>String</code></h2>Opens a ledger channel with ingridAddress and bonds initialDeposit. Ledger channel challenge timer is determined by Ingrid.

Uses web3 to call openLC function on the contract, and pings Ingrid with opening signature and initial deposit.

Ingrid should verify the signature and call "joinChannel" on the contract.

If Ingrid is unresponsive, the client function "LCOpenTimeoutContractHandler" can be called by the client to recover the funds, or the client can call the contract function directly.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - result of calling openLedgerChannel on the channelManager instance.  

| Param | Type | Description |
| --- | --- | --- |
| initialDeposit | <code>BigNumber</code> | deposit in wei |

**Example**  
```js
// get a BN
const deposit = web3.utils.toBN(10000)
await connext.register(deposit)
```
<br/>
<br/>
<br/>

<a id="Connext+deposit"></a>

<h2>connext.deposit(depositInWei)</h2>Adds a deposit to an existing ledger channel. Calls contract function "deposit".

Can be used by either party in a ledger channel.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| depositInWei | <code>BigNumber</code> | Value of the deposit. |

**Example**  
```js
// get a BN
const deposit = web3.utils.toBN(10000)
await connext.deposit(deposit)
```
<br/>
<br/>
<br/>

<a id="Connext+withdraw"></a>

<h2>connext.withdraw() ⇒ <code>boolean</code> \| <code>String</code></h2>Withdraws bonded funds from ledger channel with ingrid.
All virtual channels must be closed before a ledger channel can be closed.

Generates the state update from the latest ingrid signed state with fast-close flag.
Ingrid should countersign if the state update matches what she has signed previously, and the channel will fast close by calling consensusCloseChannel on the Channel Manager contract.

If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>boolean</code> - Returns true if successfully withdrawn, false if challenge process commences.<code>String</code> - Flag indicating whether the channel was consensus-closed or if lc was challenge-closed.  
**Example**  
```js
const success = await connext.withdraw()
```
<br/>
<br/>
<br/>

<a id="Connext+withdrawFinal"></a>

<h2>connext.withdrawFinal()</h2>Withdraw bonded funds from ledger channel after a channel is challenge-closed after the challenge period expires by calling withdrawFinal using Web3.

Looks up LC by the account address of the client-side user.

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

<a id="Connext+openChannel"></a>

<h2>connext.openChannel(params)</h2>Opens a virtual channel between to and caller with Ingrid as the hub. Both users must have a ledger channel open with ingrid.

If there is no deposit provided, then 100% of the ledger channel balance is added to VC deposit. This function is to be called by the "A" party in a unidirectional scheme.

Sends a proposed LC update for countersigning that updates the VCRootHash of the ledger channel state.

This proposed LC update (termed VC0 throughout documentation) serves as the opening certificate for the virtual channel.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | The method object. |
| params.to | <code>String</code> | Wallet address to wallet for partyB in virtual channel |
| params.deposit | <code>BigNumber</code> | User deposit for VC, in wei. Optional. |

**Example**  
```js
const myFriendsAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
await connext.openChannel({ to: myFriendsAddress })
```
<br/>
<br/>
<br/>

<a id="Connext+joinChannel"></a>

<h2>connext.joinChannel(channelId)</h2>Joins channel by channelId with a deposit of 0 (unidirectional channels).

This function is to be called by the "B" party in a unidirectional scheme.
Sends opening cert (VC0) to message queue, so it is accessible by Ingrid and Watchers.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| channelId | <code>String</code> | ID of the virtual channel. |

**Example**  
```js
const channelId = 10 // accessed by getChannelId method
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
**Returns**: <code>String</code> - Returns signature of balance update.  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | The method object. |
| params.channelId | <code>HexString</code> | ID of channel. |
| params.balance | <code>BigNumber</code> | Channel balance in Wei (of "A" party). |

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

<a id="Connext+cosignBalanceUpdate"></a>

<h2>connext.cosignBalanceUpdate(params) ⇒ <code>String</code></h2>Verifies signature on balance update and co-signs update.

In the unidirectional scheme, this function is called by the "B" party only.
Signature is posted to the hub/watcher.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - Returns signature of balance update.  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | The method object. |
| params.channelId | <code>HexString</code> | ID of channel. |
| params.balance | <code>BigNumber</code> | Channel balance in Wei (of "A" party). |
| params.sig | <code>String</code> | Signature received from "A" party to be verified before co-signing. |

<br/>
<br/>
<br/>

<a id="Connext+fastCloseChannel"></a>

<h2>connext.fastCloseChannel(channelId)</h2>Closes specified channel using latest double signed update.

Generates a decomposed LC update containing the updated balances and VCRoot to Ingrid from latest
double signed VC update.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| channelId | <code>String</code> | virtual channel ID |

**Example**  
```js
await connext.fastCloseChannel(10)
```
<br/>
<br/>
<br/>

<a id="Connext+closeChannel"></a>

<h2>connext.closeChannel(params)</h2>Closes a channel in a dispute.

Retrieves decomposed LC updates from Ingrid, and countersigns updates if needed (i.e. if they are recieving funds).

Settle VC is called on chain for each vcID if Ingrid does not provide decomposed state updates, and closeVirtualChannel is called for each vcID.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Object containing { vcId, balance } |
| params.channelId | <code>Number</code> | Virtual channel ID to close. |
| params.balance | <code>BigNumber</code> | Virtual channel balance. |

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

<h2>connext.closeChannels(channels)</h2>Close many virtual channels

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| channels | <code>Array.&lt;Object&gt;</code> | Array of objects with {vcId, balance} to close |
| channels.$.channelId | <code>String</code> | Channel ID to close |
| channels.$.balance | <code>BigNumber</code> | Channel balance. |

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

<a id="Connext+getLatestLedgerStateUpdate"></a>

<h2>connext.getLatestLedgerStateUpdate(ledgerChannelId) ⇒ <code>Object</code></h2>Returns the latest ingrid-signed ledger state update.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - containing the latest signed state update for the ledger channel. May or may not be double signed.  

| Param | Type |
| --- | --- |
| ledgerChannelId | <code>HexString</code> | 

**Example**  
```js
// returns highest nonce ledger channel state update
const lcId = await connext.getLcId()
const lcState = await connext.getLatestLedgerStateUpdate(lcId)
```
<br/>
<br/>
<br/>

<a id="Connext+getLcId"></a>

<h2>connext.getLcId(partyA)</h2>Returns the ledger channel id between the supplied address and ingrid.

If no address is supplied, accounts[0] is used as partyA.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| partyA | <code>String</code> | <code></code> | address of the partyA in the channel with Ingrid. |

<br/>
<br/>
<br/>

<a id="Connext+getNewChannelId"></a>

<h2>connext.getNewChannelId() ⇒ <code>String</code></h2>Returns a new channel id that is a random hex string.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - a random 32 byte channel ID.  
<br/>
<br/>
<br/>

<a id="Connext+getChannel"></a>

<h2>connext.getChannel(channelId)</h2>Returns an object representing the virtual channel in the database.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| channelId | <code>String</code> | the ID of the virtual channel |

<br/>
<br/>
<br/>

<a id="Connext+getOtherLcId"></a>

<h2>connext.getOtherLcId(vcId)</h2>Returns the ledger channel id for partyB in the virtual channel.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| vcId | <code>String</code> | the virtual channel id |

<br/>
<br/>
<br/>

<a id="Connext+getLc"></a>

<h2>connext.getLc(lcId)</h2>Returns an object representing a ledger channel.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| lcId | <code>String</code> | the ledgerchannel id |

<br/>
<br/>
<br/>

<a id="Connext+getLedgerChannelChallengeTimer"></a>

<h2>connext.getLedgerChannelChallengeTimer()</h2>Returns the default ledger channel challenge period from ingrid.

Challenge timers are used when constructing an LC.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
<br/>
<br/>
<br/>

<a id="Connext+getLatestVirtualDoubleSignedStateUpdate"></a>

<h2>connext.getLatestVirtualDoubleSignedStateUpdate(channelId) ⇒ <code>Object</code></h2>Returns the latest double signed virtual channel state as an object.

Signatures from both parties are included as fields in that object.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - representing the latest double signed virtual channel state.  

| Param | Type | Description |
| --- | --- | --- |
| channelId | <code>String</code> | ID of the virtual channel |

<br/>
<br/>
<br/>

<a id="Connext+createDecomposedLcUpdates"></a>

<h2>connext.createDecomposedLcUpdates(params)</h2>Generates the decomposed ledger channel updates needed when closing a virtual channel.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> |  |
| params.sigA | <code>String</code> | signature of partyA on closing virtual channel state |
| params.sigB | <code>String</code> | signature of partyB on closing virtual channel state |
| params.vcId | <code>String</code> | virtual channel id |
| params.nonce | <code>Number</code> | nonce of the virtual channel |
| params.partyA | <code>String</code> | wallet address of partyA |
| params.partyB | <code>String</code> | wallet address of partyB |
| params.partyI | <code>String</code> | wallet address of Ingrid |
| params.subchanAI | <code>String</code> | ledger channel id of the ledger channel between partyA and partyI |
| params.subchanBI | <code>String</code> | ledger channel id of the ledger channel between partyB and partyI |
| params.balanceA | <code>BigNumber</code> | balanceA in the virtual channel |
| params.balanceB | <code>BigNumber</code> | balanceB in the virtual channel |

<br/>
<br/>
<br/>

<a id="Connext+getVcInitialStates"></a>

<h2>connext.getVcInitialStates(lcId)</h2>Returns a list of initial vc state objects that correspond to the open VCs for this ledger channel.

These initial states are used when generating the vcRootHash for ledger channel updates.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| lcId | <code>String</code> | ledger channel ID |

<br/>
<br/>
<br/>

<a id="Connext+getVcInitialState"></a>

<h2>connext.getVcInitialState(vcId)</h2>Returns an object representing the initial state of the virtual channel when it was opened.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| vcId | <code>String</code> | the virtual channel id |

<br/>
<br/>
<br/>

<a id="Connext+byzantineCloseVc"></a>

<h2>connext.byzantineCloseVc(vcId)</h2>Settles all virtual channels on chain in the case of a displute (i.e. Ingrid doesn't return decomposed state updates in "closeChannel").

First, calls "initVC" on the contract. If that transaction was successful, "settleVC" is called. Otherwise, returns the result of calling "initVC".

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| vcId | <code>String</code> | id of the virtual channel to close in dispute |

