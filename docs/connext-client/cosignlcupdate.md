# cosignThreadUpdate

**connext.cosignThreadUpdate\(**channelId, sender**\)** ⇒ `Promise`Verifies and cosigns the latest state update.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the cosigned thread state update

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| threadId | `String` |  | thread id |
| sender | `String` |  | \(optional\) the person who cosigning the update, defaults to accounts\[0\] |

**Example**

```javascript
const channelId = await connext.getThreadId() // get ID by accounts[0] and open status by default
await connext.cosignThreadUpdate(threadId)
```

