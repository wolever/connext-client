// drizzle adds--maybe import conditionally?
const axios = require('axios')
const check = require('check-types')
const contract = require('truffle-contract')
const abi = require('ethereumjs-abi')
const artifacts = require('../artifacts/ChannelManager.json')
const tokenAbi = require('human-standard-token-abi')
const util = require('ethereumjs-util')

module.exports = class Ethcalate {
  constructor (web3, contractAddress, apiUrl, drizzle) {
    this.web3 = web3
    if (contractAddress) {
      this.contractAddress = contractAddress
    } else {
      this.contractAddress = '0xB241c06Cf09F7E5C74092D08C68dfEb024a34b14'
    }
    if (apiUrl) {
      this.apiUrl = apiUrl
    } else {
      this.apiUrl = 'https://api.ethcalate.network'
    }

    if (drizzle) {
      this.drizzle = drizzle
    } else {
      this.drizzle = null
    }
  }

  async initContract () {
    const accounts = await this.web3.eth.getAccounts()
    this.accounts = accounts
    if (this.drizzle) {
      // drizzle has already inited the contracts
      this.channelManager = this.drizzle.contracts.ChannelManager
    } else {
      // init channel manager
      const ChannelManager = contract(artifacts)
      ChannelManager.setProvider(this.web3.currentProvider)
      ChannelManager.defaults({ from: accounts[0] })
      if (typeof ChannelManager.currentProvider.sendAsync !== 'function') {
        ChannelManager.currentProvider.sendAsync = function () {
          return ChannelManager.currentProvider.send.apply(
            ChannelManager.currentProvider,
            arguments
          )
        }
      }

      // init instance
      let channelManager
      if (this.contractAddress) {
        channelManager = await ChannelManager.at(this.contractAddress)
      } else {
        channelManager = await ChannelManager.deployed()
      }
      this.channelManager = channelManager
    }
  }

  async createOpeningCerts (
    { id, agentA, agentB, ingrid },
    unlockedAccountPresent = false
  ) {
    // errs
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }

    check.assert.string(id, 'No virtual channel id provided')
    check.assert.string(agentA, 'No agentA provided')
    check.assert.string(agentB, 'No agentB provided')
    check.assert.string(ingrid, 'No ingrid provided')

    // generate data hash
    const hash = this.web3.utils.soliditySha3(
      { type: 'string', value: 'opening' },
      { type: 'string', value: id },
      { type: 'address', value: agentA },
      { type: 'address', value: agentB },
      { type: 'address', value: ingrid }
    )

    // sign hash
    let sig
    if (unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, this.accounts[0])
    } else {
      sig = await this.web3.eth.personal.sign(hash, this.accounts[0])
    }
    return sig
    // post to listener, returns ID for VC, then send the opening certs
  }

  async sendOpeningCerts (virtualChannelId, cert) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }

    check.assert.string(virtualChannelId, 'No virtual channel id provided')
    check.assert.string(cert, 'No cert provided')

    const response = await axios.post(
      `${this.apiUrl}/virtualchannel/${virtualChannelId}/cert/open`,
      {
        sig: cert,
        from: this.accounts[0]
      }
    )
    return response
  }

  recoverSignerFromOpeningCerts (sig, { id, agentA, agentB, ingrid }) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }

    check.assert.string(sig, 'No signature provided')
    check.assert.string(id, 'No virtual channel id provided')
    check.assert.string(agentA, 'No agentA provided')
    check.assert.string(agentB, 'No agentB provided')
    check.assert.string(ingrid, 'No ingrid provided')

    // generate fingerprint
    let fingerprint = this.web3.utils.soliditySha3(
      { type: 'string', value: 'opening' },
      { type: 'string', value: id },
      { type: 'address', value: agentA },
      { type: 'address', value: agentB },
      { type: 'address', value: ingrid }
    )

    fingerprint = util.toBuffer(fingerprint)

    // NEED THIS FOR GANACHE, MIGHT NOT NEED IN PROD
    const prefix = Buffer.from('\x19Ethereum Signed Message:\n')
    const prefixedMsg = util.sha3(
      Buffer.concat([
        prefix,
        Buffer.from(String(fingerprint.length)),
        fingerprint
      ])
    )
    /// ////////////////////////////////////////////

    const res = util.fromRpcSig(sig)
    const pubKey = util.ecrecover(prefixedMsg, res.v, res.r, res.s)
    const addrBuf = util.pubToAddress(pubKey)
    const addr = util.bufferToHex(addrBuf)

    return addr
  }

  async createVirtualChannel ({
    agentA,
    agentB,
    depositInWei,
    ingrid,
    validity
  }) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }
    check.assert.string(agentB, 'No counterparty address provided')
    check.assert.string(depositInWei, 'No initial deposit provided')
    check.assert.string(validity, 'No channel validity time provided')

    // ideally should get these ledger channel ids from contract
    let subchanAtoI, subchanBtoI
    try {
      subchanAtoI = await this.getChannelByAddresses(agentA, ingrid)
      subchanBtoI = await this.getChannelByAddresses(agentB, ingrid)
    } catch (e) {
      console.log(e)
    }
    // TO DO:
    if (!subchanAtoI) {
      console.log('Missing AI Ledger Channel, using fake')
      subchanAtoI = '0x00a'
    }
    if (!subchanBtoI) {
      console.log('Missing BI Ledger Channel, using fake')
      subchanBtoI = '0x00b'
    }

    // build channel
    let res
    try {
      res = await axios.post(`${this.apiUrl}/virtualchannel`, {
        agentA,
        agentB,
        depositA: depositInWei,
        ingrid,
        subchanAtoI,
        subchanBtoI,
        validity
      }) // response should be vc-id
      console.log('VC id:', res.data.id)
    } catch (e) {
      console.log(e)
    }
    return res
  }

  async openChannel ({ to, tokenContract, depositInWei, challenge }) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }
    check.assert.string(to, 'No counterparty address provided')
    check.assert.string(depositInWei, 'No initial deposit provided')
    check.assert.string(challenge, 'No challenge timer provided')

    const accounts = await this.web3.eth.getAccounts()
    const token = new this.web3.eth.Contract(tokenAbi, tokenContract)
    const contractAddress = this.drizzle
      ? this.channelManager._address
      : this.channelManager.address

    if (tokenContract) {
      await token.methods
        .approve(contractAddress, depositInWei)
        .send({ from: accounts[0] })
    }

    if (this.drizzle) {
      console.log(this.channelManager.methods)
      let stackId
      if (tokenContract) {
        stackId = this.channelManager.methods.openChannel.cacheSend(
          to,
          tokenContract,
          depositInWei,
          challenge,
          {
            from: accounts[0]
          }
        )
      } else {
        stackId = this.channelManager.methods.openChannel.cacheSend(
          to,
          0,
          0,
          challenge,
          {
            from: accounts[0],
            value: depositInWei
          }
        )
      }
      return stackId // in drizzle state, search for tx by stackId to get status
    } else {
      let result
      if (tokenContract) {
        result = await this.channelManager.openChannel(
          to,
          tokenContract,
          depositInWei,
          challenge,
          {
            from: accounts[0]
          }
        )
      } else {
        result = await this.channelManager.openChannel(to, 0, 0, challenge, {
          from: accounts[0],
          value: depositInWei
        })
      }
      return result
    }
  }

  async joinChannel ({ channelId, tokenContract, depositInWei }) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }
    check.assert.string(channelId, 'No channelId provided')
    check.assert.string(depositInWei, 'No initial deposit provided')

    const accounts = await this.web3.eth.getAccounts()
    const contractAddress = this.drizzle
      ? this.channelManager._address
      : this.channelManager.address

    if (tokenContract && parseInt(tokenContract) !== 0) {
      const token = new this.web3.eth.Contract(tokenAbi, tokenContract)
      await token.methods
        .approve(contractAddress, depositInWei)
        .send({ from: accounts[0] })
    }
    if (this.drizzle) {
      let stackId
      if (tokenContract && parseInt(tokenContract) !== 0) {
        stackId = this.channelManager.methods.joinChannel.cacheSend(
          channelId,
          depositInWei,
          {
            from: accounts[0]
          }
        )
      } else {
        stackId = this.channelManager.methods.joinChannel.cacheSend(
          channelId,
          0,
          {
            from: accounts[0],
            value: depositInWei
          }
        )
      }
      return stackId
    } else {
      let result
      if (tokenContract && parseInt(tokenContract !== 0)) {
        result = await this.channelManager.joinChannel(
          channelId,
          depositInWei,
          {
            from: accounts[0]
          }
        )
      } else {
        result = await this.channelManager.joinChannel(channelId, 0, {
          from: accounts[0],
          value: depositInWei
        })
      }
      return result
    }
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
    console.log('hash: ', hash)

    const sig = await new Promise((resolve, reject) => {
      this.web3.currentProvider.sendAsync(
        {
          method: 'eth_signTypedData',
          params: [
            [
              {
                type: 'bytes32',
                name: 'hash',
                value: hash
              }
            ],
            this.accounts[0]
          ],
          from: this.accounts[0]
        },
        function (err, result) {
          if (err) reject(err)
          if (result.error) {
            reject(result.error.message)
          }
          resolve(result)
        }
      )
    })
    console.log('sig: ', sig)
    return sig.result
  }

  async updateState ({ channelId, balanceA, balanceB }) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }

    let { channel } = await this.getChannel(channelId)

    // find out who needs to sign
    const accounts = await this.web3.eth.getAccounts()
    let isAgentA
    if (channel.agentA === accounts[0].toLowerCase()) {
      isAgentA = true
    } else if (channel.agentB === accounts[0].toLowerCase()) {
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
    console.log('updateState().sig:', sig)

    // set variables based on who signed it
    const sigA = isAgentA ? sig : ''
    const sigB = !isAgentA ? sig : ''
    const requireSigA = isAgentA
    const requireSigB = !isAgentA

    console.log(
      channelId,
      nonce,
      balanceA,
      balanceB,
      sigA,
      sigB,
      requireSigA,
      requireSigB
    )

    const response = await axios.post(
      `${this.apiUrl}/channel/id/${channelId}/state`,
      {
        nonce,
        balanceA,
        balanceB,
        sigA,
        sigB,
        requireSigA,
        requireSigB
      }
    )
    console.log('updateState returns:', response.data)
    return response.data
  }

  async startChallengePeriod (channelId) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }

    const accounts = await this.web3.eth.getAccounts()
    if (this.drizzle) {
      const stackId = this.channelManager.methods.startChallenge.cacheSend(
        channelId,
        {
          from: accounts[0],
          gas: 3000000
        }
      )
      return stackId
    } else {
      await this.channelManager.startChallenge(channelId, {
        from: accounts[0],
        gas: 3000000
      })
    }
  }

  async updateOnChain (channelId, txId) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }
    let { channel } = await this.getChannel(channelId)
    let sig
    const accounts = await this.web3.eth.getAccounts()
    if (channel.agentA === accounts[0].toLowerCase()) {
      // need sigB
      sig = 'sigB'
    } else if (channel.agentB === accounts[0].toLowerCase()) {
      // need sigA
      sig = 'sigA'
    } else {
      throw new Error('Not my channel')
    }

    const response = await this.getTransactionById(txId)
    const tx = response.transaction

    const { nonce, balanceA, balanceB, sigA, sigB } = tx
    const signedTx = await this.signTx({
      channelId,
      nonce,
      balanceA,
      balanceB
    })
    if (sig === 'sigA') {
      // ours is sigB
      if (this.drizzle) {
        const stackId = this.channelManager.methods.updateState.cacheSend(
          channelId,
          nonce,
          balanceA,
          balanceB,
          sigA,
          signedTx,
          { from: accounts[0] }
        )
        return stackId
      } else {
        await this.channelManager.updateState(
          channelId,
          nonce,
          balanceA,
          balanceB,
          sigA,
          signedTx,
          { from: accounts[0] }
        )
      }
    } else {
      // ours is sigA
      if (this.drizzle) {
        const stackId = this.channelManager.methods.updateState.cacheSend(
          channelId,
          nonce,
          balanceA,
          balanceB,
          signedTx,
          sigB,
          { from: accounts[0] }
        )
        return stackId
      } else {
        await this.channelManager.updateState(
          channelId,
          nonce,
          balanceA,
          balanceB,
          signedTx,
          sigB,
          { from: accounts[0] }
        )
      }
    }
  }

  async updateChannelFromChain (channelId) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }

    check.assert.string(channelId, 'No channelId provided')
    const res = await this.getChannel(channelId)
    console.log('channel.status:', res.channel.status)
    if (res.channel.status !== 'closed') {
      const { data } = await axios.post(
        `${this.apiUrl}/channel/id/${channelId}/update`
      )
      return data
    }
  }

  async closeChannel (channelId) {
    console.log('channel.id:', channelId)
    const accounts = await this.web3.eth.getAccounts()
    console.log('from:', accounts[0])
    if (this.drizzle) {
      const stackId = this.channelManager.methods.closeChannel.cacheSend(
        channelId,
        {
          from: accounts[0],
          gas: 3000000
        }
      )
      return stackId
    } else {
      await this.channelManager.closeChannel(channelId, {
        from: accounts[0],
        gas: 3000000
      })
    }
  }

  async updatePhone (phone) {
    const accounts = await this.web3.eth.getAccounts()
    check.assert.string(phone, 'No phone number provided')
    const response = await axios.post(`${this.apiUrl}/phone`, {
      address: accounts[0].toLowerCase(),
      phone: phone
    })
    return response.data
  }

  async updateName (name) {
    const accounts = await this.web3.eth.getAccounts()
    check.assert.string(name, 'No name provided')
    const response = await axios.post(`${this.apiUrl}/name`, {
      address: accounts[0].toLowerCase(),
      name: name
    })
    return response.data
  }

  async getChannel (channelId) {
    check.assert.string(channelId, 'No channelId provided')
    const response = await axios.get(`${this.apiUrl}/channel/id/${channelId}`)
    return response.data
  }

  async getTransactions (channelId) {
    check.assert.string(channelId, 'No channelId provided')
    const response = await axios.get(
      `${this.apiUrl}/channel/id/${channelId}/state?nonce=0`
    )
    if (response.data) {
      return response.data
    } else {
      return []
    }
  }

  async getTransactionById (txId) {
    check.assert.string(txId, 'No channelId provided')
    const response = await axios.get(`${this.apiUrl}/transaction/${txId}`)
    return response.data
  }

  async getOnChainBalance (channelId) {
    check.assert.string(channelId, 'No channelId provided')
    const { channel } = await this.getChannel(channelId)
    console.log('channel: ', channel)

    if (channel.latestOnChainNonce === 0) {
      return { balanceA: channel.depositA, balanceB: channel.depositB }
    } else {
      const { transaction } = await this.getTransactionByChannelNonce({
        channelId,
        nonce: channel.latestOnChainNonce.toString()
      })
      return { balanceA: transaction.balanceA, balanceB: transaction.balanceB }
    }
  }

  async getTransactionByChannelNonce ({ channelId, nonce }) {
    check.assert.string(channelId, 'No channelId provided')
    check.assert.string(nonce, 'No nonce provided')
    const response = await axios.get(
      `${this.apiUrl}/transaction?channel=${channelId}&nonce=${nonce}`
    )
    return response.data
  }

  async getMyChannels (status) {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }

    const accounts = await this.web3.eth.getAccounts()

    let apiUrl = `${this.apiUrl}/channel?address=${accounts[0]}`
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

  async getMyDetails () {
    const accounts = await this.web3.eth.getAccounts()
    const response = await axios.get(
      `${this.apiUrl}/user/address/${accounts[0]}`
    )
    return response.data
  }

  async getUserByAddress (account) {
    const response = await axios.get(`${this.apiUrl}/user/address/${account}`)
    return response.data
  }

  async getMyUnjoinedChannels () {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }

    const accounts = await this.web3.eth.getAccounts()
    const response = await axios.get(
      `${this.apiUrl}/channel?b=${accounts[0]}&status=open`
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
