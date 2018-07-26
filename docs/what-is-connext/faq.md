# FAQ

## What is the status of Connext?

Connext will be live on the Ethereum Mainnet with our first Hub by the end of July 2018.

## What is a state channel?

A state channel is a method of cheaply and rapidly conducting transactions off the blockchain, while still maintaining the security advantages of the underlying chain. 

If you'd like to brush up on the basics, we've put together a web series of digestible explanations:

1. [Blockchains for Babies](https://medium.com/connext/blockchains-for-babies-14e3b0bf3c36)
2. [State Channels for Babies](https://medium.com/connext/state-channels-for-babies-c39a8001d9af)

For a more technically oriented discussion, check out our [State Channel Background](../background-on-state-channels.md). 

## How does Connext compare to other state channel solutions?

**First**, our implementation of peer-to-peer transactions is significantly cheaper than other solutions on the market, especially for recurring/repeated payments. This means less operational overhead for you.

**Second**, our Hub model makes it so that transactions are not reliant on routing; the probability of a failed payment for routing reasons is zero.

**Finally**, we are also focused specifically on applications rather than payment processing, so we can offer an unparalleled developer experience. As an example, our technology does not necessitate P2P-specific technologies and can be implemented trustlessly through traditional web communication layers \(HTTP\).

For a more detailed description, see [here](../background-on-state-channels.md#what-makes-connexts-implementation-different-from-other-state-channels).

## How does Connext compare to Plasma/sidechains?

Plasma is a [proposed framework](http://plasma.io/) for scaling Ethereum capacity by using hierarchical sidechains. While it offers significant speed and latency improvements over Ethereum itself, it cannot offer the near-zero latency and near-free transaction costs that Connext can. Moreover, Connext can be complementary to Plasma sidechains much as it is to Ethereum itself. For a more in-depth explanation of the differences, see [here](../background-on-state-channels.md#state-channels-vs-plasma).

## Are there fees?

Our channel code and contracts are open source and free to use! Our Hub code \(automated implementations of the client package with additional enterprise-centric functionality\) will require a license to access.

## Do you plan to support ERC721 tokens?

Yes! ERC721 support will likely be implemented by the end of Q3 2018.

## Is there a whitepaper?

Not at the moment. We're seeing such a pressing need for Layer 2 scaling solutions that our time is best spent putting our ideas into action.

