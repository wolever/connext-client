const axios = require('axios')
const abi = require('ethereumjs-abi')
const channelManagerAbi = require('../artifacts/ChannelManagerAbi.json')
const tokenAbi = require('human-standard-token-abi')
const util = require('ethereumjs-util')
const Web3 = require('web3')
const validate = require('validate')
const Utils = require('../helpers/utils')

validate.validators.isBN = value => {
  if (Web3.utils.isBN(value)) {
    return null
  } else {
    return 'Is not BN.'
  }
}

validate.validators.isHexString = value => {
  if (Web3.utils.isHex(value)) {
    return null
  } else {
    return 'Is not hex string.'
  }
}

validate.validators.isAddress = value => {
  if (Web3.utils.isAddress(value)) {
    return null
  } else {
    return 'Is not address.'
  }
}

validate.validators.isBooleanInt = value => {
  if (value == 0 || value == 1) {
    return null
  } else {
    return 'Is not a boolean integer (0 or 1).'
  }
}

validate.validators.isPositiveInt = value => {
  if (value >= 0) {
    return null
  } else {
    return 'Is not a positive integer.'
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
   * Ingrid will open with 0 balance, and can call the deposit function to
   * add deposits based on user needs.
   *
   * @example
   * // get a BN
   * const deposit = web3.utils.toBN(10000)
   * await connext.register(deposit)
   *
   * @param {BigNumber} initialDeposit deposit in wei
   * @returns {String} result of calling openLedgerChannel on the channelManager instance.
   */
  async register (initialDeposit) {
    validate.single(initialDeposit, { presence: true, isBN: true })
    // get challenge timer from ingrid
    const accounts = await this.web3.eth.getAccounts()
    const challenge = await this.getLedgerChannelChallengeTimer()
    // generate additional initial lc params

    // should call openLC
    // but contract function does not exist yet, talk to Nathan
  }

  /**
   * Add a deposit to an existing ledger channel. Calls contract function "deposit"
   *
   * @example
   * // get a BN
   * const deposit = web3.utils.toBN(10000)
   * await connext.deposit(deposit)
   * @param {BigNumber} depositInWei - Value of the deposit.
   */
  async deposit (depositInWei) {
    validate.single(initialDeposit, { presence: true, isBN: true })
    // find ledger channel by mine and ingrids address
    // call LC method
  }

  /**
   * Withdraw bonded funds from ledger channel with ingrid. All virtual channels must be closed before a ledger channel can be closed.
   *
   * Generates the state update from the latest ingrid signed state with fast-close flag. Ingrid should countersign if the state update matches what she has signed previously, and the channel will fast close by calling consensusCloseChannel on the Channel Manager contract.
   *
   * If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.
   *
   * @example
   * const success = await connext.withdraw()
   * @returns {boolean} Returns true if successfully withdrawn, false if challenge process commences.
   * @returns {String} Flag indicating whether the channel was consensus-closed or if lc was challenge-closed.
   */
  async withdraw () {}

  /**
   * Withdraw bonded funds from ledger channel after a channel is challenge-closed after the challenge period expires by calling withdrawFinal using Web3.
   *
   * Looks up LC by the account address of the client-side user.
   *
   * @example
   * const success = await connext.withdraw()
   * if (!success) {
   *   // wait out challenge timer
   *   await connext.withdrawFinal()
   * }
   */
  async withdrawFinal () {}

  /**
   * Sync signed state updates with chain.
   *
   * Generates client signature on latest Ingrid-signed state update, and uses web3 to call updateLCState on the contract without challenge flag.
   *
   * @example
   * await connext.checkpoint()
   */
  async checkpoint () {}

  /**
   * Opens a virtual channel between to and caller with Ingrid as the hub. Both users must have a ledger channel open with ingrid.
   *
   * If there is no deposit provided, then 100% of the ledger channel balance is added to VC deposit. This function is to be called by the "A" party in a unidirectional scheme.
   * Sends a proposed LC update for countersigning that updates the VCRootHash of the ledger channel state.
   * This proposed LC update (termed LC0 throughout documentation) serves as the opening certificate for the virtual channel.
   *
   * @example
   * const myFriendsAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
   * await connext.openChannel({ to: myFriendsAddress })
   * @param {Object} params - The method object.
   * @param {String} params.to Wallet address to wallet for agentB in virtual channel
   * @param {BigNumber} params.deposit User deposit for VC, in wei. Optional.
   */
  async openChannel ({ to, deposit = null }) {}

  /**
   * Joins channel by channelId with a deposit of 0 (unidirectional channels).
   *
   * This function is to be called by the "B" party in a unidirectional scheme.
   * Sends opening cert (VC0) to message queue, so it is accessible by Ingrid and Watchers.
   *
   * @example
   * const channelId = 10 // accessed by getChannel method
   * await connext.joinChannel(channelId)
   * @param {Number} channelId - ID of the virtual channel.
   */
  async joinChannel (channelId) {
    // join virtual channel
  }

  /**
   * Updates channel balance by provided ID.
   *
   * In the unidirectional scheme, this function is called by the "A" party only.
   * Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.
   *
   * @example
   * await connext.updateBalance({
   *   channelId: 10,
   *   balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
   * })
   * @param {Object} params - The method object.
   * @param {Number} params.channelId ID of channel.
   * @param {BigNumber} params.balance Channel balance in Wei (of "A" party).
   * @returns {String} Returns signature of balance update.
   */
  async updateBalance ({ channelId, balance }) {}

  /**
   * Verifies signature on balance update and co-signs update.
   *
   * In the unidirectional scheme, this function is called by the "B" party only.
   * Signature is posted to the hub/watcher.
   * @param {Object} params - The method object.
   * @param {Number} params.channelId ID of channel.
   * @param {BigNumber} params.balance Channel balance in Wei (of "A" party).
   * @param {String} params.sig Signature received from "A" party to be verified before co-signing.
   * @returns {String} Returns signature of balance update.
   */
  async cosignBalanceUpdate ({ channelId, balance, sig }) {
    // check sig
  }

  /**
   * Closes specified channel using latest double signed update.
   *
   * Generates a decomposed LC update containing the updated balances and VCRoot to Ingrid from latest
   * double signed VC update.
   *
   * @example
   * await connext.fastCloseChannel(10)
   * @param {Number} channelId - virtual channel ID
   */
  async fastCloseChannel (channelId) {}

  /**
   * Closes a channel in a dispute.
   *
   * Retrieves decomposed LC updates from Ingrid, and countersign updates if needed (i.e. if they are recieving funds).
   *
   * Settle VC is called on chain for each vcID if Ingrid does not provide decomposed state updates, and closeVirtualChannel is called for each vcID.
   *
   * @example
   * await connext.closeChannel({
   *   channelId: 10,
   *   balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
   * })
   * @param {Object} params - Object containing { vcId, balance }
   * @param {Number} params.channelId Virtual channel ID to close.
   * @param {BigNumber} params.balance Virtual channel balance.
   */
  closeChannel ({ channelId, balance }) {}

  /**
   * Close many channels
   *
   * @example
   * const channels = [
   *   {
   *     channelId: 10,
   *     balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
   *   },
   *   {
   *     channelId: 11,
   *     balance: web3.utils.toBN(web3.utils.toWei(0.2, 'ether'))
   *   }
   * ]
   * await connext.closeChannels(channels)
   * @param {Object[]} channels - Array of objects with {vcId, balance} to close
   * @param {Number} channels.$.channelId Channel ID to close
   * @param {BigNumber} channels.$.balance Channel balance.
   */
  closeChannels (channels) {}

  // SIGNATURE FUNCTIONS
  static createLCStateUpdateFingerprint ({
    isCloseFlag,
    nonce,
    openVCs,
    vcRootHash,
    agentA,
    agentB,
    balanceA,
    balanceB
  }) {
    // validate params
    validate.single(isCloseFlag, { presence: true, isBoooleanInt: true })
    validate.single(nonce, { presence: true, isPositiveInt: true })
    validate.single(openVCs, { presence: true, isPositiveInt: true })
    validate.single(vcRootHash, { presence: true, isHexString: true })
    validate.single(agentA, { presence: true, isAddress: true })
    validate.single(agentB, { presence: true, isAddress: true })
    validate.single(balanceA, { presence: true, isBN: true })
    validate.single(balanceB, { presence: true, isBN: true })
    // generate state update to sign
    const hash = Web3.utils.soliditySha3(
      { type: 'uint256', value: nonce },
      { type: 'uint256', value: openVCs },
      { type: 'string', value: vcRootHash },
      { type: 'address', value: agentA },
      { type: 'address', value: agentB },
      { type: 'uint256', value: balanceA },
      { type: 'uint256', value: balanceB }
    )
    return hash
  }

  static recoverSignerFromLCStateUpdate ({
    sig,
    isCloseFlag,
    nonce,
    openVCs,
    vcRootHash,
    agentA,
    agentB,
    balanceA,
    balanceB
  }) {
    // validate params
    validate.single(sig, { presence: true, isHexString: true })
    validate.single(isCloseFlag, { presence: true, isBoooleanInt: true })
    validate.single(nonce, { presence: true, isPositiveInt: true })
    validate.single(openVCs, { presence: true, isPositiveInt: true })
    validate.single(vcRootHash, { presence: true, isHexString: true })
    validate.single(agentA, { presence: true, isAddress: true })
    validate.single(agentB, { presence: true, isAddress: true })
    validate.single(balanceA, { presence: true, isBN: true })
    validate.single(balanceB, { presence: true, isBN: true })
    // generate fingerprint
    let fingerprint = Connext.createLCStateUpdateFingerprint({
      isCloseFlag,
      nonce,
      openVCs,
      vcRootHash,
      agentA,
      agentB,
      balanceA,
      balanceB
    })
    fingerprint = util.toBuffer(fingerprint)

    const prefix = Buffer.from('\x19Ethereum Signed Message:\n')
    const prefixedMsg = util.sha3(
      Buffer.concat([
        prefix,
        Buffer.from(String(fingerprint.length)),
        fingerprint
      ])
    )
    const res = util.fromRpcSig(sig)
    const pubKey = util.ecrecover(prefixedMsg, res.v, res.r, res.s)
    const addrBuf = util.pubToAddress(pubKey)
    const addr = util.bufferToHex(addrBuf)

    return addr
  }

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
    // validate params
    validate.single(nonce, { presence: true, isPositiveInt: true })
    validate.single(openVCs, { presence: true, isPositiveInt: true })
    validate.single(vcRootHash, { presence: true, isHexString: true })
    validate.single(agentA, { presence: true, isAddress: true })
    validate.single(balanceA, { presence: true, isBN: true })
    validate.single(balanceB, { presence: true, isBN: true })

    // TO DO:
    // additional validation to only allow clients to call correct state updates

    // generate sig
    const accounts = await this.web3.getAccounts()
    // personal sign?
    const hash = Connext.createLCStateUpdateFingerprint({
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
      sig = await this.web3.eth.sign(hash, accounts[0])
    } else {
      sig = await this.web3.eth.personal.sign(hash, accounts[0])
    }
    return sig
  }

  static createVCStateUpdateFingerprint ({
    nonce,
    agentA,
    agentB,
    agentI,
    balanceA,
    balanceB
  }) {
    // validate
    validate.single(nonce, { presence: true, isPositiveInt: true })
    validate.single(agentA, { presence: true, isAddress: true })
    validate.single(agentB, { presence: true, isAddress: true })
    validate.single(agentI, { presence: true, isAddress: true })
    validate.single(balanceA, { presence: true, isBN: true })
    validate.single(balanceB, { presence: true, isBN: true })
    // generate state update to sign
    const hash = Web3.utils.soliditySha3(
      { type: 'uint256', value: nonce },
      { type: 'address', value: agentA },
      { type: 'address', value: agentB },
      { type: 'address', value: agentI },
      { type: 'uint256', value: balanceA },
      { type: 'uint256', value: balanceB }
    )
    return hash
  }

  static recoverSignerFromVCStateUpdate ({
    sig,
    nonce,
    agentA,
    agentB,
    agentI,
    balanceA,
    balanceB
  }) {
    // validate
    validate.single(nonce, { presence: true, isPositiveInt: true })
    validate.single(agentA, { presence: true, isAddress: true })
    validate.single(agentB, { presence: true, isAddress: true })
    validate.single(agentI, { presence: true, isAddress: true })
    validate.single(balanceA, { presence: true, isBN: true })
    validate.single(balanceB, { presence: true, isBN: true })
    // generate fingerprint
    let fingerprint = Connext.createVCStateUpdateFingerprint({
      nonce,
      agentA,
      agentB,
      agentI,
      balanceA,
      balanceB
    })
    fingerprint = util.toBuffer(fingerprint)
    const prefix = Buffer.from('\x19Ethereum Signed Message:\n')
    const prefixedMsg = util.sha3(
      Buffer.concat([
        prefix,
        Buffer.from(String(fingerprint.length)),
        fingerprint
      ])
    )
    const res = util.fromRpcSig(sig)
    const pubKey = util.ecrecover(prefixedMsg, res.v, res.r, res.s)
    const addrBuf = util.pubToAddress(pubKey)
    const addr = util.bufferToHex(addrBuf)

    return addr
  }

  async createVCStateUpdate ({
    nonce,
    agentA,
    agentB,
    agentI = this.ingridAddress,
    balanceA,
    balanceB,
    unlockedAccountPresent = false // if true, use sign over personal.sign
  }) {
    // validate
    validate.single(nonce, { presence: true, isPositiveInt: true })
    validate.single(agentA, { presence: true, isAddress: true })
    validate.single(agentB, { presence: true, isAddress: true })
    validate.single(balanceA, { presence: true, isBN: true })
    validate.single(balanceB, { presence: true, isBN: true })
    // generate and sign hash
    const hash = Connext.createVCStateUpdateFingerprint({
      nonce,
      agentA,
      agentB,
      agentI,
      balanceA,
      balanceB
    })
    const accounts = await this.web3.getAccounts()
    let sig
    if (unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, accounts[0])
    } else {
      sig = await this.web3.eth.personal.sign(hash, accounts[0])
    }
    return sig
  }

  // HELPER FUNCTIONS

  async getLatestLedgerStateUpdate ({ ledgerChannelId, sig }) {}

  async getMyLcId () {
    // get my LC with ingrid
  }

  async getOtherLcId () {
    // get LC for other VC party and ingrid
  }

  async getLc ({ lcId }) {}

  async getLedgerChannelChallengeTimer () {
    const response = await axios.post(`${this.ingridUrl}/ledgerchannel/timer`)
    return response.data
  }
}

module.exports = Connext
