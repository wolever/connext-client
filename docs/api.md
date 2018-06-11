<br/>
<br/>
<br/>

<a id="Connext"></a>

<h2>Connext</h2>Class representing an instance of a Connext client.

**Kind**: global class  

<br/>
<br/>
<br/>

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

<a id="Connext___register"></a>

<h2>connext.register(initialDeposit) ⇒ <code>String</code></h2>Opens a ledger channel with ingridAddress and bonds initialDeposit.
Requests a challenge timer for the ledger channel from ingrid.

Use web3 to call openLC function on ledgerChannel.

Ingrid will open with 0 balance, and can call the deposit function to
add deposits based on user needs.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - result of calling openLedgerChannel on the channelManager instance.  
**Throws**:

- Will throw an error if initContract has not been called.


| Param | Type | Description |
| --- | --- | --- |
| initialDeposit | <code>BigNumber</code> | deposit in wei |

<br/>
<br/>
<br/>

<a id="Connext___deposit"></a>

<h2>connext.deposit(depositInWei)</h2>Add a deposit to an existing ledger channel. Calls contract function "deposit".

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Throws**:

- Will throw an error if initContract has not been called.


| Param | Type | Description |
| --- | --- | --- |
| depositInWei | <code>BigNumber</code> | Value of the deposit. |

<br/>
<br/>
<br/>

<a id="Connext___withdraw"></a>

<h2>connext.withdraw() ⇒ <code>String</code></h2>Withdraw bonded funds from ledger channel with ingrid. All virtual channels must be closed before a ledger channel can be closed.

Generates the state update from the latest ingrid signed state with fast-close flag. Ingrid should countersign if the state update matches what she has signed previously, and the channel will fast close by calling consensusCloseChannel on the Channel Manager contract.

If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - Flag indicating whether the channel was consensus-closed or if lc was challenge-closed.  
**Throws**:

- Will throw an error if initContract has not been called.

<br/>
<br/>
<br/>

<a id="Connext___withdrawFinal"></a>

<h2>connext.withdrawFinal()</h2>Withdraw bonded funds from ledger channel after a channel is challenge-closed after the challenge period expires by calling withdrawFinal using Web3.

Looks up LC by the account address of the client-side user.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Throws**:

- Will throw an error if initContract has not been called.

<br/>
<br/>
<br/>

<a id="Connext___checkpoint"></a>

<h2>connext.checkpoint()</h2>Sync signed state updates with chain.

Generates client signature on latest Ingrid-signed state update, and uses web3 to call updateLCState on the contract without challenge flag.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Throws**:

- Will throw an error if initContract has not been called.

<br/>
<br/>
<br/>

<a id="Connext___openChannel"></a>

<h2>connext.openChannel(params)</h2>Opens a virtual channel between to and caller with Ingrid as the hub. Both users must have a ledger channel open with ingrid.

If there is no deposit provided, then 100% of the ledger channel balance is added to VC deposit.

Sends a proposed LC update for countersigning that updates the VCRootHash of the ledger channel state.

This proposed LC update (termed LC0 throughout documentation) serves as the opening certificate for the virtual channel.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Throws**:

- Will throw an error if initContract has not been called.


| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | The method object. |
| params.to | <code>String</code> | Wallet address to wallet for agentB in virtual channel |
| params.deposit | <code>BigNumber</code> | User deposit for VC, in wei. Optional. |

<br/>
<br/>
<br/>

<a id="Connext___joinChannel"></a>

<h2>connext.joinChannel(vcId)</h2>Joins virtual channel by VC ID with a deposit of 0 (unidirectional channels).
Sends opening cert (VC0) to message queue, so it is accessible by Ingrid and Watchers.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Throws**:

- Will throw an error if initContract has not been called.


| Param | Type | Description |
| --- | --- | --- |
| vcId | <code>int</code> | The method object. |

<br/>
<br/>
<br/>

<a id="Connext___updateBalance"></a>

<h2>connext.updateBalance(params) ⇒ <code>Object</code></h2>Updates virtual channel balance by provided ID.

Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - Result of message posting.  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | The method object. |
| params.vcId | <code>Int</code> | ID of virtual channel. |
| params.balance | <code>BigNumber</code> | virtual channel balance |

<br/>
<br/>
<br/>

<a id="Connext___fastCloseChannel"></a>

<h2>connext.fastCloseChannel(params)</h2>Closes specified virtual channel using latest double signed update.

Generates a decomposed LC update containing the updated balances and VCRoot to Ingrid from latest
double signed VC update.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | The method object. |
| params.vcId | <code>Integer</code> | virtual channel ID |

<br/>
<br/>
<br/>

<a id="Connext___closeChannel"></a>

<h2>connext.closeChannel(params)</h2>Closes a ledger channel with Ingrid.

Retrieves decomposed LC updates from Ingrid, and countersign updates if needed (i.e. if they are recieving funds).

Settle VC is called on chain for each vcID if Ingrid does not provide decomposed state updates, and closeVirtualChannel is called for each vcID.

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Array of objects containing { vcId, balance, nonce, signature } |
| params.vcId | <code>Array.&lt;Integer&gt;</code> | Array of all virtual channel IDs that must closed before LC can close. |
| params.balance | <code>BigNumber</code> | virtual channel balance |
| params.signature | <code>String</code> | client signature of the closing state update for the virtual channel |

<br/>
<br/>
<br/>

