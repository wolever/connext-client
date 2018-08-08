# requestjoinThread

**connext.requestjoinThread\(**channelId**\)** ⇒ `Promise`Requests that the Hub joins the channel after it has been created on chain. This function should be called after the register\(\) returns the channel ID of the created contract.

May have to be called after a timeout period to ensure the transaction performed in register to create the channel on chain is properly mined.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the transaction hash of Ingrid joining the channel

| Param | Type | Description |
| --- | --- | --- |
| channelId | `String` | ID of the channel you want the Hub to join |

**Example**

```javascript
// use register to create channel on chain
const deposit = Web3.utils.toBN(1000)
const channelId = await connext.openChannel(deposit)
const response = await connext.requestjoinThread(channelId)
```

