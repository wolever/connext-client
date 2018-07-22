# withdraw

**connext.withdraw\(**sender**\)** ⇒ `Promise`Withdraws bonded funds from an existing channel.

All threads must be closed before a channel can be closed.

Generates the state update from the latest Hub signed state with fast-close flag.

The Hub should countersign the closing update if it matches what she has signed previously, and the channel will fast close by calling consensusCloseChannel on the contract.

If the state update doesn't match what the Hub previously signed, then updateThreadState is called with the latest state and a challenge flag.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to an object with the structure: { response: transactionHash, fastClosed: true}

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| sender | `String` |  | \(optional\) who the transactions should be sent from, defaults to account\[0\] |

**Example**

```javascript
const success = await connext.withdraw()
```

