# deposit

**connext.deposit\(**depositInWei, sender, recipient**\)** ⇒ `Promise`Adds a deposit to an existing channel by calling the contract function "deposit" using the internal web3 instance.

Can be used by any either channel party.

If sender is not supplied, it defaults to accounts\[0\]. If the recipient is not supplied, it defaults to the sender.

**Kind**: instance method of [`Connext`](./#Connext)  
**Returns**: `Promise` - resolves to the transaction hash of the onchain deposit.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| depositInWei | `BN` |  | value of the deposit |
| sender | `String` |  | \(optional\) ETH address sending funds to the channel |
| recipient | `String` |  | \(optional\) ETH address recieving funds in their channel |

**Example**

```javascript
// get a BN
const deposit = Web3.utils.toBN(Web3.utils.toWei('1','ether'))
const txHash = await connext.deposit(deposit)
```

