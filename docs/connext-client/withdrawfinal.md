# withdraw

**connext.withdraw\(**sender**\)** ⇒ `Promise`closeChannel bonded funds from channel after a channel is challenge-closed and the challenge period expires by calling withdraw using the internal web3 instance.

Looks up channel by the account address of the client-side user if sender parameter is not supplied.

Calls the "byzantinecloseThread" function on the contract.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the transaction hash from calling byzantinecloseThread

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| sender | `String` |  | \(optional\) the person sending the on chain transaction, defaults to accounts\[0\] |

**Example**

```javascript
const success = await connext.closeChannel()
if (!success) {
  // wait out challenge timer
  await connext.withdraw()
}
```

