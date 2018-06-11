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
/**
 * Regexs for validating function in inputs
 * @constant {Object}
 */
const regexExpessions = {
  address: '^(0x)?[0-9a-fA-F]{40}$',
  bytes32: '^(0x)?[0-9a-fA-F]{64}$',
  positive: '^[0-9][0-9]*$',
  booleanInt: '^(0|1)$'
}

/**
 *
 * Class representing an instance of a Connext client.
 */
class Connext {
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
   * Opens a ledger channel with ingridAddress and bonds initialDeposit.
   * Requests a challenge timer for the ledger channel from ingrid.
   *
   * Use web3 to call openLC function on ledgerChannel.
   *
   * Ingrid will open with 0 balance, and can call the deposit function to
   * add deposits based on user needs.
   *
   * @throws Will throw an error if initContract has not been called.
   * @param {BigNumber} initialDeposit deposit in wei
   * @returns {String} result of calling openLedgerChannel on the channelManager instance.
   */
  async register (initialDeposit) {
    validate.single(initialDeposit, { presence: true, isBN: true })
  }

  /**
   * Add a deposit to an existing ledger channel. Calls contract function "deposit".
   * @throws Will throw an error if initContract has not been called.
   * @param {BigNumber} depositInWei - Value of the deposit.
   */
  async deposit (depositInWei) {
    validate.single(initialDeposit, { presence: true, isBN: true })
  }

  /**
  * Withdraw bonded funds from ledger channel with ingrid. All virtual channels must be closed before a ledger channel can be closed.
  *
  * Generates the state update from the latest ingrid signed state with fast-close flag. Ingrid should countersign if the state update matches what she has signed previously, and the channel will fast close by calling consensusCloseChannel on the Channel Manager contract.
  *
  * If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.
  *
  * @throws Will throw an error if initContract has not been called.
  * @returns {String} Flag indicating whether the channel was consensus-closed or if lc was challenge-closed.
  */
  async withdraw () {}

  /**
  * Withdraw bonded funds from ledger channel after a channel is challenge-closed after the challenge period expires by calling withdrawFinal using Web3.
  *
  * Looks up LC by the account address of the client-side user.
  * @throws Will throw an error if initContract has not been called.
  */
  async withdrawFinal () {}

  /**
  * Sync signed state updates with chain.
  *
  * Generates client signature on latest Ingrid-signed state update, and uses web3 to call updateLCState on the contract without challenge flag.
  *
  * @throws Will throw an error if initContract has not been called.
  */
  async checkpoint () {}

  /**
  * Opens a virtual channel between to and caller with Ingrid as the hub. Both users must have a ledger channel open with ingrid.
  *
  * If there is no deposit provided, then 100% of the ledger channel balance is added to VC deposit.
  *
  * Sends a proposed LC update for countersigning that updates the VCRootHash of the ledger channel state.
  *
  * This proposed LC update (termed LC0 throughout documentation) serves as the opening certificate for the virtual channel.
  *
  * @param {Object} params - The method object.
  * @param {String} params.to Wallet address to wallet for agentB in virtual channel
  * @param {BigNumber} params.deposit User deposit for VC, in wei. Optional.
  * @throws Will throw an error if initContract has not been called.
  *
  */
  openChannel ({ to, deposit = null }) {}

  /**
  * Joins virtual channel by VC ID with a deposit of 0 (unidirectional channels).
  * Sends opening cert (VC0) to message queue, so it is accessible by Ingrid and Watchers.
  *
  * @param {int} vcId - The method object.
  * @throws Will throw an error if initContract has not been called.
  */
  joinChannel (vcId) {}

  /**
  * Updates virtual channel balance by provided ID.
  *
  * Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.
  * @param {Object} params - The method object.
  * @param {Int} params.vcId ID of virtual channel.
  * @param {BigNumber} params.balance virtual channel balance
  * @returns {Object} Result of message posting.
  */
  updateBalance ({ vcId, balance }) {}

  /**
  * Closes specified virtual channel using latest double signed update.
  *
  * Generates a decomposed LC update containing the updated balances and VCRoot to Ingrid from latest
  * double signed VC update.
  *
  * @param {Object} params - The method object.
  * @param {Integer} params.vcId virtual channel ID
  */
  fastCloseChannel ({ vcId }) {}

