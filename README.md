# ethcalate-client
Ethcalate creates containerized state channels for dapps. This repository contains the client-side code for installing and using Ethcalate services within your decentralized application.

This repository is designed to be used in conjunction with the Ethcalate Hub and pre-deployed contracts.

## Getting Started
These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

```
Give examples
```

### Installing

To get started, you can clone this repository or download the Ethcalate package via npm.

```
npm install ethcalate --save
```

### Instantiating
You must provide the Ethcalate class with the contractAddress and abi as constructor parameters:

```require('ethcalate')
const ethcalate = Ethcalate(contractAddress, abi)
```

## Using the Ethcalate Package

Explain how to run the automated tests for this system

### openChannel(destination, stake, challenge)

This function creates a new bidirectional payment channel between the `msg.sender` (taken implicitly), and the `destination` provided. The `stake` specifies the stake in ETH the sender is willing to put up for the channel, and `challenge` is the length of the challenge period in seconds.

### updatePhone(phone)

Allows user to update the phoneNumber associated with their account. `phone` is the new number provided.


### getChannelStatus(channelID)

Returns the current status of the payment channel by the provided `channelID`. Possible options are: open, challenge, closed.


### getUpdates(channelID, nonce)

This function sends channel updates to the phone number associated with each of the channel members accounts. The inputs are the `channelID` and `nonce` of the requested channel status.

### getChannels()

Returns all of the channels associated with the `msg.sender`.

### getChannelID(counterparty)

Returns the channelID of the channels that exist between `msg.sender` and the provided `counterparty` address.


## Contributing

We welcome any contributions and feedback to our code!

To make a contribution, please first open a github issue with a description of the changes that need to be made. Then, submit a pull request referencing the issue.

All pull requests must be based off the master branch.


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Spankchain's General State Channels Repo: https://github.com/nginnever/general-state-channels
* Jehan Tremback's Universal State Channels Repo: https://github.com/jtremback/universal-state-channels