# Connext Client

ConnextClass representing an instance of a Connext client.

**Kind**: global class

new Connext\(params\)Create an instance of the Connext client.

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the constructor object |
| params.web3 | `Web3` | the web3 instance |
| params.ingridAddress | `String` | ETH address of intermediary \(defaults to Connext hub\) |
| params.watcherUrl | `String` | url of watcher server \(defaults to Connext hub\) |
| params.ingridUrl | `String` | url of intermediary server \(defaults to Connext hub\) |
| params.contractAddress | `String` | address of deployed contract \(defaults to latest deployed contract\) |
| params.hubAuth | `String` | token authorizing client package to make requests to hub |

connext.register\(initialDeposit, sender, challenge\) ⇒ `Promise`Opens a ledger channel with Ingrid \(Hub\) at the address provided when instantiating the Connext instance with the given initial deposit.

Sender defaults to accounts\[0\] if not supplied to the register function.

Ledger channel challenge timer is determined by Ingrid \(Hub\) if the parameter is not supplied. Current default value is 3600s \(1 hour\).

Uses the internal web3 instance to call the createChannel function on the Channel Manager contract, and logs the transaction hash of the channel creation. The function returns the ID of the created channel.

Once the channel is created on chain, users should call the requestJoinLc function to request that the hub joins the channel. This function should be called on a timeout sufficient for the hub to detect the channel and add it to its database.

If Ingrid is unresponsive, or does not join the channel within the challenge period, the client function "LCOpenTimeoutContractHandler" can be called by the client to recover the funds.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the ledger channel id of the created channel

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| initialDeposit | `BN` |  | deposit in wei |
| sender | `String` |  | \(optional\) counterparty with hub in ledger channel, defaults to accounts\[0\] |
| challenge | `Number` |  | \(optional\) challenge period in seconds |

**Example**

```javascript
const deposit = Web3.utils.toBN(Web3.utils.toWei('1', 'ether))
const lcId = await connext.register(deposit)
```

connext.deposit\(depositInWei, sender, recipient\) ⇒ `Promise`Adds a deposit to an existing ledger channel by calling the contract function "deposit" using the internal web3 instance.

Can be used by any either channel party.

If sender is not supplied, it defaults to accounts\[0\]. If the recipient is not supplied, it defaults to the sender.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the transaction hash of the onchain deposit.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| depositInWei | `BN` |  | value of the deposit |
| sender | `String` |  | \(optional\) ETH address sending funds to the ledger channel |
| recipient | `String` |  | \(optional\) ETH address recieving funds in their ledger channel |

**Example**

```javascript
// get a BN
const deposit = Web3.utils.toBN(Web3.utils.toWei('1','ether'))
const txHash = await connext.deposit(deposit)
```

connext.openChannel\(params\) ⇒ `Promise`Opens a virtual channel between "to" and sender with Ingrid as the hub. Both users must have a ledger channel open with ingrid.

If there is no deposit provided, then 100% of the ledger channel balance is added to virtual channel deposit. This function is to be called by the "A" party in a unidirectional scheme.

Signs a copy of the initial virtual channel state, and generates a proposed ledger channel update to the hub for countersigning that updates the number of open virtual channels and the root hash of the ledger channel state.

This proposed state update serves as the opening certificate for the virtual channel, and is used to verify Ingrid agreed to facilitate the creation of the virtual channel and take on the counterparty risk.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the virtual channel ID recieved by Ingrid

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the method object |
| params.to | `String` | ETH address you want to open a virtual channel with |
| params.deposit | `BN` | \(optional\) deposit in wei for the virtual channel, defaults to the entire LC balance |
| params.sender | `String` | \(optional\) who is initiating the virtual channel creation, defaults to accounts\[0\] |

**Example**

```javascript
const myFriendsAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
await connext.openChannel({ to: myFriendsAddress })
```

connext.joinChannel\(channelId, sender\) ⇒ `Promise`Joins virtual channel with provided channelId with a deposit of 0 \(unidirectional channels\).

