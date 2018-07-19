# What is Connext?

## A Second Layer on Ethereum

We believe that, in the future, most assets, applications and societal functions will be moved to decentralized systems. This will mean that millions of transactions per second \(TPS\) have to be processed using one or many blockchains. Currently, Ethereum averages ~10 TPS, not even enough to run one large Web 2.0 application like Uber, Facebook or Reddit. Moreover, transactions on the blockchain will become expensive at scale, further hindering mainstream adoption. 

Short of speeding up the underlying blockchain itself, the only solution to this problem is to build a "layer two" on top of the Ethereum backbone. This layer would allow users to instantly and trustlessly clear transactions which wouldn't have to be settled on the base chain until much later.  By clearing them in this way, transactions could also be batched to dramatically reduce transaction fees and minimize the volume of data that needs to be put onto the blockchain.

Connext is a layer two solution that lets anyone, _today_,  build a million-user application on Ethereum by leveraging the power of state channels.

## Easy-to-use State Channel Hubs

Connext lets companies easily set up state channel hubs. State channels are a type of layer two solution that focuses specifically on interactions between any two parties. Users lock their operating funds into a [multisignature](https://en.bitcoin.it/wiki/Multisignature) Ethereum smart contract and transact by sending signed state updates amongst themselves. When finished, they use the latest signed update to unlock the funds they are owed, using the same smart contract. In the event of a dispute, the contract acts as the arbitrator, validating transaction history and ensuring fair behavior. This ensures that state channels retain the security of the underlying blockchain.

State channel _hubs_ extend this idea to facilitate two-party interactions among individuals who have not opened channels with each other. Users open channels with their application's Connext Hub \(instead of with each other\) and lock their operating funds. Then, they send signed updates directly to their counterparty, just like with a normal state channel, which we call opening a communication "thread". When they are done transacting to their counterparty, they close the thread, which initiates an automated process to turn the results of the thread into two signed state updates: one from the payer to the hub and the second from the hub to the payee. 

Users can open new threads with subsequent counterparties, limited only by the amount of funds they have available. Because this entire process occurs on layer two rather than on the underlying blockchain, users do not pay any transaction fees or wait for blockchain confirmations until they close their state channel with the hub. At that point, their state history \(i.e., all of the user's transactions\) is compiled down into one final transaction on the blockchain. Like with simple state channels, state channel hub smart contracts act as arbitrators, so that neither users nor the hub have to trust each other _at all._ For more information on state channels and their construction, check out our [Background on State Channels](../background-on-state-channels.md) page.

## A Cutting-Edge Scaling Method

Connext Hubs allow blockchains to achieve transaction volumes that are impossible on current public, permissionless ledgers. "Layer 1" improvements aimed at increasing computation per block will augment base capacity, but to support mainstream adoption at Web 2.0 scale a more substantial solution is necessary.

With Connext Hubs, there is no theoretical limit to transaction volume or speed; rather, state channel technology scales with its user volume, and server capacity will dictate maximum throughput. In addition, all transactions retain the trustlessness and security of the underlying blockchain. Connext Hubs boil down to a simple 2-party consensus and thus \(for 2-party or sequential interactions\) offer speed and cost advantages over Plasma-based methods that \(while more suitable for n-party interactions\) necessitate a more robust consensus mechanism.

## A Solution to Transaction Latency and High Fees

At present, Ethereum block confirmation times range from 15-30 seconds. In practice, users have to endure wait times of several minutes for their transaction to be finalized. This degrades user experience for even the best-designed applications.

Transactions via a Connext Hub, however, offer instant finality while preserving the security of the base blockchain. As soon as a user receives a signed state update, they have absolute certainty that their transaction has occured and that funds have been conveyed appropriately. Much like settling a tab at a bar, confirmation times are only incurred when a user closes their state channel with the Connext Hub. 

In addition to latency, transactions on Ethereum incur transaction fees \(gas\). At high transaction volumes, transaction fees will rise and become prohibitively large for Web 2.0 -scale applications. 

Because individual transactions using a Connext Hub occur off-chain, users do not incur transaction fees until they close their channel and settle their final balance with the blockchain. This dramatic reduction in transaction cost, in conjunction with decreased latency, enables a wide variety of use cases that were previously impractical: IoT transactions, high-frequency trading, content payments, and P2P marketplaces are feasible _now_ with Connext Hubs.

## Improved Privacy

In contrast to Ethereum and sidechain transactions, all individual transfers using Connext Hubs will be private between the payer, the payee, and the Hub. When a channel is settled to the blockchain, only the net of all component transactions will be recorded on the ledger.

