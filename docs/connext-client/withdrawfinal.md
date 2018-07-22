# withdrawFinal

**connext.withdrawFinal\(**sender**\)** ⇒ `Promise`Withdraw bonded funds from channel after a channel is challenge-closed and the challenge period expires by calling withdrawFinal using the internal web3 instance.

Looks up channel by the account address of the client-side user if sender parameter is not supplied.

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

