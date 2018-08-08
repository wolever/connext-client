# Typical Usage

## Joining your Connext Hub

After navigating to your application, the user will choose to transact in your ecosystem by opening a channel with your Hub. This can be as simple as a "deposit" button on your frontend which calls the `openThread()` function in the Connext Client package. We recommend that you convince users to use MetaMask or the Brave browser, as the Client package works natively with these wallets. We plan to add support for other wallets soon. 

After confirming the transaction, the user will have to wait for their deposit to be mined on-chain. This will be the only on-chain transaction that they make until they withdraw from the system.

## Transacting to Another User

After depositing into the Hub, your user can transact to any other users who also have channels open with the Hub instantly and for free!

To do so, your user opens a communication thread to their recipient. This is done by calling the `openThread()` function in the Client and passing in the recipient's address. Your user can then send signed updates in that thread by calling `updateBalance()` and inputting an updated set of balances for them and their counterparty. `updateBalance()` can be called as many times as needed with the same recipient before `closeThread()` is called to end the communication with that recipient.

From a user experience perspective, you can either expose opening and closing threads to the user by having them explicitly initiate and close interactions with a counterparty, or you can abstract this away by closing a previous thread and then calling `openThread()` immediately followed by `updateBalance()` whenever the user hits a "Pay" button directed at a new counterparty. The latter is the best UX for interactions where there is a defined payer and payee relationship for the duration of the thread. In other words, all payments happen in one direction. 

Note: For each method call, the user will have to sign the transaction. Because client packages are instantiated with the user's locally available Web3 Provider, MetaMask will automatically pop up for the user when a signature is required.

The user can continue to open, transact in and close threads while they have funds in their channel for as long as they wish to. They will not pay any Ethereum transaction fees in this time.

## Withdrawing from the Hub

When a user wishes to settle their final balance they can close their channel and withdraw from the Hub. This can be done using a "Withdraw Funds" button on your frontend which calls the `closeChannel()` method in the Client.

`closeChannel()` will automatically retrieve the latest available signed state update for the user, which will always contain Merkelized metadata about any currently open threads. The Client will then call the corresponding method in the contract, which will verify that the user has indeed closed all of their threads. Then, the contract will initiate the closing process by starting a timer by which the latest state must be submitted.

Hub's will also automatically submit their latest available update, and we expect that in the _vast_ majority of cases, their update will match the users'. To improve usability, the contract will skip the timer and do a "fast close" if both the user and the Hub agree on the latest update. In the event that they don't, the user and Hub will be free to submit a higher nonce update until they agree or the timer runs out.

Requiring that all threads need to be closed before a channel can be closed ensures that neither the user nor the Hub can conduct a "replay attack", where an older state is used to close a channel. In other words, it can never be the case that a user signs a transaction to a counterparty, but does not fulfill that transaction. In the event that users or Hubs are unresponsive either because of unavailability or malicious intent, any or all threads can be closed by calling a catch-all "Byzantine" dispute method. This will forcibly initiate a closing process on-chain for threads which would work very similarly to the channel timer described above. Since it will cost Ethereum transaction fees to close threads using this mechanism, we expect it only to be used in very rare cases.

