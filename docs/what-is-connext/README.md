---
description: A platform to scale your blockchain application to a million users.
---

# What is Connext?

## A Second Layer on Ethereum

We believe that, in the future, most assets, applications and societal functions will be moved to decentralized systems. This will mean millions of transactions per second \(TPS\) that have to be processed using one or many blockchains. Currently, Ethereum averages ~10 TPS, not even enough to run one large Web 2.0 application like Uber, Facebook or Reddit.

Short of speeding up the underlying blockchain itself, the only solution to this problem is to build a "layer two" on top of the Ethereum backbone. This layer would allow users to trustlessly clear transactions which wouldn't have to be settled on the base chain until much later. By clearing them in this way, transactions could also be batched to reduce transaction fees and minimize the volume of data that needs to be put onto the blockchain.

Connext is a layer two solution that lets anyone, _today_,  build a million-user application on Ethereum.

## State Channel Hubs

Connext lets companies easily set up state channel hubs. State channels are one type of layer two solution that focus specifically on interactions between any two parties. Users lock their operating funds into a [multisignature](https://en.bitcoin.it/wiki/Multisignature) Ethereum smart contract and transact by sending signed state updates between themselves. When finished, they use the latest signed update to unlock the funds they are owed. In the event of a dispute, the contract acts as the arbitrator, validating transaction history and ensuring fair behavior.

State channel _hubs_ extend this idea to facilitate many-to-many two-party interactions. Users open channels with their application's Connext Hub \(instead of with each other\) and lock their operating funds. Then, they send signed updates directly to their counterparty, just like with a normal state channel, which we call opening a communication "thread". When they are done transacting to their counterparty, they close the thread, which initiates an automated process to turn the results of the thread into two signed state updates: one from the payer to the hub and the second from the hub to the payee. 

Users can then open new threads with subsequent counterparties, transacting as much or as little as they want. Because this entire process occurs on layer two, users do not pay any transaction fees or wait for blockchain confirmations until they close their state channel with the hub, at which point their state history is compiled down into one final transaction on the blockchain. Like with simple state channels, state channel hub smart contracts act as arbitrators, so that neither users nor the hub have to trust each other _at all._ For more information on state channels and their construction, check out our [Background on State Channels](../background-on-state-channels.md) page.

