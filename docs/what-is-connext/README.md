# What is Connext?

## A Second Layer on Ethereum

We believe that, in the future, most assets, applications and societal functions will be moved to decentralized systems. This will mean that millions of transactions per second \(TPS\) have to be processed using one or more blockchains. Currently, Ethereum averages ~10 TPS and users have to wait 15-30 seconds for their transaction to be confirmed. Moreover, transactions on the blockchain will become expensive at scale, further hindering mainstream adoption. These factors make it impossible to run an application the size of Uber or Facebook on the Ethereum blockchain. 

Short of speeding up the underlying blockchain, the only solution to this problem is to build a "layer two" on top of the Ethereum backbone. This layer would allow users to instantly and trustlessly clear transactions which wouldn't have to be settled on the base chain until much later.  This way, transactions could be batched to dramatically reduce transaction fees.

Connext is a layer two solution that lets anyone build a million-user application on Ethereum by leveraging the power of state channels.

## Easy-to-use State Channel Hubs

Connext lets companies easily set up state channel hubs, a type of layer two solution that focuses specifically on two-party interactions.  Our framework allows individual transactions to take place instantly, cheaply, and trustlessly off-chain and then be settled with the blockchain at a later time.

For more information on state channels and their construction, check out our [Background on State Channels](../background-on-state-channels.md) page.

## A Cutting-Edge Scaling Method

With Connext Hubs, there is no theoretical limit to transaction volume or speed; rather, state channel technology scales with its user volume, and server capacity will dictate maximum throughput. Connext Hubs boil down to a simple 2-party consensus and thus \(for 2-party or sequential interactions\) offer speed and cost advantages over Plasma-based methods that \(while more suitable for n-party interactions\) necessitate a more robust consensus mechanism.

## A Solution to Transaction Latency and High Fees

Transactions via a Connext Hub offer instant finality while preserving the security of the base blockchain. Much like settling a tab at a bar, confirmation times are only incurred when a user closes their state channel with the Connext Hub. 

Because individual transactions using a Connext Hub occur off-chain, users do not incur transaction fees until they close their channel and settle their final balance with the blockchain. This dramatic reduction in transaction cost, in conjunction with decreased latency, enables a wide variety of use cases that were previously impractical: IoT transactions, high-frequency trading, content payments, and P2P marketplaces are feasible _now_ with Connext Hubs.

## Improved Privacy

In contrast to Ethereum and sidechain transactions, all individual transfers using Connext Hubs will be private between the payer, the payee, and the Hub. When a channel is settled to the blockchain, only the net of all component transactions will be recorded on the ledger.

