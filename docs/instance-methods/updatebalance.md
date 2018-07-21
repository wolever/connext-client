# updateBalance

**connext.updateBalance\(**params**\)** ⇒ `Promise`Updates channel balance by provided ID and balances.

In the unidirectional scheme, this function is called by the "A" party only, and only updates that increase the balance of the "B" party are accepted.

Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.

**Kind**: instance method of [`Connext`](../connext-client/#Connext)  
**Returns**: `Promise` - resolves to the signature of the "A" party on the balance update

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the method object |
| params.channelId | `String` | ID of channel |
| params.balanceA | `BigNumber` | channel balance in Wei \(of "A" party\) |
| params.balanceB | `BigNumber` | channel balance in Wei \(of "B" party\) |

**Example**

```javascript
await connext.updateBalance({
  channelId: 10,
  balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
})
```

