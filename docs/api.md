## Members

<dl>
<dt><a href="#value">value</a> ⇒ <code>String</code></dt>
<dd><p>Updates channel balance by provided ID.</p>
<p>In the unidirectional scheme, this function is called by the &quot;A&quot; party only.
Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.</p>
</dd>
<dt><a href="#value">value</a></dt>
<dd><p>Closes specified channel using latest double signed update.</p>
<p>Generates a decomposed LC update containing the updated balances and VCRoot to Ingrid from latest
double signed VC update.</p>
</dd>
</dl>

<a name="value"></a>

## value ⇒ <code>String</code>Updates channel balance by provided ID.

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
<a name="value"></a>

## valueCloses specified channel using latest double signed update.

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
