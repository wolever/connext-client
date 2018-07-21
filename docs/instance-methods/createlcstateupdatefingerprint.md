# createChannelStateUpdateFingerprint

**connext.createChannelStateUpdateFingerprint\(**params**\)** ⇒ `String`Hashes the channel state update information using soliditySha3.

**Kind**: static method of [`Connext`](../connext-client/#Connext)  
**Returns**: `String` - the hash of the state data

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the method object |
| params.isClose | `Boolean` | flag indicating whether or not this is closing state |
| params.channelId | `String` | ID of the channel you are creating a state update for |
| params.nonce | `Number` | the sequence of the channel update |
| params.openVcs | `Number` | the number of open threads associated with this channel |
| params.vcRootHash | `String` | the root hash of the Merkle tree containing all initial states of the open threads |
| params.partyA | `String` | ETH address of partyA in the channel |
| params.partyI | `String` | ETH address of the hub \(Ingrid\) |
| params.balanceA | `Number` | updated balance of partyA |
| params.balanceI | `Number` | updated balance of partyI |

