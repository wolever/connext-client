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
  positive: '^[0-9][0-9]*$',
  booleanInt: '^(0|1)$'
}

/**
 *
 * Class representing an instance of a Connext client.
 *
 */
export class Connext {
  // TO DO:
  // - do we need a drizzle client?

  /**
   *
   * Create an instance of the Connext client.
   *
   * @param {Object} params - The constructor object.
   * @param {Web3} params.web3 - the web3 instance.
   * @param {String} params.ingridAddress Eth address of intermediary .
   * @param {String} params.watcherUrl Url of watcher server.
   * @param {String} params.ingridUrl Url of intermediary server.
   * @param {Drizzle} params.drizzleContext - the drizzle context (optional).
   */
  constructor ({
    web3,
    ingridAddress,
    watcherUrl,
    ingridUrl,
    drizzleContext = null
  }) {
    this.web3 = web3
    this.ingridAddress = ingridAddress
    this.watcherUrl = watcherUrl
    this.ingridUrl = ingridUrl
    this.drizzleContext = drizzleContext
  }

  /**
   * Initializes the ledger channel manager contract.
   *
   * Must be called before any state updates, channel functions, dispute functions, or contract methods
   * can be called through the client package or it will throw an error.
   *
   * @function
   */
  async initContract () {
    const accounts = await this.web3.eth.getAccounts()
    this.accounts = accounts
    if (this.drizzleContext) {
      this.channelManager = this.drizzleContext.contracts.ChannelManager
    } else {
      // init ledger channel and channel manager?
      const ChannelManager = contract(artifacts)
      ChannelManager.setProvider(this.web3.currentProvider)
      ChannelManager.defaults({ from: accounts[0] })
      if (typeof ChannelManager.currentProvider.sendAsync !== 'function') {
        ChannelManager.currentProvider.send.apply(
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

  // WALLET FUNCTIONS
  /**
   * Called by the viewer.
   *
   * Opens a ledger channel with ingridAddress and bonds initialDeposit.
   * Requests a challenge timer from ingrid
   * Use web3 to call openLC function on ledgerChannel.
   *
   * @param {BigNumber} initialDeposit deposit in wei
   * @returns result of calling openLedgerChannel on the channelManager instance.
   */
  async register (initialDeposit) {
    if (!this.channelManager) {
      throw new Error('Please call initContract().')
    }
    check.assert.match(
      initialDeposit,
      regexExpressions.positive,
      'No initial deposit provided.'
    )
    // get challenge timer from ingrid
    const challenge = this.getLedgerChannelChallengeTimer()

    // TO DO: Determine how much ingrid should join with
    // Alternatively, Ingrid calls deposit function (?)
    // Also, reconfigure constructor to accept configurable challenge time

    // open ledger channel
    if (this.drizzleContext) {
      // may not need (?)
      result = await this.channelManager.methods.openLedgerChannel.cacheSend(
        this.accounts[0], // partyA
        this.ingridAddress, // partyB
        initialDeposit, // balanceA
        0, // balanceB (Ingrid)
        challenge,
        {
          from: this.accounts[0],
          value: initialDeposit
        }
      )
    } else {
      // open lc with ingrid
      result = this.channelManager.openLedgerChannel(
        this.accounts[0], // partyA
        this.ingridAddress, // partyB
        initialDeposit, // balanceA
        0, // balanceB (Ingrid)
        challenge, // not yet in constructor
        {
          from: this.accounts[0],
          value: initialDeposit
        }
      )
    }
    return result
  }

  /**
   * Add a deposit to an existing ledger channel. Calls contract function "deposit"
   * @param {BigNumber} depositInWei - Value of the deposit.
   */
  async deposit (depositInWei) {
    if (!this.channelManager) {
      throw new Error('Please call initContract().')
    }
    check.assert.match(
      depositInWei,
      regexExpressions.positive,
      'No deposit provided.'
    )
    // get ledger channel id for user
    const lc = this.getLedgerChannel(this.accounts[0]) // why tho
    // call deposit fn on contract
    let result
    if (this.drizzleContext) {
      result = this.channelManager.methods.deposit.cacheSend(this.accounts[0], {
        from: this.accounts[0],
        value: depositInWei
      })
    } else {
      result = await this.channelManager.deposit(this.accounts[0], {
        from: this.accounts[0],
        value: depositInWei
      })
    }
    return { result, lcId } // probably dont need lcID
  }

  /**
  * Withdraw bonded funds from channel.
  *
  * Generates the state update from the latest ingrid signed state with fast-close flag.
  *
  * State update is sent to Ingrid to countersign if correct.
  */
  async withdraw () {
    if (!this.channelManager) {
      throw new Error('Please call initContract().')
    }

    // get latest i signed update
    const lc = await this.getLedgerChannelByAddress({
      agentA: this.accounts[0]
    })
    const sigs = [
      lc.transactions[lc.transactions.length - 1].sigA,
      lc.transactions[lc.transactions.length - 1].sigB
    ]
    // const state = this.getLatestLedgerStateUpdate({ lc.})

    // generate state update from latest I-signed state
    // with fast close flag
    const closeSig = await this.createLCStateUpdate({
      isCloseFlag: 1,
      nonce: lc.nonce,
      openVCs: lc.openVCs,
      vcRootHash: lc.vcRootHash,
      agentA: lc.agentA,
      balanceA: lc.balanceA,
      balanceB: lc.balanceB
    })
    // send to ingrid to countersign
    const response = await axios.post(
      `${this.ingridUrl}/ledgerchannel/withdraw?channel=${lc.id}`,
      {
        sig: closeSig
      }
    )
    let flag
    if (response.data) {
      // assume ingrid cosigned update
      // call consensus close channel

      flag = `Channel: ${lc.id} Fast Closed.`
    } else {
      // call updateLCState with latest state and challenge flag
      flag = `Channel: ${lc.id} Challenged.`
    }
    return flag
  }

  /**
  * Withdraw bonded funds from channel
  */
  async withdrawFinal () {}

  /**
  * Sync signed updated with chain
  */
  async checkpoint () {
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }
    // get ledger channel id
    const lcID = this.getLedgerChannelId()

    // get latest state update
  }

  /**
  *
  * @param {Object} params - The method object.
  * @param params.to eth address to wallet.
  * @param params.deposit optional
  *
  */
  openChannel ({ to, deposit }) {}

  /**
  *
  * @param {int} vcId - The method object.
  */
  joinChannel (vcId) {}

  /**
  * Update Balance
  * @param {Object} params - The method object.
  * @param params.vcId address of virtual channel.
  * @param params.balance new balance diff sent
  *
  */
  updateBalance ({ vcId, balance }) {}

  /**
  * Close one channel
  * @param {Object} params - The method object.
  * @param params.vcIds virtual channel address.
  * @param params.balance new balance diff sent
  */
  closeChannel ({ vcId, balance, nonce, signature }) {}

  /**
  * Close many channels
  * @param {Array} params - Array of objects containing { vcId, balance, nonce, signature }
  */
  closeChannels ({ vcId, balance, nonce, signature }) {}

  // SIGNATURE FUNCTIONS
  /**
   * Returns the LC state update fingerprint.
   * @param {Object} hashParams Object containing state update data to be hashed.
   *
   */
  static createLCStateUpdateFingerprint ({
    isCloseFlag,
    nonce,
    openVCs,
    vcRootHash,
    agentA,
    agentB = this.ingridAddress, // defaults to ingrid
    balanceA,
    balanceB
  }) {
    // Validation
    check.assert.match(
      isCloseFlag,
      regexExpessions.booleanInt,
      'No isClose indicator provided.'
    )
    check.assert.match(nonce, regexExpessions.positive, 'No nonce provided.')
    check.assert.match(
      openVCs,
      regexExpessions.positive,
      'No number of openVCs provided.'
    )
    check.assert.string(vcRootHash, 'No root hash provided') // TO DO: add to regexs
    check.assert.match(agentA, regexExpessions.address, 'No partyA provided.')
    check.assert.match(agentB, regexExpessions.address, 'No partyB provided')
    check.assert.match(
      balanceA,
      regexExpessions.positive,
      'No balanceA provided.'
    )
    check.assert.match(
      balanceB,
      regexExpessions.positive,
      'No balanceB provided.'
    ) // Can Ingrid have negative balances?

    const hash = Web3.utils.soliditySha3(
      { type: 'bytes32', value: isCloseFlag }, // uint256?
      { type: 'uint256', value: nonce },
      { type: 'uint256', value: openVCs },
      { type: 'bytes32', value: vcRootHash },
      { type: 'string', value: agentA },
      { type: 'string', value: agentB },
      { type: 'uint256', value: balanceA },
      { type: 'uint256', value: balanceB }
    )
  }

  /**
   * Signs and generates state update for ledger channel.
   *
   * If an unlocked account is present (i.e. automated client or Ingrid signing), then normal signing instead of personal signing is used.
   * @returns signature of inputs
   */
  async createLCStateUpdate ({
    isCloseFlag = 0, // default isnt close LC
    nonce,
    openVCs,
    vcRootHash,
    agentA,
    agentB = this.ingridAddress, // default to ingrid
    balanceA,
    balanceB,
    unlockedAccountPresent = false // true if hub or ingrid
  }) {
    // errs and validation
    if (!this.channelManager) {
      throw new Error('Please call initContract()')
    }
    check.assert.match(
      isCloseFlag,
      regexExpessions.booleanInt,
      'No isClose indicator provided.'
    )
    check.assert.match(nonce, regexExpessions.positive, 'No nonce provided.')
    check.assert.match(
      openVCs,
      regexExpessions.positive,
      'No number of openVCs provided.'
    )
    check.assert.string(vcRootHash, 'No root hash provided') // TO DO: add to regexs
    check.assert.match(agentA, regexExpessions.address, 'No partyA provided.')
    check.assert.match(agentB, regexExpessions.address, 'No partyB provided')
    check.assert.match(
      balanceA,
      regexExpessions.positive,
      'No balanceA provided.'
    )
    check.assert.match(
      balanceB,
      regexExpessions.positive,
      'No balanceB provided.'
    ) // Can Ingrid have negative balances?

    // sign hash
    const hash = Ethcalate.createLCStateUpdateFingerprint({
      isCloseFlag,
      nonce,
      openVCs,
      vcRootHash,
      agentA,
      agentB,
      balanceA,
      balanceB
    })
    let sig
    if (unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, this.accounts[0])
    } else {
      sig = await this.web3.eth.personal.sign(hash, this.accounts[0])
    }
    return sig
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
      `${this.watcherUrl}/channel/id/${ledgerChannelId}/latest?sig=${sig}`
    )
    return response.data
  }

  /**
   * Helper function to retrieve lcID.
   * @returns the lcID for agentA = accounts[0] and ingrid
   */
  async getLedgerChannelId () {
    const response = await axios.get(
      `${this.watcherUrl}/ledgerchannel?a=${this.accounts[0]}&b=${this.ingridAddress}`
    )
    if (response.data.data.ledgerChannel.id) {
      return response.data.data.ledgerChannel.id
    } else {
      return null
    }
  }

  /**
   * Requests the ledger channel object by ledger channel id.
   * @param {Object} params Object containing the ledger channel id
   * @returns the ledger channel object.
   */
  async getLedgerChannel ({ ledgerChannelId }) {
    check.assert.match(
      ledgerChannelId,
      regexExpessions.bytes32,
      `No ledgerChannelId provided ${ledgerChannelId}`
    )
    const response = await axios.get(
      `${this.watcherUrl}/ledgerchannel/${ledgerChannelId}`
    )
    return response.data.data.ledgerChannel
  }

  /**
   * Requests the ledger channel open between Ingrid and the provided address from the watcher.
   *
   * @param {Object} params
   * @param params.agentA is the address of the agentA in the ledger channel.
   * @returns ledger channels open with Ingrid and agentA (only one).
   */
  async getLedgerChannelByAddress ({ agentA }) {
    check.assert.match(
      agentA,
      regexExpressions.address,
      'No agentA account provided.'
    )
    const response = await axios.get(
      `${this.watcherUrl}/ledgerchannel?a=${agentA}&b=${this.ingridAddress}`
    )
    if (response.data.data.ledgerChannel[0]) {
      return response.data.data.ledgerChannel[0]
    } else {
      return null
    }
  }

  /**
   * Returns channel timer for the ledger channel.
   * Ingrid should also set and store lcID.
   *
   * Called in register() function
   * @returns the ledger channel timer period in seconds.
   */
  async getLedgerChannelChallengeTimer () {
    const response = await axios.get(`${this.ingridUrl}/lcTimer`)
    return response.data
  }
}
