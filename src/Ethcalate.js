const axios = require('axios')
const check = require('check-types')
const contract = require('truffle-contract')
const abi = require('ethereumjs-abi')
const artifacts = require('../artifacts/ChannelManager.json')

module.exports = class Ethcalate {
  constructor (web3, contractAddress, apiUrl) {
    this.web3 = web3
    if (contractAddress) {
      this.contractAddress = contractAddress
    } else {
      this.contractAddress = '0xb1ef1bca2117b99edee5abc90ec2024f603ee59b'
    }
    if (apiUrl) {
      this.apiUrl = apiUrl
    } else {
      this.apiUrl = 'https://api.ethcalate.network'
    }
  }

  async initContract () {
    // init channel manager
    const ChannelManager = contract(artifacts)
    ChannelManager.setProvider(this.web3.currentProvider)
    ChannelManager.defaults({ from: this.web3.eth.accounts[0] })

    // init instance
    let channelManager
    if (this.contractAddress) {
      channelManager = await ChannelManager.at(this.contractAddress)
    } else {
      channelManager = await ChannelManager.deployed()
    }
    this.channelManager = channelManager
  }

  async openChannel ({ to, depositInWei, challenge }) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }
    check.assert.string(to, 'No counterparty address provided')
    check.assert.string(depositInWei, 'No initial deposit provided')
    check.assert.string(challenge, 'No challenge timer provided')

    const result = await this.channelManager.openChannel(to, challenge, {
      value: depositInWei
    })
    return result
  }

  async joinChannel ({ channelId, depositInWei }) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }
    check.assert.string(channelId, 'No channelId provided')
    check.assert.string(depositInWei, 'No initial deposit provided')

    const result = await this.channelManager.joinChannel(channelId, {
      value: depositInWei
    })
    return result
  }

  async signTx ({ channelId, nonce, balanceA, balanceB }) {
    // fingerprint = keccak256(channelId, nonce, balanceA, balanceB)
    let hash = abi
      .soliditySHA3(
        ['bytes32', 'uint256', 'uint256', 'uint256'],
        [channelId, nonce, balanceA, balanceB]
      )
      .toString('hex')
    hash = `0x${hash}`
    const sig = new Promise((resolve, reject) => {
      this.web3.eth.sign(this.web3.eth.accounts[0], hash, (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
    return sig
  }

  async updateState ({ channelId, balanceA, balanceB }) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }

    let { channel } = await this.getChannel(channelId)
    let isAgentA
    if (channel.agentA === this.web3.eth.accounts[0]) {
      isAgentA = true
    } else if (channel.agentB === this.web3.eth.accounts[0]) {
      // need sigA
      isAgentA = false
    } else {
      throw new Error('Not my channel')
    }

    let nonce = 1
    const latestTransaction = channel.transactions[0]
    if (latestTransaction) {
      nonce = latestTransaction.nonce + 1
    }

    const sig = await this.signTx({ channelId, nonce, balanceA, balanceB })

    // set variables based on who signed it
    const sigA = isAgentA ? sig : ''
    const sigB = !isAgentA ? sig : ''
    const requireSigA = isAgentA
    const requireSigB = !isAgentA

    const response = await axios.post(`${this.apiUrl}/state`, {
      channelId,
      nonce,
      balanceA,
      balanceB,
      sigA,
      sigB,
      requireSigA,
      requireSigB
    })
    return response.data
  }

  async startChallengePeriod (channelId) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }
    let { channel } = await this.getChannel(channelId)
    let sig
    if (channel.agentA === this.web3.eth.accounts[0]) {
      // need sigB
      sig = 'sigB'
    } else if (channel.agentB === this.web3.eth.accounts[0]) {
      // need sigA
      sig = 'sigA'
    } else {
      throw new Error('Not my channel')
    }

    const response = await this.getLatestStateUpdate(channelId, sig)
    channel = response.channel

    const latestCountersignedTransction = channel.transactions[0]
    if (latestCountersignedTransction) {
      const {
        nonce,
        balanceA,
        balanceB,
        sigA,
        sigB
      } = latestCountersignedTransction
      const signedTx = await this.signTx({
        channelId,
        nonce,
        balanceA,
        balanceB
      })
      if (sig === 'sigA') {
        // ours is sigB
        await this.channelManager.startChallenge(
          channelId,
          nonce,
          balanceA,
          balanceB,
          sigA,
          signedTx,
          { from: this.web3.eth.accounts[0] }
        )
      } else {
        // ours is sigA
        await this.channelManager.startChallenge(
          channelId,
          nonce,
          balanceA,
          balanceB,
          signedTx,
          sigB,
          { from: this.web3.eth.accounts[0] }
        )
      }
    } else {
      throw new Error('No countersigned transaction to close channel with')
    }
  }

  async closeChannel (channelId) {
    await this.channelManager.closeChannel(channelId, {
      from: this.web3.eth.accounts[0]
    })
  }

  async updatePhone (phone) {
    check.assert.string(phone, 'No phone number provided')
    const response = await axios.post(`${this.apiUrl}/updatePhone`, {
      address: this.web3.eth.accounts[0],
      phone: phone
    })
    return response.data
  }

  async getChannel (channelId) {
    check.assert.string(channelId, 'No channelId provided')
    const response = await axios.get(`${this.apiUrl}/channel/id/${channelId}`)
    return response.data
  }

  async getMyChannels (status) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }

    let apiUrl = `${this.apiUrl}/channel?address=${this.web3.eth.accounts[0]}`
    apiUrl = status ? `${apiUrl}&status=${status}` : apiUrl

    const response = await axios.get(apiUrl)
    if (response.data) {
      return response.data.channels.map(channel => {
        // if balances dont exist from stateUpdate, balance = deposit
        const latestTransaction = channel.transactions[0]
        if (!latestTransaction) {
          channel.balanceA = channel.depositA
          channel.balanceB = channel.depositB
        } else {
          channel.balanceA = latestTransaction.balanceA
          channel.balanceB = latestTransaction.balanceB
        }
        return channel
      })
    } else {
      return []
    }
  }

  async getMyUnjoinedChannels () {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }

    const response = await axios.get(
      `${this.apiUrl}/channel/unjoined?address=${this.web3.eth.accounts[0]}`
    )
    if (response.data) {
      return response.data.channels.map(channel => {
        channel.balanceA = channel.depositA
        channel.balanceB = channel.depositB
        return channel
      })
    } else {
      return []
    }
  }

  async getLatestStateUpdate (channelId, sig) {
    const response = await axios.get(
      `${this.apiUrl}/channel/id/${channelId}/latest?sig=${sig}`
    )
    return response.data
  }

  async getChannelByAddresses (agentA, agentB) {
    check.assert.string(agentA, 'No agentA account provided')
    check.assert.string(agentB, 'No agentB account provided')
    const response = await axios.get(
      `${this.apiUrl}/channel/a/${agentA}/b/${agentB}`
    )
    return response.data
  }
}
