# closeThreads

**connext.closeThreads\(**channelIds**\)**⇒ `Promise`  Closes many threads by calling closeThread on each channel ID in the provided array.

**Kind**: instance method of [`Connext`](./#Connext)

| Param | Type | Description |
| --- | --- | --- |
| channelIds | `Array.` | array of thread IDs you wish to close |

**Example**

```javascript
const channels = [
    0xasd310..,
    0xadsf11..,
]
await connext.closeChannels(channels)
```