This function is to be called by the "B" party in a unidirectional scheme.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the virtual channel ID

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| channelId | `String` |  | ID of the virtual channel |
| sender | `String` |  | \(optional\) ETH address of the person joining the virtual channel \(partyB\) |

**Example**

```javascript
const channelId = 10 // pushed to partyB from Ingrid
await connext.joinChannel(channelId)
```

connext.updateBalance\(params\) ⇒ `Promise`Updates channel balance by provided ID and balances.

In the unidirectional scheme, this function is called by the "A" party only, and only updates that increase the balance of the "B" party are accepted.

Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the signature of the "A" party on the balance update

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the method object |
| params.channelId | `String` | ID of channel |
| params.balanceA | `BigNumber` | channel balance in Wei \(of "A" party\) |
| params.balanceB | `BigNumber` | channel balance in Wei \(of "B" party\) |

**Example**

```javascript
await connext.updateBalance({
  channelId: 10,
  balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
})
```

connext.closeChannel\(channelId\) ⇒ `Promise`Closes a virtual channel.

Retrieves the latest virtual state update, and decomposes the virtual channel into their respective ledger channel updates.

The virtual channel agent who called this function signs the closing ledger-channel update, and forwards the signature to Ingrid.

Ingrid verifies the signature, returns her signature of the proposed virtual channel decomposition, and proposes the LC update for the other virtual channel participant.

If Ingrid does not return her signature on the proposed virtual channel decomposition, the caller goes to chain by calling initVC and settleVC.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the signature of the hub on the generated update if accepted, or the result of closing the channel on chain if there is a dispute

| Param | Type | Description |
| --- | --- | --- |
| channelId | `Number` | ID of the virtual channel to close |

**Example**

```javascript
await connext.closeChannel({
  channelId: 0xadsf11..,
  balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
})
```

connext.closeChannels\(channelIds\)Closes many virtual channels by calling closeChannel on each channel ID in the provided array.