  /**
  * Closes a ledger channel with Ingrid.
  *
  * Retrieves decomposed LC updates from Ingrid, and countersign updates if needed (i.e. if they are recieving funds).
  *
  * Settle VC is called on chain for each vcID if Ingrid does not provide decomposed state updates, and closeVirtualChannel is called for each vcID.
  *
  * @param {Object} params - Array of objects containing { vcId, balance, nonce, signature }
  * @param {Integer[]} params.vcId Array of all virtual channel IDs that must closed before LC can close.
  * @param {BigNumber} params.balance virtual channel balance
  * @param {String} params.signature client signature of the closing state update for the virtual channel
  */
  closeChannel ({ vcId, balance, nonce, signature }) {}

  /**
   * Close many channels
   * @param {Array} channels - Array of virtual channel IDs to close
   */
  closeChannels (channels) {}

  // SIGNATURE FUNCTIONS
  /**
   * Returns the LC state update fingerprint.
   * @param {Object} hashParams Object containing state update data to be hashed.
   * @param {Integer} hashParams.isCloseFlag 0 if not closing LC, 1 if closing LC state update.
   * @param {Integer} hashParams.nonce The nonce of the proposed ledger channel state update.
   * @param {Integer} hashParams.openVCs Number of VCs open in the ledger channel with agentA, using Ingrid as an intermediary.
   * @param {String} hashParams.vcRootHash Indicates which VCs are open in LC.
   * @param {String} hashParams.agentA Address of agentA in the ledger channel.
   * @param {String} hashParams.agentB Address of agentB in the ledger channel. Defaults to Ingrid.
   * @param {BigNumber} hashParams.balanceA Balance of agentA in ledger channel in Wei.
   * @param {BigNumber} hashParams.balanceB Balance of agentB in ledger channel in Wei.
   * @returns {String} Hash of the input data if validated.
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

    return hash
  }

  /**
   * Signs and generates state update for ledger channel.
   *
   * If an unlocked account is present (i.e. automated client or Ingrid signing), then normal signing instead of personal signing is used.
   * @param {Object} params Object containing state update data to be hashed.
   * @param {Integer} params.isCloseFlag 0 if not closing LC, 1 if closing LC state update. Defaults to 0.
   * @param {Integer} params.nonce The nonce of the proposed ledger channel state update.
   * @param {Integer} params.openVCs Number of VCs open in the ledger channel with agentA, using Ingrid as an intermediary.
   * @param {String} params.vcRootHash Indicates which VCs are open in LC.
   * @param {String} params.agentA Address of agentA in the ledger channel.
   * @param {String} params.agentB Address of agentB in the ledger channel. Defaults to Ingrid.
   * @param {BigNumber} params.balanceA Balance of agentA in ledger channel in Wei.
   * @param {BigNumber} params.balanceB Balance of agentB in ledger channel in Wei.
   * @param {Boolean} params.unlockedAccountPresent True if there is an automated signing account (e.g. Ingrid). Defaults to false.
   * @returns {Object} Result of sending state update to Ingrid
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
  /**
   *
   * @param {Object} params Method Object
   * @param {Integer} params.ledgerChannelId ID of the ledger channel you are looking to retrieve a state update for.
   * @param {String[]} params.sig Signature that should be on the state update.
   * @returns {Object} Returns the result of requesting the latest signed state from the Watcher.
   */
  async getLatestLedgerStateUpdate ({ ledgerChannelId, sig }) {}

  /**
   * Helper function to retrieve lcID.
   * @returns {Integer|null} the lcID for agentA = accounts[0] and ingrid if exists, or null.
   */
  async getLedgerChannelId () {}

  /**
   * Requests the ledger channel object by ledger channel id.
   * @param {Object} params Object containing the ledger channel id
   * @param {Integer} params.ledgerChannelId Ledger channel ID in database.
   * @returns {Object} the ledger channel object.
   */
  async getLedgerChannel ({ ledgerChannelId }) {}

  /**
   * Requests the ledger channel open between Ingrid and the provided address from the watcher.
   *
   * @param {Object} params
   * @param {String} params.agentA Address of the agentA in the ledger channel.
   * @returns {Object} Ledger channel open with Ingrid and agentA (only one allowed) if exists, or null.
   */
  async getLedgerChannelByAddress ({ agentA }) {}

  /**
   * Returns channel timer for the ledger channel.
   * Ingrid should also set and store lcID.
   *
   * Called in register() function
   * @returns {Integer} the ledger channel timer period in seconds.
   */
  async getLedgerChannelChallengeTimer () {}
}

module.exports = Connext
