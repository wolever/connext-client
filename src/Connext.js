const axios = require('axios')
const abi = require('ethereumjs-abi')
const channelManagerAbi = require('../artifacts/ChannelManagerAbi.json')
const tokenAbi = require('human-standard-token-abi')
const util = require('ethereumjs-util')
const Web3 = require('web3')
const validate = require('validate')

validate.validators.isBN = value => {
  if (Web3.utils.isBN(value)) {
    return null
  } else {
    return 'Is not BN.'
  }
}

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
  /**
   *
   * Create an instance of the Connext client.
   *
   * @example
   * const Connext = require('connext')
   * const connext = new Connext(web3)
   * @param {Object} params - The constructor object.
   * @param {Web3} params.web3 - the web3 instance.
   * @param {String} params.ingridAddress Eth address of intermediary (defaults to Connext hub).
   * @param {String} params.watcherUrl Url of watcher server (defaults to Connext hub).
   * @param {String} params.ingridUrl Url of intermediary server (defaults to Connext hub).
   * @param {String} params.contractAddress Address of deployed contract (defaults to latest deployed contract).
   */
  constructor ({
    web3,
    ingridAddress = '',
    watcherUrl = '',
    ingridUrl = '',
    contractAddress = ''
  }) {
    this.web3 = new Web3(web3.currentProvider) // convert legacy web3 0.x to 1.x
    this.ingridAddress = ingridAddress
    this.watcherUrl = watcherUrl
    this.ingridUrl = ingridUrl
    this.channelManagerInstance = new this.web3.eth.Contract(
      channelManagerAbi,
      contractAddress
    )
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
    validate.single(initialDeposit, { presence: true, isBN: true })
  }

  /**
   * Add a deposit to an existing ledger channel. Calls contract function "deposit"
   * @param {BigNumber} depositInWei - Value of the deposit.
   */
  async deposit (depositInWei) {
    validate.single(initialDeposit, { presence: true, isBN: true })
  }

  /**
   * Withdraw bonded funds from channel.
   *
   * Generates the state update from the latest ingrid signed state with fast-close flag.
   *
   * State update is sent to Ingrid to countersign if correct.
   */
  async withdraw () {}

  /**
   * Withdraw bonded funds from channel
   */
  async withdrawFinal () {}

  /**
   * Sync signed updated with chain
   */
  async checkpoint () {}

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
  closeChannels (channels) {}

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
  }) {}

  // HELPER FUNCTIONS
  async getLatestLedgerStateUpdate ({ ledgerChannelId, sig }) {}

  /**
   * Helper function to retrieve lcID.
   * @returns the lcID for agentA = accounts[0] and ingrid
   */
  async getLedgerChannelId () {}

  /**
   * Requests the ledger channel object by ledger channel id.
   * @param {Object} params Object containing the ledger channel id
   * @returns the ledger channel object.
   */
  async getLedgerChannel ({ ledgerChannelId }) {}

  /**
   * Requests the ledger channel open between Ingrid and the provided address from the watcher.
   *
   * @param {Object} params
   * @param params.agentA is the address of the agentA in the ledger channel.
   * @returns ledger channels open with Ingrid and agentA (only one).
   */
  async getLedgerChannelByAddress ({ agentA }) {}

  /**
   * Returns channel timer for the ledger channel.
   * Ingrid should also set and store lcID.
   *
   * Called in register() function
   * @returns the ledger channel timer period in seconds.
   */
  async getLedgerChannelChallengeTimer () {}
}
