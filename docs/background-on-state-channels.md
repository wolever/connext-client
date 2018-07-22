# What are State Channels?

\[\[UNDER CONSTRUCTION\]\]



ChannelManager.sol can be largely broken down into two classes of functions. The first operates as something that resembles an Ethereum multisignature wallet. The contract accepts funds from counterparties and then locks them there, requiring a signature from both parties, a "state update" \(settlement instructions\) and a "nonce" \(incrementing integer to figure out which state is the newest one\) in order to release funds. 

The second set of functions handles disputes. For well constructed, one-to-one state channels, disputes primarily occur because either \(1\) a party was unavailable or pretending to be unavailable, or \(2\) a party submitted an incorrect state when closing the channel - also known as a "replay attack". \(2\) is typically resolved by ensuring that, when a channel closes, a "challenge" timer is started within which either party can submit a newer, higher nonced, state update. This ensures that, if both parties are available, the latest mutually agreed upon update will always be used. \(1\) can be resolved with a long enough dispute timer, or with secondary mechanisms to inform a user that their channel is closing.

In our construction, we allow for "threads" to be opened across multiple channels, which then resolve down into traditional channel updates when communication in the thread is completed.

