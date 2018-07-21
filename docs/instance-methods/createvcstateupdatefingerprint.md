# createThreadStateUpdateFingerprint

**connext.createThreadStateUpdateFingerprint\(**params**\)** ⇒ `String`Hashes data from a thread state update using soliditySha3.

**Kind**: static method of [`Connext`](../connext-client/#Connext)  
**Returns**: `String` - hash of the thread state data

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the method object |
| params.threadId | `String` | ID of the thread you are creating a state update for |
| params.nonce | `Number` | the sequence of the state update |
| params.partyA | `String` | ETH address of partyA |
| params.partyB | `String` | ETH address of partyB |
| params.balanceA | `Number` | updated balance of partyA |
| params.balanceB | `Number` | updated balance of partyB |



