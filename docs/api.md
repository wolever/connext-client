<br/>
<br/>
<br/>

<a id="value"></a>

<h2>value ⇒ <code>String</code></h2>Updates channel balance by provided ID.

In the unidirectional scheme, this function is called by the "A" party only.
Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.

**Kind**: global variable  
**Returns**: <code>String</code> - Returns signature of balance update.  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | The method object. |
| params.channelId | <code>Number</code> | ID of channel. |
| params.balance | <code>BigNumber</code> | Channel balance in Wei (of "A" party). |

**Example**  
```js
await connext.updateBalance({
  channelId: 10,
  balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
})
```
<br/>
<br/>
<br/>

<a id="value"></a>

<h2>value</h2>Closes specified channel using latest double signed update.

Generates a decomposed LC update containing the updated balances and VCRoot to Ingrid from latest
double signed VC update.

**Kind**: global variable  

| Param | Type | Description |
| --- | --- | --- |
| channelId | <code>Number</code> | virtual channel ID |

**Example**  
```js
await connext.fastCloseChannel(10)
```