<a id="Connext___closeChannels"></a>

<h2>connext.closeChannels(channels)</h2>Close many channels

**Kind**: instance method of [<code>Connext</code>](#Connext)  

| Param | Type | Description |
| --- | --- | --- |
| channels | <code>Array</code> | Array of virtual channel IDs to close |

<br/>
<br/>
<br/>

<a id="Connext___createLCStateUpdate"></a>

<h2>connext.createLCStateUpdate(params) ⇒ <code>Object</code></h2>Signs and generates state update for ledger channel.

If an unlocked account is present (i.e. automated client or Ingrid signing), then normal signing instead of personal signing is used.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - Result of sending state update to Ingrid  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Object containing state update data to be hashed. |
| params.isCloseFlag | <code>Integer</code> | 0 if not closing LC, 1 if closing LC state update. Defaults to 0. |
| params.nonce | <code>Integer</code> | The nonce of the proposed ledger channel state update. |
| params.openVCs | <code>Integer</code> | Number of VCs open in the ledger channel with agentA, using Ingrid as an intermediary. |
| params.vcRootHash | <code>String</code> | Indicates which VCs are open in LC. |
| params.agentA | <code>String</code> | Address of agentA in the ledger channel. |
| params.agentB | <code>String</code> | Address of agentB in the ledger channel. Defaults to Ingrid. |
| params.balanceA | <code>BigNumber</code> | Balance of agentA in ledger channel in Wei. |
| params.balanceB | <code>BigNumber</code> | Balance of agentB in ledger channel in Wei. |
| params.unlockedAccountPresent | <code>Boolean</code> | True if there is an automated signing account (e.g. Ingrid). Defaults to false. |

<br/>
<br/>
<br/>

<a id="Connext___getLatestLedgerStateUpdate"></a>

<h2>connext.getLatestLedgerStateUpdate(params) ⇒ <code>Object</code></h2>**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - Returns the result of requesting the latest signed state from the Watcher.  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Method Object |
| params.ledgerChannelId | <code>Integer</code> | ID of the ledger channel you are looking to retrieve a state update for. |
| params.sig | <code>Array.&lt;String&gt;</code> | Signature that should be on the state update. |

<br/>
<br/>
<br/>

<a id="Connext___getLedgerChannelId"></a>

<h2>connext.getLedgerChannelId() ⇒ <code>Integer</code> \| <code>null</code></h2>Helper function to retrieve lcID.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Integer</code> \| <code>null</code> - the lcID for agentA = accounts[0] and ingrid if exists, or null.  
<br/>
<br/>
<br/>

<a id="Connext___getLedgerChannel"></a>

<h2>connext.getLedgerChannel(params) ⇒ <code>Object</code></h2>Requests the ledger channel object by ledger channel id.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - the ledger channel object.  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Object containing the ledger channel id |
| params.ledgerChannelId | <code>Integer</code> | Ledger channel ID in database. |

<br/>
<br/>
<br/>

<a id="Connext___getLedgerChannelByAddress"></a>

<h2>connext.getLedgerChannelByAddress(params) ⇒ <code>Object</code></h2>Requests the ledger channel open between Ingrid and the provided address from the watcher.

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Object</code> - Ledger channel open with Ingrid and agentA (only one allowed) if exists, or null.  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> |  |
| params.agentA | <code>String</code> | Address of the agentA in the ledger channel. |

<br/>
<br/>
<br/>

<a id="Connext___getLedgerChannelChallengeTimer"></a>

<h2>connext.getLedgerChannelChallengeTimer() ⇒ <code>Integer</code></h2>Returns channel timer for the ledger channel.
Ingrid should also set and store lcID.

Called in register() function

**Kind**: instance method of [<code>Connext</code>](#Connext)  
**Returns**: <code>Integer</code> - the ledger channel timer period in seconds.  
<br/>
<br/>
<br/>

<a id="Connext__createLCStateUpdateFingerprint"></a>

<h2>Connext.createLCStateUpdateFingerprint(hashParams) ⇒ <code>String</code></h2>Returns the LC state update fingerprint.

**Kind**: static method of [<code>Connext</code>](#Connext)  
**Returns**: <code>String</code> - Hash of the input data if validated.  

| Param | Type | Description |
| --- | --- | --- |
| hashParams | <code>Object</code> | Object containing state update data to be hashed. |
| hashParams.isCloseFlag | <code>Integer</code> | 0 if not closing LC, 1 if closing LC state update. |
| hashParams.nonce | <code>Integer</code> | The nonce of the proposed ledger channel state update. |
| hashParams.openVCs | <code>Integer</code> | Number of VCs open in the ledger channel with agentA, using Ingrid as an intermediary. |
| hashParams.vcRootHash | <code>String</code> | Indicates which VCs are open in LC. |
| hashParams.agentA | <code>String</code> | Address of agentA in the ledger channel. |
| hashParams.agentB | <code>String</code> | Address of agentB in the ledger channel. Defaults to Ingrid. |
| hashParams.balanceA | <code>BigNumber</code> | Balance of agentA in ledger channel in Wei. |
| hashParams.balanceB | <code>BigNumber</code> | Balance of agentB in ledger channel in Wei. |

<br/>
<br/>
<br/>

<a id="regexExpessions"></a>

<h2>regexExpessions : <code>Object</code></h2>Regexs for validating function in inputs

**Kind**: global constant  
