
<br/>
<br/>
<br/>

<a id="Connext"></a>
##  ConnextClass representing an instance of a Connext client.

**Kind**: global class  

* [Connext](#Connext)
    * [new exports.Connext(params)](#new_Connext_new)
    * _instance_
        * [.initContract()](#Connext+initContract)
        * [.register(initialDeposit)](#Connext+register) ⇒
        * [.deposit(depositInWei)](#Connext+deposit)
        * [.withdraw()](#Connext+withdraw)
        * [.withdrawFinal()](#Connext+withdrawFinal)
        * [.checkpoint()](#Connext+checkpoint)
        * [.openChannel(params)](#Connext+openChannel)
        * [.joinChannel(vcId)](#Connext+joinChannel)
        * [.updateBalance(params)](#Connext+updateBalance)
        * [.closeChannel(params)](#Connext+closeChannel)
        * [.closeChannels(params)](#Connext+closeChannels)
        * [.createLCStateUpdate()](#Connext+createLCStateUpdate) ⇒
        * [.getLedgerChannelId()](#Connext+getLedgerChannelId) ⇒
        * [.getLedgerChannel(params)](#Connext+getLedgerChannel) ⇒
        * [.getLedgerChannelByAddress(params)](#Connext+getLedgerChannelByAddress) ⇒
        * [.getLedgerChannelChallengeTimer()](#Connext+getLedgerChannelChallengeTimer) ⇒
    * _static_
        * [.createLCStateUpdateFingerprint(hashParams)](#Connext.createLCStateUpdateFingerprint)


<br/>
<br/>
<br/>

<a id="new_Connext_new"></a>
###  new exports.Connext(params)Create an instance of the Connext client.


| Param | Type | Description |
| --- | --- | --- |
| params | Object | The constructor object. |
| params.web3 | Web3 | the web3 instance. |
| params.ingridAddress | String | Eth address of intermediary . |
| params.watcherUrl | String | Url of watcher server. |
| params.ingridUrl | String | Url of intermediary server. |
| params.drizzleContext | Drizzle | the drizzle context (optional). |


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
###  connext.register(initialDeposit) ⇒Called by the viewer.

Opens a ledger channel with ingridAddress and bonds initialDeposit.
Requests a challenge timer from ingrid
Use web3 to call openLC function on ledgerChannel.

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: result of calling openLedgerChannel on the channelManager instance.  

| Param | Type | Description |
| --- | --- | --- |
| initialDeposit | BigNumber | deposit in wei |


<br/>
<br/>
<br/>

<a id="Connext+deposit"></a>
###  connext.deposit(depositInWei)Add a deposit to an existing ledger channel. Calls contract function "deposit"

**Kind**: instance method of [`Connext`](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| depositInWei | BigNumber | Value of the deposit. |


<br/>
<br/>
<br/>

<a id="Connext+withdraw"></a>
###  connext.withdraw()Withdraw bonded funds from channel.

Generates the state update from the latest ingrid signed state with fast-close flag.

State update is sent to Ingrid to countersign if correct.

**Kind**: instance method of [`Connext`](#Connext)  

<br/>
<br/>
<br/>

<a id="Connext+withdrawFinal"></a>
###  connext.withdrawFinal()Withdraw bonded funds from channel

**Kind**: instance method of [`Connext`](#Connext)  

<br/>
<br/>
<br/>

<a id="Connext+checkpoint"></a>
###  connext.checkpoint()Sync signed updated with chain

**Kind**: instance method of [`Connext`](#Connext)  

<br/>
<br/>
<br/>

<a id="Connext+openChannel"></a>
###  connext.openChannel(params)**Kind**: instance method of [`Connext`](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | Object | The method object. |
| params.to |  | eth address to wallet. |
| params.deposit |  | optional |


<br/>
<br/>
<br/>

<a id="Connext+joinChannel"></a>
###  connext.joinChannel(vcId)**Kind**: instance method of [`Connext`](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| vcId | int | The method object. |


<br/>
<br/>
<br/>

<a id="Connext+updateBalance"></a>
###  connext.updateBalance(params)Update Balance

**Kind**: instance method of [`Connext`](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | Object | The method object. |
| params.vcId |  | address of virtual channel. |
| params.balance |  | new balance diff sent |


<br/>
<br/>
<br/>

<a id="Connext+closeChannel"></a>
###  connext.closeChannel(params)Close one channel

**Kind**: instance method of [`Connext`](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | Object | The method object. |
| params.vcIds |  | virtual channel address. |
| params.balance |  | new balance diff sent |


<br/>
<br/>
<br/>

<a id="Connext+closeChannels"></a>
###  connext.closeChannels(params)Close many channels

**Kind**: instance method of [`Connext`](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | Array | Array of objects containing { vcId, balance, nonce, signature } |


<br/>
<br/>
<br/>

<a id="Connext+createLCStateUpdate"></a>
###  connext.createLCStateUpdate() ⇒Signs and generates state update for ledger channel.

If an unlocked account is present (i.e. automated client or Ingrid signing), then normal signing instead of personal signing is used.

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: signature of inputs  

<br/>
<br/>
<br/>

<a id="Connext+getLedgerChannelId"></a>
###  connext.getLedgerChannelId() ⇒Helper function to retrieve lcID.

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: the lcID for agentA = accounts[0] and ingrid  

<br/>
<br/>
<br/>

<a id="Connext+getLedgerChannel"></a>
###  connext.getLedgerChannel(params) ⇒Requests the ledger channel object by ledger channel id.

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: the ledger channel object.  

| Param | Type | Description |
| --- | --- | --- |
| params | Object | Object containing the ledger channel id |


<br/>
<br/>
<br/>

<a id="Connext+getLedgerChannelByAddress"></a>
###  connext.getLedgerChannelByAddress(params) ⇒Requests the ledger channel open between Ingrid and the provided address from the watcher.

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: ledger channels open with Ingrid and agentA (only one).  

| Param | Type | Description |
| --- | --- | --- |
| params | Object |  |
| params.agentA |  | is the address of the agentA in the ledger channel. |


<br/>
<br/>
<br/>

<a id="Connext+getLedgerChannelChallengeTimer"></a>
###  connext.getLedgerChannelChallengeTimer() ⇒Returns channel timer for the ledger channel.
Ingrid should also set and store lcID.

Called in register() function

**Kind**: instance method of [`Connext`](#Connext)  
**Returns**: the ledger channel timer period in seconds.  

<br/>
<br/>
<br/>

<a id="Connext.createLCStateUpdateFingerprint"></a>
###  Connext.createLCStateUpdateFingerprint(hashParams)Returns the LC state update fingerprint.

**Kind**: static method of [`Connext`](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| hashParams | Object | Object containing state update data to be hashed. |

