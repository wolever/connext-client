# cosignChannelUpdate

**connext.cosignChannelUpdate\(**channelId, sender**\)** ⇒ `Promise`Verifies and cosigns the latest state update.

**Kind**: instance method of [`Connext`](../connext-client/#Connext)  
**Returns**: `Promise` - resolves to the cosigned channel state update

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| channelId | `String` |  | channel id |
| sender | `String` |  | \(optional\) the person who cosigning the update, defaults to accounts\[0\] |

**Example**

```javascript
const channelId = await connext.getChannelId() // get ID by accounts[0] and open status by default
await connext.cosignChannelUpdate(channelId)
```

