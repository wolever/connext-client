# ethcalate-client
[Ethcalate](http://ethcalate.network) creates containerized state channels for dapps. This repository contains the client-side code for installing and using Ethcalate services within your decentralized application.

This repository is designed to be used in conjunction with the Ethcalate Hub and [pre-deployed contracts](https://github.com/ConnextProject/ethcalate-2waypayment).

## Getting Started
### Prerequesites
This package is designed for use within a dapp. The package relies on an injected Web3 object from the browser (i.e. MetaMask, which is how the package was developed and tested).

### async/await
Most functions in this package return Promises. The preferred way to consume the package is to use async/await syntax.

```
// React App.js
async componentDidMount () {
  try {
    const ethcalate = new Ethcalate()
    await ethcalate.initContract()
    const myChannels = await ethcalate.getMyChannels()
  } catch (e) {
    console.log(e)
  }
}
```

### Installing
To get started, you can clone this repository or download the Ethcalate package via npm.

```
npm install ethcalate --save
```

### Instantiating
The client is instantiated to talk to the deployed contract and Hub. The constructor takes one parameter, a web3 instance.

```
const Ethcalate = require('ethcalate')
const ethcalate = new Ethcalate(web3)
```

## Using the Ethcalate Package

### async openChannel({ to, depositInEth, challenge })

This function creates a new bidirectional payment channel between the `msg.sender` (taken implicitly), and the `to` address provided. The `depositInEth` specifies the stake in ETH the sender is willing to put up for the channel, and `challenge` is the length of the challenge period in seconds.

Note: This is an on-chain transaction, so there will be a transaction confirmation and gas fee.

```
const to = '0x627306090abab3a6e1400e9345bc60c78a8bef57'
const depositInEth = 1
const challenge = 3600 // 1 hour

await ethcalate.openChannel({ to, depositInEth, challenge })

// MetaMask will pop up to confirm transaction
```

### async joinChannel ({ channelId, depositInEth })

Joins a channel that has been opened with your address as the counterparty address.

Note: This is an on-chain transaction, so there will be a transaction confirmation and gas fee.

```
const channelId = '0xeb9222432938ac4150ea9c08ccb4ba76b5638b5f27627ae1867305f15050a64f'
const depositInEth = 1

await ethcalate.joinChannel({ channelId, depositInEth })

// MetaMask will pop up to confirm transaction
```

### async updateState ({ channelId, balanceA, balanceB })

Create a signed state update that the counterparty can use to close the channel. `balanceA` and `balanceB` are the updated balances of each party in the channel. Balances must be provided in Wei units using the web3.toWei() function.

Note: This is an *off-chain* transcation so there are NO transaction fees or gas. Hooray!

```
const channelId = '0xeb9222432938ac4150ea9c08ccb4ba76b5638b5f27627ae1867305f15050a64f'
const balanceA = web3.toWei(0.5, 'ether')
const balanceB = web3.toWei(1.5, 'ether')

await ethcalate.updateState({ channelId, balanceA, balanceB })

// MetaMask will pop up to sign message with your private key, but not send anything to the blockchain
```

### async startChallengePeriod (channelId)

Takes the last countersigned state update, signs it with your private key, and sends it to the blockchain to move the channel to a challenge period.

Note: This is an on-chain transaction, so there will be a transaction confirmation and gas fee.

```
const channelId = '0xeb9222432938ac4150ea9c08ccb4ba76b5638b5f27627ae1867305f15050a64f'

await ethcalate.startChallengePeriod(channelId)

// MetaMask will pop up twice, first to confirm signature, and second to confirm transaction
```

### async closeChannel (channelId)

Closes channel if the challenge period is over.

Note: This is an on-chain transaction, so there will be a transaction confirmation and gas fee.

```
const channelId = '0xeb9222432938ac4150ea9c08ccb4ba76b5638b5f27627ae1867305f15050a64f'

await ethcalate.closeChannel(channelId)

// MetaMask will pop up to confirm transaction
```

### async getMyChannels()

Returns all of the channels associated with the `msg.sender`.

```
const myChannels = await ethcalate.getMyChannels()
console.log('myChannels: ', myChannels)
```

### async getChannelByAddresses (agentA, agentB)

Returns the channel details of the channel that exists between the provided `agentA` and `agentB` addresses.
```
const channel = await ethcalate.getChannelByAddresses(
  '0xf17f52151ebef6c7334fad080c5704d77216b732', 
  '0x627306090abab3a6e1400e9345bc60c78a8bef57'
)
console.log('channel: ', channel)
```

### async getChannel(id)

Returns a channel given an ID.

```
const channel = await ethcalate.getChannel('0xeb9222432938ac4150ea9c08ccb4ba76b5638b5f27627ae1867305f15050a64f')
console.log('channel: ', channel)
```

## Contributing

We welcome any contributions and feedback to our code!

To make a contribution, please first open a github issue with a description of the changes that need to be made. Then, submit a pull request referencing the issue.

All pull requests must be based off the master branch.


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Spankchain's General State Channels Repo: https://github.com/nginnever/general-state-channels
* Jehan Tremback's Universal State Channels Repo: https://github.com/jtremback/universal-state-channels