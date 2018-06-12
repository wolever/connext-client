<a name="Connext"></a>

## Connext
Class representing an instance of a Connext client.

**Kind**: global class  

* [Connext](#Connext)
    * [new Connext(params)](#new_Connext_new)
    * [.register(initialDeposit)](#Connext+register) ⇒ <code>String</code>
    * [.deposit(depositInWei)](#Connext+deposit)
    * [.withdraw()](#Connext+withdraw) ⇒ <code>boolean</code> \| <code>String</code>
    * [.withdrawFinal()](#Connext+withdrawFinal)
    * [.checkpoint()](#Connext+checkpoint)
    * [.openChannel(params)](#Connext+openChannel)
    * [.joinChannel(channelId)](#Connext+joinChannel)
    * [.updateBalance(params)](#Connext+updateBalance) ⇒ <code>String</code>
    * [.cosignBalanceUpdate(params)](#Connext+cosignBalanceUpdate) ⇒ <code>String</code>
    * [.fastCloseChannel(channelId)](#Connext+fastCloseChannel)
    * [.closeChannel(params)](#Connext+closeChannel)
    * [.closeChannels(channels)](#Connext+closeChannels)

<a name="new_Connext_new"></a>

### new Connext(params)
Create an instance of the Connext client.


| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | The constructor object. |
| params.web3 | <code>Web3</code> | the web3 instance. |
| params.ingridAddress | <code>String</code> | Eth address of intermediary (defaults to Connext hub). |
| params.watcherUrl | <code>String</code> | Url of watcher server (defaults to Connext hub). |
| params.ingridUrl | <code>String</code> | Url of intermediary server (defaults to Connext hub). |
| params.contractAddress | <code>String</code> | Address of deployed contract (defaults to latest deployed contract). |

<a name="Connext+register"></a>

### connext.register(initialDeposit) ⇒ <code>String</code>
Opens a ledger channel with ingridAddress and bonds initialDeposit.
Requests a challenge timer for the ledger channel from ingrid.

Use web3 to call openLC function on ledgerChannel.
Ingrid will open with 0 balance, and can call the deposit function to
add deposits based on user needs.

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
<a name="Connext+deposit"></a>

### connext.deposit(depositInWei)
Add a deposit to an existing ledger channel. Calls contract function "deposit"

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
<a name="Connext+withdraw"></a>

### connext.withdraw() ⇒ <code>boolean</code> \| <code>String</code>
Withdraw bonded funds from ledger channel with ingrid. All virtual channels must be closed before a ledger channel can be closed.

Generates the state update from the latest ingrid signed state with fast-close flag. Ingrid should countersign if the state update matches what she has signed previously, and the channel will fast close by calling consensusCloseChannel on the Channel Manager contract.

If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>boolean</code> - Returns true if successfully withdrawn, false if challenge process commences.<code>String</code> - Flag indicating whether the channel was consensus-closed or if lc was challenge-closed.  
**Example**  
```js
const success = await connext.withdraw()
```
<a name="Connext+withdrawFinal"></a>

### connext.withdrawFinal()
Withdraw bonded funds from ledger channel after a channel is challenge-closed after the challenge period expires by calling withdrawFinal using Web3.

Looks up LC by the account address of the client-side user.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Example**  
```js
const success = await connext.withdraw()
if (!success) {
  // wait out challenge timer
  await connext.withdrawFinal()
}
```
<a name="Connext+checkpoint"></a>

### connext.checkpoint()
Sync signed state updates with chain.

Generates client signature on latest Ingrid-signed state update, and uses web3 to call updateLCState on the contract without challenge flag.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Example**  
```js
await connext.checkpoint()
```
<a name="Connext+openChannel"></a>

### connext.openChannel(params)
Opens a virtual channel between to and caller with Ingrid as the hub. Both users must have a ledger channel open with ingrid.

If there is no deposit provided, then 100% of the ledger channel balance is added to VC deposit. This function is to be called by the "A" party in a unidirectional scheme.
Sends a proposed LC update for countersigning that updates the VCRootHash of the ledger channel state.
This proposed LC update (termed LC0 throughout documentation) serves as the opening certificate for the virtual channel.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | The method object. |
| params.to | <code>String</code> | Wallet address to wallet for agentB in virtual channel |
| params.deposit | <code>BigNumber</code> | User deposit for VC, in wei. Optional. |

**Example**  
```js
const myFriendsAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
await connext.openChannel({ to: myFriendsAddress })
```
<a name="Connext+joinChannel"></a>

### connext.joinChannel(channelId)
Joins channel by channelId with a deposit of 0 (unidirectional channels).

This function is to be called by the "B" party in a unidirectional scheme.
Sends opening cert (VC0) to message queue, so it is accessible by Ingrid and Watchers.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| channelId | <code>Number</code> | ID of the virtual channel. |

**Example**  
```js
const channelId = 10 // accessed by getChannel method
await connext.joinChannel(channelId)
```
<a name="Connext+updateBalance"></a>

### connext.updateBalance(params) ⇒ <code>String</code>
Updates channel balance by provided ID.

In the unidirectional scheme, this function is called by the "A" party only.
Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - Returns signature of balance update.  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | The method object. |
| params.channelId | <code>Number</code> | ID of channel. |
| params.balance | <code>BigNumber</code> | Channel balance in Wei (of "A" party). |

**Example**  
```js
await connext.updateBalance({
  channelId: 10,
  balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
})
```
<a name="Connext+cosignBalanceUpdate"></a>

### connext.cosignBalanceUpdate(params) ⇒ <code>String</code>
Verifies signature on balance update and co-signs update.

In the unidirectional scheme, this function is called by the "B" party only.
Signature is posted to the hub/watcher.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - Returns signature of balance update.  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | The method object. |
| params.channelId | <code>Number</code> | ID of channel. |
| params.balance | <code>BigNumber</code> | Channel balance in Wei (of "A" party). |
| params.sig | <code>String</code> | Signature received from "A" party to be verified before co-signing. |

<a name="Connext+fastCloseChannel"></a>

### connext.fastCloseChannel(channelId)
Closes specified channel using latest double signed update.

Generates a decomposed LC update containing the updated balances and VCRoot to Ingrid from latest
double signed VC update.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| channelId | <code>Number</code> | virtual channel ID |

**Example**  
```js
await connext.fastCloseChannel(10)
```
<a name="Connext+closeChannel"></a>

### connext.closeChannel(params)
Closes a channel in a dispute.

Retrieves decomposed LC updates from Ingrid, and countersign updates if needed (i.e. if they are recieving funds).

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
  channelId: 10,
  balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
})
```
<a name="Connext+closeChannels"></a>

### connext.closeChannels(channels)
Close many channels

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| channels | <code>Array.&lt;Object&gt;</code> | Array of objects with {vcId, balance} to close |
| channels.$.channelId | <code>Number</code> | Channel ID to close |
| channels.$.balance | <code>BigNumber</code> | Channel balance. |

**Example**  
```js
const channels = [
  {
    channelId: 10,
    balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
  },
  {
    channelId: 11,
    balance: web3.utils.toBN(web3.utils.toWei(0.2, 'ether'))
  }
]
await connext.closeChannels(channels)
```
