# closeThread

**connext.closeThread\(**channelId**\)** ⇒ `Promise`Closes a thread.

Retrieves the latest thread state update, and decomposes the thread into their respective channel updates.

The thread agent who called this function signs the closing channel update, and forwards the signature to the Hub.

The hub verifies the signature, returns her signature of the proposed thread decomposition, and proposes the channel update for the other thread participant.

If the Hub does not return its signature on the proposed thread decomposition, the caller goes to chain by calling initThread and settleThread.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the signature of the hub on the generated update if accepted, or the result of closing the channel on chain if there is a dispute

| Param | Type | Description |
| --- | --- | --- |
| channelId | `Number` | ID of the thread to close |

**Example**

```javascript
await connext.closeChannel({
  channelId: 0xadsf11..,
  balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
})
```

