# constructor

ConnextClass representing an instance of a Connext client.

**Kind**: global class

new Connext\(params\) Create an instance of the Connext client.

| Param | Type | Description |
| --- | --- | --- |
| params | `Object` | the constructor object |
| params.web3 | `Web3` | the web3 instance |
| params.hubAddress | `String` | ETH address of intermediary \(defaults to Connext Hub\) |
| params.watcherUrl | `String` | url of watcher server \(defaults to Connext Hub\) |
| params.hubUrl | `String` | url of intermediary server \(defaults to Connext Hub\) |
| params.contractAddress | `String` | address of deployed contract \(defaults to latest deployed contract\) |
| params.hubAuth | `String` | token authorizing client package to make requests to hub |



