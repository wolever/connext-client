const axios = require('axios')
const check = require('check-types')
const contract = require('truffle-contract')
const abi = require('ethereumjs-abi')
const artifacts = require('../artifacts/ChannelManager.json')
const tokenAbi = require('human-standard-token-abi')
const util = require('ethereumjs-util')

// regEx for checking inputs
const regexExpessions = {
  address: '^(0x)?[0-9a-fA-F]{40}$',
  bytes32: '^(0x)?[0-9a-fA-F]{64}$',
  positive: '^[0-9][0-9]*$'
}

const CHALLENGE = 60

class ConnextClient {
  // TO DO:
  // - remove hardcoded values to update to SET contract
  // - update URLs to new branded env (?)
  // - update infra to support new branded env (?)
  // - do we need a drizzle client?
  // - evaluate names
  constructor ({
    web3,
    ingridAddress = '0xa41811a8b16b54d8b17d629d74bdca9ef8283207',
    watcherUrl = 'https://api.ethcalate.network',
    ingridUrl = 'https://ingrid.ethcalate.network',
    drizzleContext = null
  }) {
    this.web3 = web3
    this.ingridAddress = ingridAddress
    this.watcherUrl = watcherUrl
    this.ingridUrl = ingridUrl
    this.drizzleContext = drizzleContext
  }

  async initContract () {
    const accounts = await this.web3.eth.getAccounts()
    this.accounts = accounts
    // TO DO:
    // - finalize contract deployment schema
    if (this.drizzleContext) {
      this.ledgerChannel = this.drizzleContext.contracts.LedgerChannel
    } else {
      // init ledger channel and channel manager?
      const LedgerChannel = contract(artifacts)
      LedgerChannel.setProvider(this.web3.currentProvider)
      LedgerChannel.defaults({ from: accounts[0] })
      if (typeof LedgerChannel.currentProvider.sendAsync !== 'function') {
        LedgerChannel.currentProvider.send.apply(
          LedgerChannel.currentProvider,
          arguments
        )
      }
    }
    // init instance
    let ledgerChannel
    if (this.contractAddress) {
      ledgerChannel = await LedgerChannel.at(this.contractAddress)
    } else {
      ledgerChannel = await LedgerChannel.deployed()
    }
    this.ledgerChannel = ledgerChannel
  }

  // WALLET FUNCTIONS
  /**
   * Called by the viewer.
   *
   * Opens a ledger channel with ingridAddress and bonds initialDeposit.
   * Requests a challenge timer from ingrid
   * Use web3 to call openLC function on ledgerChannel.
   *
   * @param {String} initialDeposit deposit in wei
   */
  async register (initialDeposit) {
    if (!this.ledgerChannel) {
      throw new Error('Please call initContract().')
    }
    check.assert.match(
      initialDeposit,
      regexExpressions.positive,
      'No initial deposit provided.'
    )

    // open ledger channel
    if (this.drizzleContext) {
      // may not need (?)
      result = await this.ledgerChannel.methods.openLedgerChannel.cacheSend(
        this.ingridAddress,
        CHALLENGE,
        {
          from: this.accounts[0],
          value: initialDeposit
        }
      )
    } else {
      // open lc with ingrid
      result = this.ledgerChannel.openLedgerChannel(
        this.ingridAddress, // partyB,
        CHALLENGE, // challenge timer
        {
          from: this.accounts[0], // agentA
          value: initialDeposit
        }
      )
    }
    return result
  }

  async deposit (depositInWei) {
    if (!this.ledgerChannel) {
      throw new Error('Please call initContract().')
    }
    check.assert.match(
      depositInWei,
      regexExpressions.positive,
      'No deposit provided.'
    )
    // get ledger channel id for user
    const lcId = this.getLedgerChannel(this.accounts[0]) // why tho
    // call deposit fn on contract
    let result
    if (this.drizzleContext) {
      result = this.ledgerChannel.methods.deposit.cacheSend(this.accounts[0], {
        from: this.accounts[0],
        value: depositInWei
      })
    } else {
      result = await this.ledgerChannel.deposit(this.accounts[0], {
        from: this.accounts[0],
        value: depositInWei
      })
    }
    return { result, lcId } // probably dont need lcID
  }

  async withdraw () {
    if (!this.ledgerChannel) {
      throw new Error('Please call initContract().')
    }

    // get lc
    const lc = this.getLedgerChannel({ agentA: this.accounts[0] })

    // generate state update from latest I-signed state
    // with fast close flag

    // send to ingrid to countersign
  }

  async withdrawFinal () {}

  async checkpoint () {
    if (!this.ledgerChannel) {
      throw new Error('Please call initContract()')
    }
    // get ledger channel id
    const lcID = this.getLedgerChannelId()

    // get latest state update
  }

  // HELPER FUNCTIONS
  async getLatestLedgerStateUpdate ({ ledgerChannelId, sig }) {
    check.assert.match(
      ledgerChannelId,
      regexExpessions.bytes32,
      'No ledgerChannelId provided'
    )
    check.assert.array(sig, 'No sig(s) provided')

    const response = await axios.get(
      `${this.apiUrl}/channel/id/${ledgerChannelId}/latest?sig=${sig}`
    )
    return response.data
  }

  async getLedgerChannelId () {
    const response = await axios.get(
      `${this.apiUrl}/ledgerchannel?a=${this.accounts[0]}&b=${this.ingridAddress}`
    )
    if (response.data.data.ledgerChannel.id) {
      return response.data.data.ledgerChannel.id
    } else {
      return null
    }
  }

  async getLedgerChannel ({ ledgerChannelId }) {
    check.assert.match(
      ledgerChannelId,
      regexExpessions.bytes32,
      `No ledgerChannelId provided ${ledgerChannelId}`
    )
    const response = await axios.get(
      `${this.apiUrl}/ledgerchannel/${ledgerChannelId}`
    )
    return response.data.data.ledgerChannel
  }

  async getLedgerChannelByAddress ({ agentA }) {
    check.assert.match(
      agentA,
      regexExpressions.address,
      'No agentA account provided.'
    )
    const response = await axios.get(
      `${this.apiUrl}/ledgerchannel?a=${agentA}&b=${this.ingridAddress}`
    )
    if (response.data.data.ledgerChannel[0]) {
      return response.data.data.ledgerChannel[0]
    } else {
      return null
    }
  }
}

module.exports = ConnextClient
