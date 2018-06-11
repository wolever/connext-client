
<br/>
<br/>
<br/>

<a id="Connext"></a>
##  ConnextClass to create and manage state channel payment hubs.

**Kind**: global class  

* [Connext](#Connext)
    * [new Connext(params)](#new_Connext_new)
    * _instance_
        * [.initContract()](#Connext+initContract)
        * [.register(initialDeposit)](#Connext+register) ⇒ String
        * [.deposit(depositInWei)](#Connext+deposit)
        * [.withdraw()](#Connext+withdraw) ⇒ String
        * [.withdrawFinal()](#Connext+withdrawFinal)
        * [.checkpoint()](#Connext+checkpoint)
        * [.openChannel(params)](#Connext+openChannel)
        * [.joinChannel(vcId)](#Connext+joinChannel)
        * [.updateBalance(params)](#Connext+updateBalance) ⇒ Object
        * [.fastCloseChannel(params)](#Connext+fastCloseChannel)
        * [.closeChannel(params)](#Connext+closeChannel)
        * [.createLCStateUpdate(params)](#Connext+createLCStateUpdate) ⇒ Object
        * [.getLatestLedgerStateUpdate(params)](#Connext+getLatestLedgerStateUpdate) ⇒ Object
        * [.getLedgerChannelId()](#Connext+getLedgerChannelId) ⇒ Integer \| null
        * [.getLedgerChannel(params)](#Connext+getLedgerChannel) ⇒ Object
        * [.getLedgerChannelByAddress(params)](#Connext+getLedgerChannelByAddress) ⇒ Object
        * [.getLedgerChannelChallengeTimer()](#Connext+getLedgerChannelChallengeTimer) ⇒ Integer
    * _static_
        * [.createLCStateUpdateFingerprint(hashParams)](#Connext.createLCStateUpdateFingerprint) ⇒ String


<br/>
<br/>
<br/>

<a id="new_Connext_new"></a>
###  new Connext(params)Specify parameters for the Connext class. Ingrid's address, URL and the watcher URL are by default set to work with Connext's hub infrastructure and contracts.


| Param | Type | Description |
| --- | --- | --- |
| params | Object | The constructor object. |
| params.web3 | Web3 | the web3 instance. |
| params.ingridAddress | String | Address of hub (Ingrid). |
| params.watcherUrl | String | URL of watcher server. |
| params.ingridUrl | String | URL of intermediary server. |


<br/>
<br/>
<br/>

<a id="Connext+initContract"></a>
###  connext.initContract()Initializes the ledger channel manager contract.

Must be called before any state updates, channel functions, dispute functions, or contract methods
can be called through the client package or it will throw an error.

**Kind**: instance method of [`Connext`](#Connext)  

<br/>
<br/>
<br/>

<a id="Connext+register"></a>
###  connext.register(initialDeposit) ⇒ StringOpens a ledger channel with ingridAddress and bonds initialDeposit.
Requests a challenge timer for the ledger channel from ingrid.

Use web3 to call openLC function on ledgerChannel.

Ingrid will open with 0 balance, and can call the deposit function to
add deposits based on user needs.

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: String - result of calling openLedgerChannel on the channelManager instance.  
**Throws**:

- Will throw an error if initContract has not been called.


| Param | Type | Description |
| --- | --- | --- |
| initialDeposit | BigNumber | deposit in wei |


<br/>
<br/>
<br/>

<a id="Connext+deposit"></a>
###  connext.deposit(depositInWei)Add a deposit to an existing ledger channel. Calls contract function "deposit".

**Kind**: instance method of [`Connext`](#Connext)  
**Throws**:

- Will throw an error if initContract has not been called.


| Param | Type | Description |
| --- | --- | --- |
| depositInWei | BigNumber | Value of the deposit. |


<br/>
<br/>
<br/>

<a id="Connext+withdraw"></a>
###  connext.withdraw() ⇒ StringWithdraw bonded funds from ledger channel with ingrid. All virtual channels must be closed before a ledger channel can be closed.

Generates the state update from the latest ingrid signed state with fast-close flag. Ingrid should countersign if the state update matches what she has signed previously, and the channel will fast close by calling consensusCloseChannel on the Channel Manager contract.

If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: String - Flag indicating whether the channel was consensus-closed or if lc was challenge-closed.  
**Throws**:

- Will throw an error if initContract has not been called.


<br/>
<br/>
<br/>

<a id="Connext+withdrawFinal"></a>
###  connext.withdrawFinal()Withdraw bonded funds from ledger channel after a channel is challenge-closed after the challenge period expires by calling withdrawFinal using Web3.

Looks up LC by the account address of the client-side user.

**Kind**: instance method of [`Connext`](#Connext)  
**Throws**:

- Will throw an error if initContract has not been called.


<br/>
<br/>
<br/>

<a id="Connext+checkpoint"></a>
###  connext.checkpoint()Sync signed state updates with chain.

Generates client signature on latest Ingrid-signed state update, and uses web3 to call updateLCState on the contract without challenge flag.

**Kind**: instance method of [`Connext`](#Connext)  
**Throws**:

- Will throw an error if initContract has not been called.


<br/>
<br/>
<br/>

<a id="Connext+openChannel"></a>
###  connext.openChannel(params)Opens a virtual channel between to and caller with Ingrid as the hub. Both users must have a ledger channel open with ingrid.

If there is no deposit provided, then 100% of the ledger channel balance is added to VC deposit.

Sends a proposed LC update for countersigning that updates the VCRootHash of the ledger channel state.

This proposed LC update (termed LC0 throughout documentation) serves as the opening certificate for the virtual channel.

**Kind**: instance method of [`Connext`](#Connext)  
**Throws**:

- Will throw an error if initContract has not been called.


| Param | Type | Description |
| --- | --- | --- |
| params | Object | The method object. |
| params.to | String | Wallet address to wallet for agentB in virtual channel |
| params.deposit | BigNumber | User deposit for VC, in wei. Optional. |


<br/>
<br/>
<br/>

<a id="Connext+joinChannel"></a>
###  connext.joinChannel(vcId)Joins virtual channel by VC ID with a deposit of 0 (unidirectional channels).
Sends opening cert (VC0) to message queue, so it is accessible by Ingrid and Watchers.

**Kind**: instance method of [`Connext`](#Connext)  
**Throws**:

- Will throw an error if initContract has not been called.


| Param | Type | Description |
| --- | --- | --- |
| vcId | int | The method object. |


<br/>
<br/>
<br/>

<a id="Connext+updateBalance"></a>
###  connext.updateBalance(params) ⇒ ObjectUpdates virtual channel balance by provided ID.

Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: Object - Result of message posting.  

| Param | Type | Description |
| --- | --- | --- |
| params | Object | The method object. |
| params.vcId | Int | ID of virtual channel. |
| params.balance | BigNumber | virtual channel balance |


<br/>
<br/>
<br/>

<a id="Connext+fastCloseChannel"></a>
###  connext.fastCloseChannel(params)Closes specified virtual channel using latest double signed update.

Generates a decomposed LC update containing the updated balances and VCRoot to Ingrid from latest
double signed VC update.

**Kind**: instance method of [`Connext`](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | Object | The method object. |
| params.vcId | Integer | virtual channel ID |


<br/>
<br/>
<br/>

<a id="Connext+closeChannel"></a>
###  connext.closeChannel(params)Closes a ledger channel with Ingrid.

Retrieves decomposed LC updates from Ingrid, and countersign updates if needed (i.e. if they are recieving funds).

Settle VC is called on chain for each vcID if Ingrid does not provide decomposed state updates, and closeVirtualChannel is called for each vcID.

**Kind**: instance method of [`Connext`](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | Object | Array of objects containing { vcId, balance, nonce, signature } |
| params.vcId | Array.&lt;Integer&gt; | Array of all virtual channel IDs that must closed before LC can close. |
| params.balance | BigNumber | virtual channel balance |
| params.signature | String | client signature of the closing state update for the virtual channel |


<br/>
<br/>
<br/>

<a id="Connext+createLCStateUpdate"></a>
###  connext.createLCStateUpdate(params) ⇒ ObjectSigns and generates state update for ledger channel.

If an unlocked account is present (i.e. automated client or Ingrid signing), then normal signing instead of personal signing is used.

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: Object - Result of sending state update to Ingrid  

| Param | Type | Description |
| --- | --- | --- |
| params | Object | Object containing state update data to be hashed. |
| params.isCloseFlag | Integer | 0 if not closing LC, 1 if closing LC state update. Defaults to 0. |
| params.nonce | Integer | The nonce of the proposed ledger channel state update. |
| params.openVCs | Integer | Number of VCs open in the ledger channel with agentA, using Ingrid as an intermediary. |
| params.vcRootHash | String | Indicates which VCs are open in LC. |
| params.agentA | String | Address of agentA in the ledger channel. |
| params.agentB | String | Address of agentB in the ledger channel. Defaults to Ingrid. |
| params.balanceA | BigNumber | Balance of agentA in ledger channel in Wei. |
| params.balanceB | BigNumber | Balance of agentB in ledger channel in Wei. |
| params.unlockedAccountPresent | Boolean | True if there is an automated signing account (e.g. Ingrid). Defaults to false. |


<br/>
<br/>
<br/>

<a id="Connext+getLatestLedgerStateUpdate"></a>
###  connext.getLatestLedgerStateUpdate(params) ⇒ Object**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: Object - Returns the result of requesting the latest signed state from the Watcher.  

| Param | Type | Description |
| --- | --- | --- |
| params | Object | Method Object |
| params.ledgerChannelId | Integer | ID of the ledger channel you are looking to retrieve a state update for. |
| params.sig | Array.&lt;String&gt; | Signature that should be on the state update. |


<br/>
<br/>
<br/>

<a id="Connext+getLedgerChannelId"></a>
###  connext.getLedgerChannelId() ⇒ Integer \| nullHelper function to retrieve lcID.

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: Integer \| null - the lcID for agentA = accounts[0] and ingrid if exists, or null.  

<br/>
<br/>
<br/>

<a id="Connext+getLedgerChannel"></a>
###  connext.getLedgerChannel(params) ⇒ ObjectRequests the ledger channel object by ledger channel id.

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: Object - the ledger channel object.  

| Param | Type | Description |
| --- | --- | --- |
| params | Object | Object containing the ledger channel id |
| params.ledgerChannelId | Integer | Ledger channel ID in database. |


<br/>
<br/>
<br/>

<a id="Connext+getLedgerChannelByAddress"></a>
###  connext.getLedgerChannelByAddress(params) ⇒ ObjectRequests the ledger channel open between Ingrid and the provided address from the watcher.

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: Object - Ledger channel open with Ingrid and agentA (only one allowed) if exists, or null.  

| Param | Type | Description |
| --- | --- | --- |
| params | Object |  |
| params.agentA | String | Address of the agentA in the ledger channel. |


<br/>
<br/>
<br/>

<a id="Connext+getLedgerChannelChallengeTimer"></a>
###  connext.getLedgerChannelChallengeTimer() ⇒ IntegerReturns channel timer for the ledger channel.
Ingrid should also set and store lcID.

Called in register() function

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: Integer - the ledger channel timer period in seconds.  

<br/>
<br/>
<br/>

<a id="Connext.createLCStateUpdateFingerprint"></a>
###  Connext.createLCStateUpdateFingerprint(hashParams) ⇒ StringReturns the LC state update fingerprint.

**Kind**: static method of [`Connext`](#Connext)  
**Returns**: String - Hash of the input data if validated.  

| Param | Type | Description |
| --- | --- | --- |
| hashParams | Object | Object containing state update data to be hashed. |
| hashParams.isCloseFlag | Integer | 0 if not closing LC, 1 if closing LC state update. |
| hashParams.nonce | Integer | The nonce of the proposed ledger channel state update. |
| hashParams.openVCs | Integer | Number of VCs open in the ledger channel with agentA, using Ingrid as an intermediary. |
| hashParams.vcRootHash | String | Indicates which VCs are open in LC. |
| hashParams.agentA | String | Address of agentA in the ledger channel. |
| hashParams.agentB | String | Address of agentB in the ledger channel. Defaults to Ingrid. |
| hashParams.balanceA | BigNumber | Balance of agentA in ledger channel in Wei. |
| hashParams.balanceB | BigNumber | Balance of agentB in ledger channel in Wei. |


<br/>
<br/>
<br/>

<a id="regexExpessions"></a>
##  regexExpessions : ObjectRegexs for validating function in inputs

**Kind**: global constant  
