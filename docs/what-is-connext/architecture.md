# Architecture

Connext is made up of a few discrete repositories that interoperate. These are shown below i**n diagram form:**

## Contracts

At the core of the platform are Connext's open source state channel contracts. Our state channel implementation relies on a combination of the research done by a variety of organizations, including [Spankchain](https://github.com/SpankChain/general-state-channels/)**,** [Finality](https://finalitylabs.io)**,** [Althea](https://altheamesh.com/blog/altheas-multihop-payment-channels/)**,** [Magmo ](https://magmo.com/)and [CounterFactual](https://counterfactual.com/)**.** The contracts are fully available to the public in [our repository](https://github.com/ConnextProject/) and are continuously being improved with the help of the community.

The primary contract, `ChannelManager`, lets users instantiate new channels by accepting the user's deposit and adding to a mapping from the user's `address` to a randomly generated `channelID` . For now, this means that each user can only open one channel with each Connext Hub and that each Connext Hub should deploy it's own `ChannelManager` contract. The Contract holds deposited funds, lets users withdraw funds with appropriate updates and handles all disputes. Because we allow for "threads" to be opened across multiple open channels \(also known as "hopped" transactions\), `ChannelManager` also keeps track of the [merkle root](https://brilliant.org/wiki/merkle-tree/) of metadata associated with open threads. This stops a party from closing their channel if they haven't completed an interaction within a thread. ****[You can learn more here](../background-on-state-channels.md).

You can deploy the contract by forking the contract repository, calling `git clone your_fork` in terminal and then deploying using [Truffle](https://truffleframework.com/). Check out **Getting Started** to learn more.

Connext's state channel contracts currently manage only some types of state, mostly related to payments. Generalized state channels frameworks are still being heavily researched and it will be some time before gas optimized versions will be available. Our goal is to be framework agnostic, so that the other parts of the Connext platform can work with any underlying state channels contracts. To do this, we plan to continue collaborating heavily with research teams in the space.

## Clients

The Connext Client package is a JavaScript interface which is used to communicate with deployed Connext contracts and with other clients. The client package is available through [NPM ](https://www.npmjs.com/package/connext)and or can be cloned from its [open source repository](https://github.com/ConnextProject/connext-client). You can learn more about installing and using the Connext Client [here](../connext-client/).

Clients are typically integrated into client-side code - either the frontend of your application or directly into the wallet layer. We built and tested the Client package around [Metamask](https://metamask.io), so we would recommend using that if at all possible. If you are hosting a wallet for your users, the simplest UX is to automatically request to open a channel with your Hub when your users deposit funds into the wallet. In other words, if you are hosting a wallet for your users, you can just use a combination of the Connext Contracts and Client as the wallet itself. This way, you can abstract away the technicalities of channels vs. threads for your users.

Clients contain the following functionality:

1. Opening a channel to any counterparty and depositing funds. Typically, the counterparty field would be locked to your Hub but Clients can be used for direct channels too.
2. Opening a thread to any counterparty provided that a path of channels exists to them. This path is provided by Hubs.
3. Closing a thread and automatically submitting the latest available mutually agreed update.
4. Closing a channel and automatically submitting the latest available mutually agreed update.
5. Handling a dispute.
6. Generating/signing/sending and validating/receiving state updates over HTTPs. The Client takes in the address of the server that is being used to pass messages in the constructor.

As explained in our [Background](../background-on-state-channels.md) section, state channel implementations need a communication layer where users can pass signed state updates to each other. The initial implementation of Connext does this through traditional server-client HTTPS requests. While this is the simplest and most effective mechanism for now, we plan to move to a synchronous message passing layer that doesn't depend on a centralized server as soon as possible.

## Hubs

Connext Hubs can be thought of as automated implementations of the client package with additional functionality to handle continuous throughput as a company.

 Hubs are currently closed source as they are the primary means by which we monetize our software. We'll be strategically open sourcing parts of the Hub code when we move into open Beta, but some Enterprise functionality and services will still need a license to access.

Want to set up a Hub? Get in touch with us through our [Pilot Program](http://connext.network) form!

## Watchtowers

Watchtowers are 3rd party service providers that assist clients by storing state or submitting the latest update if a user isn't available during a dispute. Our open source Watchtower is still under development but can be found here.

Watchtowers are an important part of a scaled state channel network because they allow users to purchase improved UX for a small fee. Connext implements and hosts a very basic Watchtower to reduce the availibility requirements for users and to stop Hub-initiated griefing \(i.e. Hubs close threads/channels repeatedly while users are unavailable to cause them to lose state\). While Watchtowers aren't, strictly speaking, _needed_ for the formal security of the framework, they help ensure that users don't have to constantly be concerned about their open channels.

In the future, we plan on expanding the codebase to allow anyone to build a Watchtower so that a trustless Watchtower network could be created. This would be done by allowing for _bounties_ to be paid to channel contracts which can be claimed by any Watchtowers for acting as a state store or for catching cheating parties. 

