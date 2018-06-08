
<br/>
<br/>
<br/>

<a id="module_Ethcalate"></a>
## Ethcalate
* [Ethcalate](#module_Ethcalate)
    * [Ethcalate](#exp_module_Ethcalate--Ethcalate) ⏏
        * [new Ethcalate(web3, contractAddress, apiURL, drizzle)](#new_module_Ethcalate--Ethcalate_new)
        * [.initContract()](#module_Ethcalate--Ethcalate+initContract)
        * [.createOpeningCerts(virtualChannelOptions, unlockedAccountPresent)](#module_Ethcalate--Ethcalate+createOpeningCerts) ⇒
        * [.sendOpeningCerts(virtualChannelId, cert)](#module_Ethcalate--Ethcalate+sendOpeningCerts) ⇒


<br/>
<br/>
<br/>

<a id="exp_module_Ethcalate--Ethcalate"></a>
### Ethcalate ⏏**Kind**: global class of [<code>Ethcalate</code>](#module_Ethcalate)  

<br/>
<br/>
<br/>

<a id="new_module_Ethcalate--Ethcalate_new"></a>
#### new Ethcalate(web3, contractAddress, apiURL, drizzle)Instantiates connext class.


| Param | Type | Description |
| --- | --- | --- |
| web3 | <code>Web3</code> | the web3 instance used. |
| contractAddress | <code>String</code> | the contract used within the channels. Optional - used for dev. |
| apiURL | <code>String</code> | the url of the hub API. Optional - used for dev. |
| drizzle | <code>Drizzle</code> | Drizzle context, optional. If using, should pass in the web3 object from drizzle in the web3 param. |


<br/>
<br/>
<br/>

<a id="module_Ethcalate--Ethcalate+initContract"></a>
#### ethcalate.initContract()Instantiates the channel manager contract using the web3 instance, or the drizzle context.
Sets the ChannelManager to a truffle wrapped contract, and sets the default account as accounts[0]

**Kind**: instance method of [<code>Ethcalate</code>](#exp_module_Ethcalate--Ethcalate)  

<br/>
<br/>
<br/>

<a id="module_Ethcalate--Ethcalate+createOpeningCerts"></a>
#### ethcalate.createOpeningCerts(virtualChannelOptions, unlockedAccountPresent) ⇒Generates the opening certificates for requested virtual channels

**Kind**: instance method of [<code>Ethcalate</code>](#exp_module_Ethcalate--Ethcalate)  
**Returns**: signature of virtual channel data  

| Param | Type | Description |
| --- | --- | --- |
| virtualChannelOptions | <code>Object</code> |  |
| virtualChannelOptions.id | <code>String</code> | virtual channel identifier |
| virtualChannelOptions.agentA | <code>String</code> | virtual channel agent A |
| virtualChannelOptions.agentB | <code>String</code> | virtual channel agent B |
| unlockedAccountPresent | <code>Boolean</code> |  |


<br/>
<br/>
<br/>

<a id="module_Ethcalate--Ethcalate+sendOpeningCerts"></a>
#### ethcalate.sendOpeningCerts(virtualChannelId, cert) ⇒Sends the opening certifications to the hub from the default web3 account.

**Kind**: instance method of [<code>Ethcalate</code>](#exp_module_Ethcalate--Ethcalate)  
**Returns**: response from the hub upon recieving the certs.  

| Param | Type | Description |
| --- | --- | --- |
| virtualChannelId | <code>string</code> |  |
| cert | <code>string</code> | signature generated from the sendOpeningCerts method. |