**Kind**: instance method of [`Connext`](./#Connext)

| Param | Type | Description |
| --- | --- | --- |
| channelIds | `Array.` | array of virtual channel IDs you wish to close |

**Example**

```javascript
const channels = [
    0xasd310..,
    0xadsf11..,
]
await connext.closeChannels(channels)
```

connext.withdraw\(sender\) ⇒ `Promise`Withdraws bonded funds from an existing ledger channel.

All virtual channels must be closed before a ledger channel can be closed.

Generates the state update from the latest ingrid signed state with fast-close flag.

Ingrid should countersign the closing update if it matches what she has signed previously, and the channel will fast close by calling consensusCloseChannel on the contract.

If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to an object with the structure: { response: transactionHash, fastClosed: true}

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| sender | `String` |  | \(optional\) who the transactions should be sent from, defaults to account\[0\] |

**Example**

```javascript
const success = await connext.withdraw()
```

connext.withdrawFinal\(sender\) ⇒ `Promise`Withdraw bonded funds from ledger channel after a channel is challenge-closed and the challenge period expires by calling withdrawFinal using the internal web3 instance.

Looks up LC by the account address of the client-side user if sender parameter is not supplied.

Calls the "byzantineCloseChannel" function on the contract.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the transaction hash from calling byzantineCloseChannel

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| sender | `String` |  | \(optional\) the person sending the on chain transaction, defaults to accounts\[0\] |

**Example**

```javascript
const success = await connext.withdraw()
if (!success) {
  // wait out challenge timer
  await connext.withdrawFinal()
}
```

connext.cosignLatestLcUpdate\(lcId, sender\) ⇒ `Promise`Verifies and cosigns the latest ledger state update.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the cosigned ledger channel state update

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| lcId | `String` |  | ledger channel id |
| sender | `String` |  | \(optional\) the person who cosigning the update, defaults to accounts\[0\] |

**Example**

```javascript
const lcId = await connext.getLcId() // get ID by accounts[0] and open status by default
await connext.cosignLatestLcUpdate(lcId)
```

connext.cosignLCUpdate\(params\) ⇒ `Promise`Verifies and cosigns the ledger state update indicated by the provided nonce.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the cosigned ledger channel state update

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the method object |
| params.lcId | `String` | ledger channel id |
| params.sender | `String` | \(optional\) the person who cosigning the update, defaults to accounts\[0\] |

**Example**

```javascript
const lcId = await connext.getLcId() // get ID by accounts[0] and open status by default
await connext.cosignLatestLcUpdate(lcId)
```

connext.LCOpenTimeoutContractHandler\(lcId, sender\) ⇒ `Promise`Watchers or users should call this to recover bonded funds if Ingrid fails to join the ledger channel within the challenge window.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the result of sending the transaction

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| lcId | `String` |  | ledger channel id the hub did not join |
| sender | `String` |  | \(optional\) who is calling the transaction \(defaults to accounts\[0\]\) |

connext.getChannelsByLcId\(ledgerChannelId\) ⇒ `Promise`Returns an array of the virtual channel states associated with the given ledger channel.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to an Array of virtual channel objects

| Param | Type | Description |
| --- | --- | --- |
| ledgerChannelId | `String` | ID of the ledger channel |

connext.getLcId\(partyA, status\) ⇒ `Promise`Returns the ledger channel id between the supplied address and ingrid.

If no address is supplied, accounts\[0\] is used as partyA.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to either the ledger channel id between hub and supplied partyA, or an Array of the channel IDs between hub and partyA.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| partyA | `String` |  | \(optional\) address of the partyA in the channel with Ingrid. |
| status | `Number` |  | \(optional\) state of virtual channel, can be 0 \(opening\), 1 \(opened\), 2 \(settling\), or 3 \(settled\). Defaults to open channel. |

connext.getChannelById\(channelId\) ⇒ `Promise`Returns an object representing the virtual channel in the database.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to an object representing the virtual channel

| Param | Type | Description |
| --- | --- | --- |
| channelId | `String` | the ID of the virtual channel |

connext.getChannelByParties\(params\) ⇒ `Promise`Returns an object representing the open virtual channel between the two parties in the database.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the virtual channel

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the method object |
| params.partyA | `String` | ETH address of partyA in virtual channel |
| params.partyB | `String` | ETH address of partyB in virtual channel |

connext.getLcById\(lcId\) ⇒ `Promise`Returns an object representing a ledger channel.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the ledger channel object

| Param | Type | Description |
| --- | --- | --- |
| lcId | `String` | the ledger channel id |

connext.getLcByPartyA\(partyA, status\) ⇒ `Promise`Returns object representing the ledger channel between partyA and Ingrid

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to ledger channel object

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| partyA | `String` |  | \(optional\) partyA in ledger channel. Default is accounts\[0\] |
| status | `Number` |  | \(optional\) state of virtual channel, can be 0 \(opening\), 1 \(opened\), 2 \(settling\), or 3 \(settled\). Defaults to open channel. |

connext.requestIngridDeposit\(params\) ⇒ `Promise`Requests ingrid deposits into a given subchannel. Ingrid must have sufficient balance in the "B" subchannel to cover the virtual channel balance of "A" since Ingrid is assuming the financial counterparty risk.

This function is to be used if the hub has insufficient balance in the ledger channel to create proposed virtual channels.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the transaction hash of Ingrid calling the deposit function

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the method object |
| params.lcId | `String` | id of the ledger channel |
| params.deposit | `BN` | the deposit in Wei |

connext.requestJoinLc\(lcId\) ⇒ `Promise`Requests Ingrid joins the ledger channel after it has been created on chain. This function should be called after the register\(\) returns the ledger channel ID of the created contract.

May have to be called after a timeout period to ensure the transaction performed in register to create the channel on chain is properly mined.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the transaction hash of Ingrid joining the channel

| Param | Type | Description |
| --- | --- | --- |
| lcId | `String` | ID of the ledger channel you want the Hub to join |

**Example**

```javascript
// use register to create channel on chain
const deposit = Web3.utils.toBN(1000)
const lcId = await connext.register(deposit)
const response = await connext.requestJoinLc(lcId)
```

Connext.getNewChannelId\(\) ⇒ `String`Returns a new channel id that is a random hex string.

**Kind**: static method of [`Connext`](./#Connext)  
**Returns**: `String` - a random 32 byte channel ID.  
  
   
   


Connext.createLCStateUpdateFingerprint\(params\) ⇒ `String`Hashes the ledger channel state update information using soliditySha3.

**Kind**: static method of [`Connext`](./#Connext)  
**Returns**: `String` - the hash of the state data

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the method object |
| params.isClose | `Boolean` | flag indicating whether or not this is closing state |
| params.channelId | `String` | ID of the ledger channel you are creating a state update for |
| params.nonce | `Number` | the sequence of the ledger channel update |
| params.openVcs | `Number` | the number of open virtual channels associated with this ledger channel |
| params.vcRootHash | `String` | the root hash of the Merkle tree containing all initial states of the open virtual channels |
| params.partyA | `String` | ETH address of partyA in the ledgerchannel |
| params.partyI | `String` | ETH address of the hub \(Ingrid\) |
| params.balanceA | `Number` | updated balance of partyA |
| params.balanceI | `Number` | updated balance of partyI |

Connext.recoverSignerFromLCStateUpdate\(params\) ⇒ `String`Recovers the signer from the hashed data generated by the Connext.createLCStateUpdateFingerprint function.

**Kind**: static method of [`Connext`](./#Connext)  
**Returns**: `String` - the ETH address of the person who signed the data

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the method object |
| params.sig | `String` | the signature of the data from an unknown agent |
| params.isClose | `Boolean` | flag indicating whether or not this is closing state |
| params.channelId | `String` | ID of the ledger channel you are creating a state update for |
| params.nonce | `Number` | the sequence of the ledger channel update |
| params.openVcs | `Number` | the number of open virtual channels associated with this ledger channel |
| params.vcRootHash | `String` | the root hash of the Merkle tree containing all initial states of the open virtual channels |
| params.partyA | `String` | ETH address of partyA in the ledgerchannel |
| params.partyI | `String` | ETH address of the hub \(Ingrid\) |
| params.balanceA | `Number` | updated balance of partyA |
| params.balanceI | `Number` | updated balance of partyI |

Connext.createVCStateUpdateFingerprint\(params\) ⇒ `String`Hashes data from a virtual channel state update using soliditySha3.

**Kind**: static method of [`Connext`](./#Connext)  
**Returns**: `String` - hash of the virtual channel state data

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the method object |
| params.channelId | `String` | ID of the virtual channel you are creating a state update for |
| params.nonce | `Number` | the sequence of the state update |
| params.partyA | `String` | ETH address of partyA |
| params.partyB | `String` | ETH address of partyB |
| params.balanceA | `Number` | updated balance of partyA |
| params.balanceB | `Number` | updated balance of partyB |

Connext.recoverSignerFromVCStateUpdate\(params\) ⇒ `String`Recovers the signer from the hashed data generated by the Connext.createVCStateUpdateFingerprint function.

**Kind**: static method of [`Connext`](./#Connext)  
**Returns**: `String` - ETH address of the person who signed the data

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the method object |
| params.sig | `String` | signature of the data created in Connext.createVCStateUpdate |
| params.channelId | `String` | ID of the virtual channel you are creating a state update for |
| params.nonce | `Number` | the sequence of the state update |
| params.partyA | `String` | ETH address of partyA |
| params.partyB | `String` | ETH address of partyB |
| params.balanceA | `Number` | updated balance of partyA |
| params.balanceB | `Number` | updated balance of partyB |

