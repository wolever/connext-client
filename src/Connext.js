const channelManagerAbi = require('../artifacts/LedgerChannel.json')
const util = require('ethereumjs-util')
const Web3 = require('web3')
const validate = require('validate.js')
const {validateBalance, validateTipPurchaseMeta, validatePurchasePurchaseMeta, LCOpenError, ParameterValidationError, ContractError, VCOpenError, LCUpdateError, VCUpdateError, LCCloseError, VCCloseError} = require('./helpers/Errors')
const MerkleTree = require('./helpers/MerkleTree')
const Utils = require('./helpers/utils')
const crypto = require('crypto')
const networking = require('./helpers/networking')
const tokenAbi = require('human-standard-token-abi')

// Channel enums
const CHANNEL_STATES = {
  'LCS_OPENING': 0,
  'LCS_OPENED': 1,
  'LCS_SETTLING': 2,
  'LCS_SETTLED': 3,
}

// thread enums
const THREAD_STATES = {
  'VCS_OPENING': 0,
  'VCS_OPENED': 1,
  'VCS_SETTLING': 2,
  'VCS_SETTLED': 3,
}

// Purchase metadata enum
const META_TYPES = {
  'TIP': 0,
  'PURCHASE': 1,
  'UNCATEGORIZED': 2
}

const PAYMENT_TYPES = {
  'CHANNEL': 0,
  'THREAD': 1
}

const CHANNEL_TYPES = {
  'ETH': 0,
  'TOKEN': 1,
  'TOKEN_ETH': 2,
}

// ***************************************
// ******* PARAMETER VALIDATION **********
// ***************************************
validate.validators.isPositiveBnString = value => {
  let bnVal
  if (Web3.utils.isBN(value)) {
    bnVal = value
  } else {
    // try to convert to BN
    try {
      bnVal = Web3.utils.toBN(value)
    } catch (e) {
      return `${value} cannot be converted to BN`
    }
  }
  
  if (bnVal.isNeg()) {
    return `${value} cannot be negative`
  } else {
    return null
  }
}
validate.validators.isValidChannelType = value => {
  if (!value) {
    return `Value vannot be undefined`
  } else if (CHANNEL_TYPES[value] === -1) {
    return `${value} is not the `
  }
}
validate.validators.isValidDepositObject = value => {
  if (!value) {
    return `Value cannot be undefined`
  } else if (!value.tokenDeposit && !value.ethDeposit) {
    return `${value} does not contain tokenDeposit or ethDeposit fields`
  }
  if (value.tokenDeposit && !validateBalance(value.tokenDeposit)) {
    return `${value.tokenDeposit} is not a valid deposit`
  } else if (value.ethDeposit && !validateBalance(value.ethDeposit)) {
    return `${value.ethDeposit} is not a valid deposit`
  } else {
    return null
  }
}

validate.validators.isValidMeta = value => {
  if (!value) {
    return `Value cannot be undefined.`
  } else if (!value.receiver) {
    return `${value} does not contain a receiver field`
  } else if (!Web3.utils.isAddress(value.receiver)) {
    return `${value.receiver} is not a valid ETH address`
  } else if (!value.type) {
    return `${value} does not contain a type field`
  }

  let isValid, ans

  switch (META_TYPES[value.type]) {
    case 0: // TIP
      isValid = validateTipPurchaseMeta(value)
      ans = isValid ? null : `${JSON.stringify(value)} is not a valid TIP purchase meta, missing one or more fields: streamId, performerId, performerName`
      return ans
    case 1: // PURCHASE
      isValid = validatePurchasePurchaseMeta(value)
      ans = isValid ? null : `${JSON.stringify(value)} is not a valid PURCHASE purchase meta, missing one or more fields: productSku, productName`
      return ans
    case 2: // UNCATEGORIZED -- no validation 
      return null
    default:
      return `${value.type} is not a valid purchase meta type`
  }
}

validate.validators.isLcStatus = value => {
  if (
    CHANNEL_STATES[value] === -1
  ) {
    return null
  } else {
    return `${value} is not a valid lc state`
  }
}

validate.validators.isBN = value => {
  if (Web3.utils.isBN(value)) {
    return null
  } else {
    return `${value} is not BN.`
  }
}

validate.validators.isHex = value => {
  if (Web3.utils.isHex(value)) {
    return null
  } else {
    return `${value} is not hex string.`
  }
}

validate.validators.isHexStrict = value => {
  // for ledgerIDs
  if (Web3.utils.isHexStrict(value)) {
    return null
  } else {
    return `${value} is not hex string prefixed with 0x.`
  }
}

validate.validators.isArray = value => {
  if (Array.isArray(value)) {
    return null
  } else {
    return `${value} is not an array.`
  }
}

validate.validators.isObj = value => {
  if (value instanceof Object && value) {
    return null
  } else {
    return `${value} is not an object.`
  }
}

validate.validators.isAddress = value => {
  if (Web3.utils.isAddress(value)) {
    return null
  } else {
    return `${value} is not address.`
  }
}

validate.validators.isBool = value => {
  if (typeof value === typeof true) {
    return null
  } else {
    return `${value} is not a boolean.`
  }
}

validate.validators.isPositiveInt = value => {
  if (value >= 0) {
    return null
  } else {
    return `${value} is not a positive integer.`
  }
}

validate.validators.isThreadState = value => {
  if (!value.channelId || !Web3.utils.isHexStrict(value.channelId)) {
    return `Thread state does not contain valid channelId: ${JSON.stringify(value)}`
  }
  if (value.nonce == null || value.nonce < 0) {
    return `Thread state does not contain valid nonce: ${JSON.stringify(value)}`
  }
  if (!value.partyA || !Web3.utils.isAddress(value.partyA)) {
    return `Thread state does not contain valid partyA: ${JSON.stringify(value)}`
  }
  if (!value.partyB || !Web3.utils.isAddress(value.partyB)) {
    return `Thread state does not contain valid partyB: ${JSON.stringify(value)}`
  }
  // valid state may have ethBalanceA/tokenBalanceA
  // or valid states may have balanceA objects
  if (value.ethBalanceA != null) {
    // must also contain all other fields
    if (value.ethBalanceB == null || value.tokenBalanceA == null || value.tokenBalanceB == null) {
      return `Thread state does not contain valid balances: ${JSON.stringify(value)}`
    }
  } else if (value.balanceA != null) {
    if (validate.validators.isValidDepositObject(value.balanceA) || validate.validators.isValidDepositObject(value.balanceB)) {
      return `Thread state does not contain valid balances: ${JSON.stringify(value)}`
    }
  } else {
    return `Thread state does not contain valid balances: ${JSON.stringify(value)}`
  } 

  return null
}

validate.validators.isChannelObj = value => {
  if (CHANNEL_STATES[value.state] === -1) {
    return `Channel object does not contain valid state: ${JSON.stringify(value)}`
  }
  if (!value.channelId || !Web3.utils.isHexStrict(value.channelId)) {
    return `Channel object does not contain valid channelId: ${JSON.stringify(value)}`
  }
  if (value.nonce == null || value.nonce < 0) {
    return `Channel object does not contain valid nonce: ${JSON.stringify(value)}`
  }
  if (!value.partyA || !Web3.utils.isAddress(value.partyA)) {
    return `Channel object does not contain valid partyA: ${JSON.stringify(value)}`
  }
  if (!value.partyI || !Web3.utils.isAddress(value.partyI)) {
    return `Channel object does not contain valid partyI: ${JSON.stringify(value)}`
  }
  if (value.openVcs == null || value.openVcs < 0) {
    return `Channel object does not contain valid number of openVcs: ${JSON.stringify(value)}`
  }
  if (!value.vcRootHash || !Web3.utils.isHexStrict(value.vcRootHash)) {
    return `Channel object does not contain valid vcRootHash: ${JSON.stringify(value)}`
  }
  if (value.ethBalanceA == null) {
    return `Channel object does not contain valid ethBalanceA: ${JSON.stringify(value)}`
  }
  if (value.ethBalanceI == null) {
    return `Channel object does not contain valid ethBalanceI: ${JSON.stringify(value)}`
  }
  if (value.tokenBalanceA == null) {
    return `Channel object does not contain valid tokenBalanceA: ${JSON.stringify(value)}`
  }
  if (value.tokenBalanceI == null) {
    return `Channel object does not contain valid tokenBalanceI: ${JSON.stringify(value)}`
  }
  return null
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
   * @constructor
   * @example
   * const Connext = require('connext')
   * const connext = new Connext(web3)
   * @param {Object} params - the constructor object
   * @param {Web3} params.web3 - the web3 instance
   * @param {String} params.ingridAddress - ETH address of intermediary (defaults to Connext hub)
   * @param {String} params.watcherUrl - url of watcher server (defaults to Connext hub)
   * @param {String} params.ingridUrl - url of intermediary server (defaults to Connext hub)
   * @param {String} params.contractAddress - address of deployed contract (defaults to latest deployed contract)
   * @param {String} params.hubAuth - token authorizing client package to make requests to hub
   */
  constructor (
    {
      web3,
      ingridAddress = '',
      watcherUrl = '',
      ingridUrl = '',
      contractAddress = '',
      hubAuth = '',
      useAxios = false
    },
    web3Lib = Web3
  ) {
    this.web3 = new web3Lib(web3.currentProvider) // convert legacy web3 0.x to 1.x
    this.ingridAddress = ingridAddress.toLowerCase()
    this.watcherUrl = watcherUrl
    this.ingridUrl = ingridUrl
    this.channelManagerInstance = new this.web3.eth.Contract(
      channelManagerAbi.abi,
      contractAddress
    )
    this.config = {
      headers: {
        Cookie: `hub.sid=${hubAuth};`,
        Authorization: `Bearer ${hubAuth}`
      },
      withAuth: true
    }
    this.networking = networking(ingridUrl, useAxios)
  }

  // ***************************************
  // *********** HAPPY CASE FNS ************
  // ***************************************

  /**
   * Opens a ledger channel with Ingrid (Hub) at the address provided when instantiating the Connext instance with the given initial deposit.
   *
   * Sender defaults to accounts[0] if not supplied to the register function.
   *
   * Ledger channel challenge timer is determined by Ingrid (Hub) if the parameter is not supplied. Current default value is 3600s (1 hour).
   *
   * Uses the internal web3 instance to call the createChannel function on the Channel Manager contract, and logs the transaction hash of the channel creation. The function returns the ID of the created channel.
   *
   * Once the channel is created on chain, users should call the requestJoinLc function to request that the hub joins the channel. This function should be called on a timeout sufficient for the hub to detect the channel and add it to its database.
   *
   * If Ingrid is unresponsive, or does not join the channel within the challenge period, the client function "LCOpenTimeoutContractHandler" can be called by the client to recover the funds.
   *
   * @example
   * const deposit = Web3.utils.toBN(Web3.utils.toWei('1', 'ether))
   * const lcId = await connext.register(deposit)
   *
   * @param {Object} initialDeposits - deposits in wei (must have at least one deposit)
   * @param {BN} initialDeposits.ethDeposit - deposit in eth (may be null)
   * @param {BN} initialDeposits.tokenDeposit - deposit in tokens (may be null)
   * @param {String} sender - (optional) counterparty with hub in ledger channel, defaults to accounts[0]
   * @param {Number} challenge - (optional) challenge period in seconds
   * @returns {Promise} resolves to the ledger channel id of the created channel
   */
  async register (initialDeposits, tokenAddress = null, sender = null, challenge = null) {
    // validate params
    const methodName = 'register'
    const isValidDepositObject = { presence: true, isValidDepositObject: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(initialDeposits, isValidDepositObject),
      methodName,
      'initialDeposits'
    )
    if (tokenAddress) {
      // should probably do a better check for contract specific addresses
      // maybe a whitelisted token address array
      Connext.validatorsResponseToError(
        validate.single(tokenAddress, isAddress),
        methodName,
        'tokenAddress'
      )
    }
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }
    if (challenge) {
      Connext.validatorsResponseToError(
        validate.single(challenge, isPositiveInt),
        methodName,
        'isPositiveInt'
      )
    } else {
      // get challenge timer from ingrid
      challenge = await this.getChallengeTimer()

    }
    // determine channel type
    const { ethDeposit, tokenDeposit } = initialDeposits
    let channelType
    if (ethDeposit && tokenDeposit) {
      // token and eth
      channelType = Object.keys(CHANNEL_TYPES)[2]
    } else if (tokenDeposit) {
      channelType = Object.keys(CHANNEL_TYPES)[1]
    } else if (ethDeposit) {
      channelType = Object.keys(CHANNEL_TYPES)[0]
    } else {
      throw new LCOpenError(methodName, `Error determining channel deposit types.`)
    }
    // verify channel does not exist between ingrid and sender
    let channel = await this.getLcByPartyA(sender)
    if (channel != null && CHANNEL_STATES[channel.state] === 1) {
      throw new LCOpenError(
        methodName,
        401,
        `PartyA has open channel with hub, ID: ${channel.channelId}`
      )
    }

    // verify opening state channel with different account
    if (sender.toLowerCase() === this.ingridAddress.toLowerCase()) {
      throw new LCOpenError(methodName, 'Cannot open a channel with yourself')
    }

    // generate additional initial lc params
    const channelId = Connext.getNewChannelId()

    const contractResult = await this.createChannelContractHandler ({
      channelId,
      challenge,
      initialDeposits,
      channelType,
      tokenAddress: tokenAddress ? tokenAddress : null,
      sender
    })
    console.log('tx hash:', contractResult.transactionHash)

    return channelId
  }

  /**
   * Adds a deposit to an existing ledger channel by calling the contract function "deposit" using the internal web3 instance.
   *
   * Can be used by any either channel party.
   *
   * If sender is not supplied, it defaults to accounts[0]. If the recipient is not supplied, it defaults to the sender.
   *
   *
   * @example
   * // get a BN
   * const deposit = Web3.utils.toBN(Web3.utils.toWei('1','ether'))
   * const txHash = await connext.deposit(deposit)
   *
   * @param {Object} deposits - deposit object
   * @param {BN} deposits.ethDeposit - value of the channel deposit in ETH
   * @param {BN} deposits.tokenDeposit - value of the channel deposit in tokens
   * @param {String} sender - (optional) ETH address sending funds to the ledger channel
   * @param {String} recipient - (optional) ETH address recieving funds in their ledger channel
   * @param {String} tokenAddress - (optional, for testing) contract address of channel tokens
   * @returns {Promise} resolves to the transaction hash of the onchain deposit.
   */
  async deposit (deposits, sender = null, recipient = sender, tokenAddress = null) {
    // validate params
    const methodName = 'deposit'
    const isValidDepositObject = { presence: true, isValidDepositObject: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(deposits, isValidDepositObject),
      methodName,
      'deposits'
    )
    const accounts = await this.web3.eth.getAccounts()
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      sender = accounts[0].toLowerCase()
    }
    if (recipient) {
      Connext.validatorsResponseToError(
        validate.single(recipient, isAddress),
        methodName,
        'recipient'
      )
    } else {
      recipient = accounts[0].toLowerCase()
    }

    const channel = await this.getLcByPartyA(recipient)
    // verify channel is open
    if (CHANNEL_STATES[channel.state] !== CHANNEL_STATES.LCS_OPENED) {
      throw new LCUpdateError(methodName, 'Channel is not in the right state')
    }
    // verify recipient is in channel
    if (
      channel.partyA.toLowerCase() !== recipient.toLowerCase() &&
      channel.partyI.toLowerCase() !== recipient.toLowerCase()
    ) {
      throw new LCUpdateError(methodName, 'Recipient is not member of channel')
    }

    // call contract handler
    const result = await this.depositContractHandler({
      channelId: channel.channelId,
      deposits,
      recipient,
      sender,
      tokenAddress
    })
    return result
  }

  /**
   * Opens a virtual channel between "to" and sender with Ingrid as the hub. Both users must have a ledger channel open with ingrid.
   *
   * If there is no deposit provided, then 100% of the ledger channel balance is added to virtual channel deposit. This function is to be called by the "A" party in a unidirectional scheme.
   *
   * Signs a copy of the initial virtual channel state, and generates a proposed ledger channel update to the hub for countersigning that updates the number of open virtual channels and the root hash of the ledger channel state.
   *
   * This proposed state update serves as the opening certificate for the virtual channel, and is used to verify Ingrid agreed to facilitate the creation of the virtual channel and take on the counterparty risk.
   *
   *
   * @example
   * const myFriendsAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
   * await connext.openChannel({ to: myFriendsAddress })
   *
   * @param {Object} params - the method object
   * @param {String} params.to - ETH address you want to open a virtual channel with
   * @param {BN} params.deposit - (optional) deposit in wei for the virtual channel, defaults to the entire LC balance
   * @param {String} params.sender - (optional) who is initiating the virtual channel creation, defaults to accounts[0]
   * @returns {Promise} resolves to the virtual channel ID recieved by Ingrid
   */

  async openChannel ({ to, deposit = null, sender = null }) {
    // validate params
    const methodName = 'openChannel'
    const isAddress = { presence: true, isAddress: true }
    const isValidDepositObject = { presence: true, isValidDepositObject: true }
    Connext.validatorsResponseToError(
      validate.single(to, isAddress),
      methodName,
      'to'
    )
    if (deposit) {
      Connext.validatorsResponseToError(
        validate.single(deposit, isValidDepositObject),
        methodName,
        'deposit'
      )
    }
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }
    // not opening channel with yourself
    if (sender.toLowerCase() === to.toLowerCase()) {
      throw new VCOpenError(methodName, 'Cannot open a channel with yourself')
    }

    const subchanA = await this.getLcByPartyA(sender)
    const subchanB = await this.getLcByPartyA(to)

    // validate the subchannels exist
    if (!subchanB || !subchanA) {
      throw new VCOpenError(
        methodName,
        'Missing one or more required subchannels'
      )
    }
    // subchannels in right state
    if (CHANNEL_STATES[subchanB.state] !== 1 || CHANNEL_STATES[subchanA.state] !== 1) {
      throw new VCOpenError(
        methodName,
        'One or more required subchannels are in the incorrect state'
      )
    }

    // validate lcA has enough to deposit or set deposit
    if (deposit === null) {
      // use entire subchanA balance
      deposit = {
        tokenDeposit: Web3.utils.toBN(subchanA.tokenBalanceA),
        ethDeposit: Web3.utils.toBN(subchanA.ethBalanceA)
      }
    }
    if (deposit.tokenDeposit && Web3.utils.toBN(subchanA.tokenBalanceA).lt(deposit.tokenDeposit)) {
      throw new VCOpenError(
        methodName,
        'Insufficient value to open channel with provided token deposit'
      )
    }
    if (deposit.ethDeposit && Web3.utils.toBN(subchanA.ethBalanceA).lt(deposit.ethDeposit)) {
      throw new VCOpenError(
        methodName,
        'Insufficient value to open channel with provided ETH deposit'
      )
    }

    // vc does not already exist
    let channel = await this.getThreadByParties({ partyA: sender, partyB: to })
    if (channel) {
      throw new VCOpenError(
        methodName,
        451,
        `Parties already have open virtual channel: ${channel.channelId}`
      )
    }

    // detemine update type
    let updateType
    if (deposit.ethDeposit && deposit.tokenDeposit) {
      // token and eth
      updateType = Object.keys(CHANNEL_TYPES)[2]
    } else if (deposit.tokenDeposit) {
      updateType = Object.keys(CHANNEL_TYPES)[1]
    } else if (deposit.ethDeposit) {
      updateType = Object.keys(CHANNEL_TYPES)[0]
    } else {
      throw new VCOpenError(methodName, `Error determining channel deposit types.`)
    }

    // generate initial vcstate
    const channelId = Connext.getNewChannelId()
    const threadInitialState = {
      channelId,
      nonce: 0,
      partyA: sender,
      partyB: to.toLowerCase(),
      balanceA: deposit,
      balanceB: {
        tokenDeposit: Web3.utils.toBN('0'),
        ethDeposit: Web3.utils.toBN('0')
      },
      updateType,
      signer: sender
    }
    const sigVC0 = await this.createThreadStateUpdate(threadInitialState)
    const sigAtoI = await this.createChannelUpdateOnThreadOpen({
      threadInitialState,
      channel: subchanA,
      signer: sender
    })

    // ingrid should add vc params to db
    let response
    try {
      response = await this.networking.post(`virtualchannel/`, {
        channelId,
        partyA: sender.toLowerCase(),
        partyB: to.toLowerCase(),
        ethBalanceA: deposit.ethDeposit.toString(),
        tokenBalanceA: deposit.tokenDeposit.toString(),
        vcSig: sigVC0,
        lcSig: sigAtoI
      })
    } catch (e) {
      throw new VCOpenError(methodName, e.message)
    }
    return response.data.channelId
  }

  /**
   * Joins virtual channel with provided channelId with a deposit of 0 (unidirectional channels).
   *
   * This function is to be called by the "B" party in a unidirectional scheme.
   *
   * @example
   * const channelId = 10 // pushed to partyB from Ingrid
   * await connext.joinChannel(channelId)
   * @param {String} channelId - ID of the virtual channel
   * @param {String} sender - (optional) ETH address of the person joining the virtual channel (partyB)
   * @returns {Promise} resolves to the virtual channel ID
   */
  async joinChannel (channelId, sender = null) {
    // validate params
    const methodName = 'joinChannel'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    const vc = await this.getThreadById(channelId)
    if (vc === null) {
      throw new VCOpenError(methodName, 'Channel not found')
    }

    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
      if (sender.toLowerCase() !== vc.partyB) {
        throw new VCOpenError(methodName, 'Incorrect channel counterparty')
      }
    } else {
      sender = vc.partyB
    }
    // get channels
    const lcA = await this.getLcByPartyA(vc.partyA)
    const lcB = await this.getLcByPartyA(sender)
    if (lcB === null || lcA === null) {
      throw new VCOpenError(
        methodName,
        'Missing one or more required subchannels'
      )
    }

    // subchannels in right state
    if (CHANNEL_STATES[lcB.state] !== CHANNEL_STATES.LCS_OPENED || CHANNEL_STATES[lcA.state] !== CHANNEL_STATES.LCS_OPENED) {
      throw new VCOpenError(
        methodName,
        'One or more required subchannels are in the incorrect state'
      )
    }

    const vc0 = {
      channelId,
      nonce: 0,
      partyA: vc.partyA, // depending on ingrid for this value
      partyB: sender,
      balanceA: Web3.utils.toBN(vc.balanceA), // depending on ingrid for this value
      balanceB: Web3.utils.toBN(0),
      signer: sender
    }
    const vcSig = await this.createThreadStateUpdate(vc0)
    // generate lcSig
    const lcSig = await this.createChannelUpdateOnThreadOpen({
      threadInitialState: vc0,
      channel: lcB,
      signer: sender
    })
    // ping ingrid with vc0 (hub decomposes to lc)
    const result = await this.joinVcHandler({
      vcSig,
      lcSig,
      channelId
    })
    return result
  }

  /**
   * Send multiple balance updates simultaneously from a single account.
   * 
   * @param {Object[]} payments - payments object
   * @param {String} sender - (optional) defaults to accounts[0]
   */
  async updateBalances (payments, sender = null) {
    const methodName = 'updateBalances'
    const isAddress = { presence: true, isAddress: true }
    const isArray = { presence: true, isArray: true }
    Connext.validatorsResponseToError(validate.single(payments, isArray), methodName, 'payments')
    if (!sender) {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0]
    }
    Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender')
    const updatedPayments = await Promise.all(payments.map( async (payment, index) => {
      // generate payment
      let updatedPayment
      switch(PAYMENT_TYPES[payment.type]) {
        case PAYMENT_TYPES.CHANNEL: // channel update
          updatedPayment = await this.channelUpdateHandler(payment, index + 1, sender)
          break
        case PAYMENT_TYPES.THREAD: // thread update
          updatedPayment = await this.threadUpdateHandler(payment, index + 1, sender)
          break
        default:
          throw new LCUpdateError(methodName, 'Incorrect channel type specified. Must be CHANNEL or THREAD.')
      }
      updatedPayment.type = payment.type
      return updatedPayment
    }))

    const response = await this.networking.post(
      `payments/`,
      {
        payments: updatedPayments
      }
    )
    return response.data
  }

  async channelUpdateHandler ({ payment, meta }, increment, sender = null) {
    const methodName = 'channelUpdateHandler'
    const isAddress= { presence: true, isAddress: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isValidDepositObject = { presence: true, isValidDepositObject: true }
    const isValidMeta = { presence: true, isValidMeta: true }
    const isObj = { presence: true, isObj: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }

    if (!sender) {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0]
    }
    Connext.validatorsResponseToError(validate.single(payment, isObj), methodName, 'payment')
    const { balanceA, balanceB, channelId } = payment
    // validate inputs
    Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender')
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isValidDepositObject),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isValidDepositObject),
      methodName,
      'balanceB'
    )
    // validate meta
    Connext.validatorsResponseToError(
      validate.single(meta, isValidMeta),
      methodName,
      'meta'
    )
    Connext.validatorsResponseToError(
      validate.single(increment, isPositiveInt),
      methodName,
      'increment'
    )
    const channel = await this.getLcById(channelId)
    // must exist
    if (!channel) {
      throw new LCUpdateError(methodName, 'Channel not found')
    }
    // must be opened or joined
    if (CHANNEL_STATES[channel.state] !== 1 && CHANNEL_STATES[channel.state] !== 2) {
      throw new LCUpdateError(methodName, 'Channel is in invalid state')
    }
    // must be senders channel
    if (channel.partyA.toLowerCase() !== sender.toLowerCase() && channel.partyI.toLowerCase() !== sender.toLowerCase()) {
      throw new LCUpdateError(methodName, 'Not your channel')
    }
    // check what type of update
    let updateType
    if (balanceA.ethDeposit && balanceA.tokenDeposit && balanceB.ethDeposit && balanceB.tokenDeposit) {
      // token and eth
      updateType = Object.keys(CHANNEL_TYPES)[2]
    } else if (balanceA.tokenDeposit && balanceB.tokenDeposit) {
      updateType = Object.keys(CHANNEL_TYPES)[1]
    } else if (balanceA.ethDeposit && balanceB.ethDeposit) {
      updateType = Object.keys(CHANNEL_TYPES)[0]
    }

    const channelEthBal = Web3.utils.toBN(channel.ethBalanceA).add(Web3.utils.toBN(channel.ethBalanceI))
    const channelTokenBal = Web3.utils.toBN(channel.tokenBalanceA).add(Web3.utils.toBN(channel.tokenBalanceI))
    let proposedEthBalance, proposedTokenBalance
    switch (CHANNEL_TYPES[updateType]) {
      case CHANNEL_TYPES.ETH:
        if (balanceB.ethDeposit.lte(Web3.utils.toBN(channel.ethBalanceI))) {
          throw new LCUpdateError(methodName, 'Channel updates can only increase hub ETH balance')
        }
        proposedEthBalance = Web3.utils.toBN(balanceA.ethDeposit).add(balanceB.ethDeposit) // proposed balance
        break
      
      case CHANNEL_TYPES.TOKEN:
        if (balanceB.tokenDeposit.lte(Web3.utils.toBN(channel.tokenBalanceI))) {
          throw new LCUpdateError(methodName, 'Channel updates can only increase hub balance')
        }
        proposedTokenBalance = Web3.utils.toBN(balanceA.tokenDeposit).add(balanceB.tokenDeposit)
        break
      
      case CHANNEL_TYPES.TOKEN_ETH:
        if (balanceB.ethDeposit.lte(Web3.utils.toBN(channel.ethBalanceI))) {
          throw new LCUpdateError(methodName, 'Channel updates can only increase hub ETH balance')
        }
        if (balanceB.tokenDeposit.lte(Web3.utils.toBN(channel.tokenBalanceI))) {
          throw new LCUpdateError(methodName, 'Channel updates can only increase hub balance')
        }
        proposedEthBalance = Web3.utils.toBN(balanceA.ethDeposit).add(balanceB.ethDeposit)
        proposedTokenBalance = Web3.utils.toBN(balanceA.tokenDeposit).add(balanceB.tokenDeposit)
        break
      default:
        throw new LCUpdateError(methodName, 'Error determining channel deposit types.')
    }

    if (proposedEthBalance && !proposedEthBalance.eq(channelEthBal)) {
      throw new LCUpdateError(methodName, 'Channel ETH balance cannot change')
    }

    if (proposedTokenBalance && !proposedTokenBalance.eq(channelTokenBal)) {
      throw new LCUpdateError(methodName, 'Channel token balance cannot change')
    }

    // generate signature
    const sig = await this.createChannelStateUpdate({
      channelId,
      nonce: channel.nonce + increment,
      openVcs: channel.openVcs,
      vcRootHash: channel.vcRootHash,
      partyA: channel.partyA,
      partyI: channel.partyI,
      balanceA,
      balanceI: balanceB,
      signer: sender
    })
    // return sig
    const state = {
      ethBalanceA: proposedEthBalance ? balanceA.ethDeposit.toString() : Web3.utils.toBN(channel.ethBalanceA).toString(),
      ethBalanceI: proposedEthBalance ? balanceB.ethDeposit.toString() : Web3.utils.toBN(channel.ethBalanceI).toString(),
      tokenBalanceA: proposedTokenBalance ? balanceA.tokenDeposit.toString() : Web3.utils.toBN(channel.tokenBalanceA).toString(),
      tokenBalanceI: proposedTokenBalance ? balanceB.tokenDeposit.toString() : Web3.utils.toBN(channel.tokenBalanceI).toString(),
      channelId,
      nonce: channel.nonce + increment,
      sig,
    }
    return { payment: state, meta }
  }

  // handle thread state updates from updateBalances
  // payment object contains fields balanceA and balanceB
  async threadUpdateHandler ({ payment, meta }, increment, sender = null) {
    // validate params
    const methodName = 'threadUpdateHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isValidDepositObject = { presence: true, isValidDepositObject: true }
    const isValidMeta = { presence: true, isValidMeta: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isObj = { presence: true, isObj: true }
    const isAddress = { presence: true, isAddress: true }

    if (!sender) {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0]
    }
    Connext.validatorsResponseToError(validate.single(payment, isObj), methodName, 'payment')
    Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender')
    const { channelId, balanceA, balanceB } = payment
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isValidDepositObject),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isValidDepositObject),
      methodName,
      'balanceB'
    )
    // validate meta
    Connext.validatorsResponseToError(
      validate.single(meta, isValidMeta),
      methodName,
      'meta'
    )
    Connext.validatorsResponseToError(
      validate.single(increment, isPositiveInt),
      methodName,
      'increment'
    )
    // get the vc
    const thread = await this.getThreadById(channelId)
    // must exist
    if (!thread) {
      throw new VCUpdateError(methodName, 'Thread not found')
    }
    // channel must be opening or opened
    if (THREAD_STATES[thread.state] === 3) {
      throw new VCUpdateError(methodName, 'Thread is in invalid state')
    }
    if (sender.toLowerCase() !== thread.partyA.toLowerCase()) {
      throw new VCUpdateError(methodName, 'Thread updates can only be made by partyA.')
    }

    // check what type of update
    let updateType
    if (balanceA.ethDeposit && balanceA.tokenDeposit && balanceB.ethDeposit && balanceB.tokenDeposit) {
      // token and eth
      updateType = Object.keys(CHANNEL_TYPES)[2]
    } else if (balanceA.tokenDeposit && balanceB.tokenDeposit) {
      updateType = Object.keys(CHANNEL_TYPES)[1]
    } else if (balanceA.ethDeposit && balanceB.ethDeposit) {
      updateType = Object.keys(CHANNEL_TYPES)[0]
    }

    const threadEthBalance = Web3.utils.toBN(thread.ethBalanceA).add(Web3.utils.toBN(thread.ethBalanceB))
    const threadTokenBalance = Web3.utils.toBN(thread.tokenBalanceA).add(Web3.utils.toBN(thread.tokenBalanceB))
    let proposedEthBalance, proposedTokenBalance
    switch (CHANNEL_TYPES[updateType]) {
      case CHANNEL_TYPES.ETH:
        if (balanceB.ethDeposit.lte(Web3.utils.toBN(thread.ethBalanceB))) {
          throw new VCUpdateError(methodName, 'Thread updates can only increase partyB ETH balance')
        }
        proposedEthBalance = Web3.utils.toBN(balanceA.ethDeposit).add(balanceB.ethDeposit) // proposed balance
        break
      
      case CHANNEL_TYPES.TOKEN:
        if (balanceB.tokenDeposit.lte(Web3.utils.toBN(thread.tokenBalanceB))) {
          throw new VCUpdateError(methodName, 'Thread updates can only increase partyB token balance')
        }
        proposedTokenBalance = Web3.utils.toBN(balanceA.tokenDeposit).add(balanceB.tokenDeposit)
        break
      
      case CHANNEL_TYPES.TOKEN_ETH:
        if (balanceB.ethDeposit.lte(Web3.utils.toBN(thread.ethBalanceB))) {
          throw new VCUpdateError(methodName, 'Thread updates can only increase partyB ETH balance')
        }
        if (balanceB.tokenDeposit.lte(Web3.utils.toBN(thread.tokenBalanceB))) {
          throw new VCUpdateError(methodName, 'Thread updates can only increase partyB token balance')
        }
        proposedEthBalance = Web3.utils.toBN(balanceA.ethDeposit).add(balanceB.ethDeposit)
        proposedTokenBalance = Web3.utils.toBN(balanceA.tokenDeposit).add(balanceB.tokenDeposit)
        break
      default:
        throw new VCUpdateError(methodName, 'Error determining thread deposit types.')
    }

    if (proposedEthBalance && !proposedEthBalance.eq(threadEthBalance)) {
      throw new VCUpdateError(methodName, 'Thread ETH balance cannot change')
    }

    if (proposedTokenBalance && !proposedTokenBalance.eq(threadTokenBalance)) {
      throw new VCUpdateError(methodName, 'Thread token balance cannot change')
    }

    // generate new state update
    const sig = await this.createThreadStateUpdate({
      channelId,
      nonce: thread.nonce + increment,
      partyA: thread.partyA,
      partyB: thread.partyB,
      balanceA: balanceA,
      balanceB: balanceB,
      updateType,
      signer: sender
    })
    // return sig
    const state = {
      ethBalanceA: proposedEthBalance ? balanceA.ethDeposit.toString() : Web3.utils.toBN(thread.ethBalanceA).toString(),
      ethBalanceB: proposedEthBalance ? balanceB.ethDeposit.toString() : Web3.utils.toBN(thread.ethBalanceB).toString(),
      tokenBalanceA: proposedTokenBalance ? balanceA.tokenDeposit.toString() : Web3.utils.toBN(thread.tokenBalanceA).toString(),
      tokenBalanceB: proposedTokenBalance ? balanceB.tokenDeposit.toString() : Web3.utils.toBN(thread.tokenBalanceB).toString(),
      channelId,
      nonce: thread.nonce + increment,
      sig,
    }
    return { payment: state, meta }
  }

  /**
   * Closes a virtual channel.
   *
   * Retrieves the latest virtual state update, and decomposes the virtual channel into their respective ledger channel updates.
   *
   * The virtual channel agent who called this function signs the closing ledger-channel update, and forwards the signature to Ingrid.
   *
   * Ingrid verifies the signature, returns her signature of the proposed virtual channel decomposition, and proposes the LC update for the other virtual channel participant.
   *
   * If Ingrid does not return her signature on the proposed virtual channel decomposition, the caller goes to chain by calling initVC and settleVC.
   *
   * @example
   * await connext.closeChannel({
   *   channelId: 0xadsf11..,
   *   balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
   * })
   * @param {Number} channelId - ID of the virtual channel to close
   * @returns {Promise} resolves to the signature of the hub on the generated update if accepted, or the result of closing the channel on chain if there is a dispute
   */
  async closeChannel (threadId, sender = null) {
    // validate params
    const methodName = 'closeChannel'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(threadId, isHexStrict),
      methodName,
      'threadId'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }

    // get latest state in vc
    const thread = await this.getThreadById(threadId)
    if (!thread) {
      throw new VCCloseError(methodName, 'Thread not found')
    }
    // must be opened or opening
    if (THREAD_STATES[thread.state] !== THREAD_STATES.VCS_OPENING && THREAD_STATES[thread.state] !== THREAD_STATES.VCS_OPENED) {
      throw new VCCloseError(methodName, 'Thread is in invalid state')
    }
    const latestThreadState = await this.getLatestThreadState(threadId)
    // verify latestThreadState was signed by agentA
    const signer = Connext.recoverSignerFromThreadStateUpdate({
      sig: latestThreadState.sigA,
      channelId: threadId,
      nonce: latestThreadState.nonce,
      partyA: thread.partyA,
      partyB: thread.partyB,
      ethBalanceA: Web3.utils.toBN(latestThreadState.ethBalanceA),
      ethBalanceB: Web3.utils.toBN(latestThreadState.ethBalanceB),
      tokenBalanceA: Web3.utils.toBN(latestThreadState.tokenBalanceA),
      tokenBalanceB: Web3.utils.toBN(latestThreadState.tokenBalanceB),
    })
    if (signer.toLowerCase() !== thread.partyA.toLowerCase()) {
      throw new VCCloseError(
        methodName,
        'Incorrect signer detected on latest thread update'
      )
    }

    latestThreadState.channelId = threadId
    latestThreadState.partyA = thread.partyA
    latestThreadState.partyB = thread.partyB
    // get partyA ledger channel
    const subchan = await this.getLcByPartyA(sender)
    // generate decomposed lc update
    const sigAtoI = await this.createChannelUpdateOnThreadClose({
      latestThreadState,
      subchan,
      signer: sender.toLowerCase()
    })

    // request ingrid closes vc with this update
    const fastCloseSig = await this.fastCloseThreadHandler({
      sig: sigAtoI,
      signer: sender.toLowerCase(),
      channelId: threadId
    })

    if (!fastCloseSig) {
      throw new VCCloseError(
        methodName,
        651,
        'Hub did not cosign proposed channel update, call initThread and settleThread'
      )
    }
    // ingrid cosigned update
    return fastCloseSig
  }

  /**
   * Closes many virtual channels by calling closeChannel on each channel ID in the provided array.
   *
   * @example
   * const channels = [
   *     0xasd310..,
   *     0xadsf11..,
   * ]
   * await connext.closeChannels(channels)
   * @param {String[]} channelIds - array of virtual channel IDs you wish to close
   */
  async closeChannels (channelIds, sender = null) {
    const methodName = 'closeChannels'
    const isArray = { presence: true, isArray: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(channelIds, isArray),
      methodName,
      'channels'
    )
    if (!sender) {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0]
    }
    Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender')
    // should this try to fast close any of the channels?
    // or just immediately force close in dispute many channels
    const results = await Promise.all(channelIds.map( channelId => {
      console.log('Closing channel:', channelId)
      const response = this.closeChannel(channelId, sender)
      console.log('Channel closed.')
      return response
    }))
    return results
  }

  /**
   * Withdraws bonded funds from an existing ledger channel.
   *
   * All virtual channels must be closed before a ledger channel can be closed.
   *
   * Generates the state update from the latest ingrid signed state with fast-close flag.
   *
   * Ingrid should countersign the closing update if it matches what she has signed previously, and the channel will fast close by calling consensusCloseChannel on the contract.
   *
   * If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.
   *
   * @example
   * const success = await connext.withdraw()
   * @param {String} - (optional) who the transactions should be sent from, defaults to account[0]
   * @returns {Promise} resolves to an object with the structure: { response: transactionHash, fastClosed: true}
   */
  async withdraw (sender = null) {
    const methodName = 'withdraw'
    const isAddress = { presence: true, isAddress: true }
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }
    const channel = await this.getLcByPartyA(sender.toLowerCase())
    // channel must be open
    if (CHANNEL_STATES[channel.state] !== CHANNEL_STATES.LCS_OPENED) {
      throw new LCCloseError(methodName, 'Channel is in invalid state')
    }
    // sender must be channel member
    if (
      sender.toLowerCase() !== channel.partyA &&
      sender.toLowerCase() !== channel.partyI
    ) {
      throw new LCCloseError(methodName, 'Not your channel')
    }

    // get latest i-signed lc state update
    let channelState = await this.getLatestLedgerStateUpdate(channel.channelId, ['sigI'])
    if (channelState) {
      // openVcs?
      if (Number(channelState.openVcs) !== 0) {
        throw new LCCloseError(methodName, 'Cannot close channel with open VCs')
      }
      // empty root hash?
      if (channelState.vcRootHash !== Connext.generateThreadRootHash({ threadInitialStates: [] })) {
        throw new LCCloseError(methodName, 'Cannot close channel with open VCs')
      }
      // i-signed?
      const signer = Connext.recoverSignerFromChannelStateUpdate({
        sig: channelState.sigI,
        isClose: channelState.isClose,
        channelId: channel.channelId,
        nonce: channelState.nonce,
        openVcs: channelState.openVcs,
        vcRootHash: channelState.vcRootHash,
        partyA: channel.partyA,
        partyI: this.ingridAddress,
        ethBalanceA: Web3.utils.toBN(channelState.ethBalanceA),
        ethBalanceI: Web3.utils.toBN(channelState.ethBalanceI),
        tokenBalanceA: Web3.utils.toBN(channelState.tokenBalanceA),
        tokenBalanceI: Web3.utils.toBN(channelState.tokenBalanceI),
      })
      if (signer.toLowerCase() !== this.ingridAddress.toLowerCase()) {
        throw new LCCloseError(methodName, 'Hub did not sign update')
      }
    } else {
      // no state updates made in LC
      // PROBLEM: ingrid doesnt return lcState, just uses empty
      channelState = {
        isClose: false,
        channelId: channel.channelId,
        nonce: 0,
        openVcs: 0,
        vcRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
        partyA: channel.partyA,
        partyI: this.ingridAddress,
        ethBalanceA: Web3.utils.toBN(channel.ethBalanceA),
        ethBalanceI: Web3.utils.toBN(channel.ethBalanceI),
        tokenBalanceA: Web3.utils.toBN(channel.tokenBalanceA),
        tokenBalanceI: Web3.utils.toBN(channel.tokenBalanceI),
      }
    }

    // generate same update with fast close flag and post
    let sigParams = {
      isClose: true,
      channelId: channel.channelId,
      nonce: channelState.nonce + 1,
      openVcs: channelState.openVcs,
      vcRootHash: channelState.vcRootHash,
      partyA: channel.partyA,
      partyI: this.ingridAddress,
      balanceA: {
        tokenDeposit: Web3.utils.toBN(channelState.tokenBalanceA),
        ethDeposit: Web3.utils.toBN(channelState.ethBalanceA),
      },
      balanceI: {
        tokenDeposit: Web3.utils.toBN(channelState.tokenBalanceI),
        ethDeposit: Web3.utils.toBN(channelState.ethBalanceI),
      },
      signer: sender
    }
    const sig = await this.createChannelStateUpdate(sigParams)
    const finalState = await this.fastCloseChannelHandler({ sig, channelId: channel.channelId })
    if (!finalState.sigI) {
      throw new LCCloseError(
        methodName,
        601,
        'Hub did not countersign proposed update, channel could not be fast closed.'
      )
    }

    const response = await this.consensusCloseChannelContractHandler({
      channelId: channel.channelId,
      nonce: channelState.nonce + 1,
      balanceA: {
        tokenDeposit: Web3.utils.toBN(channelState.tokenBalanceA),
        ethDeposit: Web3.utils.toBN(channelState.ethBalanceA),
      },
      balanceI: {
        tokenDeposit: Web3.utils.toBN(channelState.tokenBalanceI),
        ethDeposit: Web3.utils.toBN(channelState.ethBalanceI),
      },
      sigA: sig,
      sigI: finalState.sigI,
      sender: sender.toLowerCase()
    })

    return response.transactionHash
  }

  // ***************************************
  // ************* DISPUTE FNS *************
  // ***************************************

  /**
   * Withdraw bonded funds from ledger channel after a channel is challenge-closed and the challenge period expires by calling withdrawFinal using the internal web3 instance.
   *
   * Looks up LC by the account address of the client-side user if sender parameter is not supplied.
   *
   * Calls the "byzantineCloseChannel" function on the contract.
   *
   * @example
   * const success = await connext.withdraw()
   * if (!success) {
   *   // wait out challenge timer
   *   await connext.withdrawFinal()
   * }
   * @param {String} sender - (optional) the person sending the on chain transaction, defaults to accounts[0]
   * @returns {Promise} resolves to the transaction hash from calling byzantineCloseChannel
   */
  async withdrawFinal (sender = null) {
    const methodName = 'withdrawFinal'
    const isAddress = { presence: true, isAddress: true }
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }
    const lc = await this.getLcByPartyA(sender)
    const results = await this.byzantineCloseChannelContractHandler({
      lcId: lc.channelId,
      sender: sender
    })
    return results
  }

  /**
   * Verifies and cosigns the latest ledger state update.
   *
   * @example
   * const lcId = await connext.getLcId() // get ID by accounts[0] and open status by default
   * await connext.cosignLatestChannelUpdate(channelId)
   *
   * @param {String} lcId - ledger channel id
   * @param {String} sender - (optional) the person who cosigning the update, defaults to accounts[0]
   * @returns {Promise} resolves to the cosigned ledger channel state update
   */
  async cosignLatestChannelUpdate (channelId, sender = null) {
    const methodName = 'cosignLatestChannelUpdate'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }
    const channel = await this.getLcById(channelId)
    if (channel == null) {
      throw new LCUpdateError(methodName, 'Channel not found')
    }
    if (channel.partyA !== sender.toLowerCase()) {
      throw new LCUpdateError(methodName, 'Incorrect signer detected')
    }
    if (CHANNEL_STATES[channel.state] !== CHANNEL_STATES.LCS_OPENED) {
      throw new LCUpdateError(methodName, 'Channel is in invalid state')
    }
    // TO DO
    let latestState = await this.getLatestLedgerStateUpdate(lcId, ['sigI'])
    const result = await this.cosignChannelUpdate({
      channelId,
      nonce: latestState.nonce,
      sender
    })
    return result
  }

  /**
   * Verifies and cosigns the ledger state update indicated by the provided nonce.
   *
   * @example
   * const lcId = await connext.getLcId() // get ID by accounts[0] and open status by default
   * await connext.cosignLatestChannelUpdate(lcId)
   *
   * @param {Object} params - the method object
   * @param {String} params.lcId - ledger channel id
   * @param {String} params.sender - (optional) the person who cosigning the update, defaults to accounts[0]
   * @returns {Promise} resolves to the cosigned ledger channel state update
   */
  async cosignChannelUpdate ({ channelId, nonce, sender = null }) {
    const methodName = 'cosignChannelUpdate'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }
    const channel = await this.getLcById(channelId)
    if (channel == null) {
      throw new LCUpdateError(methodName, 'Channel not found')
    }
    if (channel.partyA !== sender.toLowerCase()) {
      throw new LCUpdateError(methodName, 'Incorrect signer detected')
    }
    if (CHANNEL_STATES[channel.state] !== CHANNEL_STATES.LCS_OPENED) {
      throw new LCUpdateError(methodName, 'Channel is in invalid state')
    }
    if (nonce > channel.nonce) {
      throw new LCUpdateError(methodName, 'Invalid nonce detected')
    }

    // TO DO: factor out into above section
    let state = await this.getLcStateByNonce({ channelId, nonce })

    // verify sigI
    const signer = Connext.recoverSignerFromChannelStateUpdate({
      sig: state.sigI,
      isClose: state.isClose,
      channelId,
      nonce,
      openVcs: state.openVcs,
      vcRootHash: state.vcRootHash,
      partyA: sender,
      partyI: this.ingridAddress,
      ethBalanceA: Web3.utils.toBN(state.ethBalanceA),
      ethBalanceI: Web3.utils.toBN(state.ethBalanceI),
      tokenBalanceA: Web3.utils.toBN(state.tokenBalanceA),
      tokenBalanceI: Web3.utils.toBN(state.tokenBalanceI),
    })
    if (signer.toLowerCase() !== this.ingridAddress.toLowerCase()) {
      throw new LCUpdateError(methodName, 'Invalid signature detected')
    }

    state.signer = state.partyA
    state.channelId = channelId
    const sigA = await this.createChannelStateUpdate(state)
    const response = await this.networking.post(
      `ledgerchannel/${channelId}/update/${nonce}/cosign`,
      {
        sig: sigA
      }
    )
    return response.data
  }

  // ***************************************
  // *********** STATIC METHODS ************
  // ***************************************

  /**
   * Returns a new channel id that is a random hex string.
   *
   * @returns {String} a random 32 byte channel ID.
   */
  static getNewChannelId () {
    const buf = crypto.randomBytes(32)
    const channelId = Web3.utils.bytesToHex(buf)
    return channelId
  }

  /**
   * Hashes the ledger channel state update information using soliditySha3.
   *
   * @param {Object} params - the method object
   * @param {Boolean} params.isClose - flag indicating whether or not this is closing state
   * @param {Number} params.nonce - the sequence of the ledger channel update
   * @param {Number} params.openVcs - the number of open virtual channels associated with this ledger channel
   * @param {String} params.vcRootHash - the root hash of the Merkle tree containing all initial states of the open virtual channels
   * @param {String} params.partyA - ETH address of partyA in the ledgerchannel
   * @param {String} params.partyI - ETH address of the hub (Ingrid)
   * @param {Number} params.balanceA - updated balance of partyA
   * @param {Number} params.balanceI - updated balance of partyI
   * @returns {String} the hash of the state data
   */
  static createChannelStateUpdateFingerprint ({
    channelId,
    isClose,
    nonce,
    openVcs,
    vcRootHash,
    partyA,
    partyI,
    ethBalanceA,
    ethBalanceI,
    tokenBalanceA,
    tokenBalanceI
  }) {
    // validate params
    const methodName = 'createChannelStateUpdateFingerprint'
    // validate
    // validatorOpts
    const isHex = { presence: true, isHex: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBool = { presence: true, isBool: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(isClose, isBool),
      methodName,
      'isClose'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(openVcs, isPositiveInt),
      methodName,
      'openVcs'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyI, isAddress),
      methodName,
      'partyI'
    )
    Connext.validatorsResponseToError(
      validate.single(ethBalanceA, isBN),
      methodName,
      'ethBalanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(ethBalanceI, isBN),
      methodName,
      'ethBalanceI'
    )
    Connext.validatorsResponseToError(
      validate.single(tokenBalanceA, isBN),
      methodName,
      'tokenBalanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(tokenBalanceI, isBN),
      methodName,
      'tokenBalanceI'
    )
    // generate state update to sign
    const hash = Web3.utils.soliditySha3(
      { type: 'bytes32', value: channelId },
      { type: 'bool', value: isClose },
      { type: 'uint256', value: nonce },
      { type: 'uint256', value: openVcs },
      { type: 'bytes32', value: vcRootHash },
      { type: 'address', value: partyA }, // address will be returned bytepadded
      { type: 'address', value: partyI }, // address is returned bytepadded
      { type: 'uint256', value: ethBalanceA },
      { type: 'uint256', value: ethBalanceI },
      { type: 'uint256', value: tokenBalanceA },
      { type: 'uint256', value: tokenBalanceI }
    )
    return hash
  }

  /**
   * Recovers the signer from the hashed data generated by the Connext.createChannelStateUpdateFingerprint function.
   *
   * @param {Object} params - the method object
   * @param {String} params.sig - the signature of the data from an unknown agent
   * @param {Boolean} params.isClose - flag indicating whether or not this is closing state
   * @param {String} params.channelId - ID of the ledger channel you are creating a state update for
   * @param {Number} params.nonce - the sequence of the ledger channel update
   * @param {Number} params.openVcs - the number of open virtual channels associated with this ledger channel
   * @param {String} params.vcRootHash - the root hash of the Merkle tree containing all initial states of the open virtual channels
   * @param {String} params.partyA - ETH address of partyA in the ledgerchannel
   * @param {String} params.partyI - ETH address of the hub (Ingrid)
   * @param {Number} params.balanceA - updated balance of partyA
   * @param {Number} params.balanceI - updated balance of partyI
   * @returns {String} the ETH address of the person who signed the data
   */
  static recoverSignerFromChannelStateUpdate ({
    channelId,
    sig,
    isClose,
    nonce,
    openVcs,
    vcRootHash,
    partyA,
    partyI,
    ethBalanceA,
    ethBalanceI,
    tokenBalanceA,
    tokenBalanceI
  }) {
    const methodName = 'recoverSignerFromChannelStateUpdate'
    // validate
    // validatorOpts
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBool = { presence: true, isBool: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )

    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )

    Connext.validatorsResponseToError(
      validate.single(isClose, isBool),
      methodName,
      'isClose'
    )

    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(openVcs, isPositiveInt),
      methodName,
      'openVcs'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyI, isAddress),
      methodName,
      'partyI'
    )
    Connext.validatorsResponseToError(
      validate.single(ethBalanceA, isBN),
      methodName,
      'ethBalanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(ethBalanceI, isBN),
      methodName,
      'ethBalanceI'
    )
    Connext.validatorsResponseToError(
      validate.single(tokenBalanceA, isBN),
      methodName,
      'tokenBalanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(tokenBalanceI, isBN),
      methodName,
      'tokenBalanceI'
    )

    console.log('recovering signer from:', JSON.stringify({
      sig,
      channelId,
      isClose,
      nonce,
      openVcs,
      vcRootHash,
      partyA,
      partyI,
      ethBalanceA: ethBalanceA.toString(),
      ethBalanceI: ethBalanceI.toString(),
      tokenBalanceA: tokenBalanceA.toString(),
      tokenBalanceI: tokenBalanceI.toString(),
    }))
    // generate fingerprint
    let fingerprint = Connext.createChannelStateUpdateFingerprint({
      channelId,
      isClose,
      nonce,
      openVcs,
      vcRootHash,
      partyA,
      partyI,
      ethBalanceA,
      ethBalanceI,
      tokenBalanceA,
      tokenBalanceI
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

    console.log('recovered:', addr)
    return addr
  }

  /**
   * Hashes data from a virtual channel state update using soliditySha3.
   *
   * @param {Object} params - the method object
   * @param {String} params.channelId - ID of the virtual channel you are creating a state update for
   * @param {Number} params.nonce - the sequence of the state update
   * @param {String} params.partyA - ETH address of partyA
   * @param {String} params.partyB - ETH address of partyB
   * @param {Number} params.balanceA - updated balance of partyA
   * @param {Number} params.balanceB - updated balance of partyB
   * @returns {String} hash of the virtual channel state data
   */
  static createThreadStateUpdateFingerprint ({
    channelId,
    nonce,
    partyA,
    partyB,
    ethBalanceA,
    ethBalanceB,
    tokenBalanceA,
    tokenBalanceB
  }) {
    const methodName = 'createThreadStateUpdateFingerprint'
    // typecast balances incase chained
    const isPositiveBnString = { presence: true, isPositiveBnString: true }
    Connext.validatorsResponseToError(
      validate.single(ethBalanceA, isPositiveBnString),
      methodName,
      'ethBalanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(ethBalanceB, isPositiveBnString),
      methodName,
      'ethBalanceB'
    )
    Connext.validatorsResponseToError(
      validate.single(tokenBalanceA, isPositiveBnString),
      methodName,
      'tokenBalanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(tokenBalanceB, isPositiveBnString),
      methodName,
      'tokenBalanceB'
    )
    ethBalanceA = Web3.utils.toBN(ethBalanceA)
    ethBalanceB = Web3.utils.toBN(ethBalanceB)
    tokenBalanceA = Web3.utils.toBN(tokenBalanceA)
    tokenBalanceB = Web3.utils.toBN(tokenBalanceB)
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )

    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )

    const hubBondEth = ethBalanceA.add(ethBalanceB)
    const hubBondToken = tokenBalanceA.add(tokenBalanceB)

    // generate state update to sign
    const hash = Web3.utils.soliditySha3(
      { type: 'bytes32', value: channelId },
      { type: 'uint256', value: nonce },
      { type: 'address', value: partyA },
      { type: 'address', value: partyB },
      { type: 'uint256', value: hubBondEth },
      { type: 'uint256', value: hubBondToken },
      { type: 'uint256', value: ethBalanceA },
      { type: 'uint256', value: ethBalanceB },
      { type: 'uint256', value: tokenBalanceA },
      { type: 'uint256', value: tokenBalanceB }
    )
    return hash
  }

  /**
   * Recovers the signer from the hashed data generated by the Connext.createThreadStateUpdateFingerprint function.
   *
   * @param {Object} params - the method object
   * @param {String} params.sig - signature of the data created in Connext.createThreadStateUpdate
   * @param {String} params.channelId - ID of the virtual channel you are creating a state update for
   * @param {Number} params.nonce - the sequence of the state update
   * @param {String} params.partyA - ETH address of partyA
   * @param {String} params.partyB - ETH address of partyB
   * @param {Number} params.balanceA - updated balance of partyA
   * @param {Number} params.balanceB - updated balance of partyB
   * @returns {String} ETH address of the person who signed the data
   */
  static recoverSignerFromThreadStateUpdate ({
    sig,
    channelId,
    nonce,
    partyA,
    partyB,
    ethBalanceA,
    ethBalanceB,
    tokenBalanceA,
    tokenBalanceB
  }) {
    const methodName = 'recoverSignerFromThreadStateUpdate'
    // validate
    // typecast balances incase chained
    const isPositiveBnString = { presence: true, isPositiveBnString: true }
    Connext.validatorsResponseToError(
      validate.single(ethBalanceA, isPositiveBnString),
      methodName,
      'ethBalanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(ethBalanceB, isPositiveBnString),
      methodName,
      'ethBalanceB'
    )
    Connext.validatorsResponseToError(
      validate.single(tokenBalanceA, isPositiveBnString),
      methodName,
      'tokenBalanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(tokenBalanceB, isPositiveBnString),
      methodName,
      'tokenBalanceB'
    )
    ethBalanceA = Web3.utils.toBN(ethBalanceA)
    ethBalanceB = Web3.utils.toBN(ethBalanceB)
    tokenBalanceA = Web3.utils.toBN(tokenBalanceA)
    tokenBalanceB = Web3.utils.toBN(tokenBalanceB)
    // validatorOpts'
    const isHex = { presence: true, isHex: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }

    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )

    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )

    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )

    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )

    console.log('recovering signer from:', JSON.stringify({
      sig,
      channelId,
      nonce,
      partyA,
      partyB,
      ethBalanceA: ethBalanceA.toString(),
      ethBalanceB: ethBalanceB.toString(),
      tokenBalanceA: tokenBalanceA.toString(),
      tokenBalanceB: tokenBalanceB.toString()
    }))
    let fingerprint = Connext.createThreadStateUpdateFingerprint({
      channelId,
      nonce,
      partyA,
      partyB,
      ethBalanceA,
      ethBalanceB,
      tokenBalanceA,
      tokenBalanceB
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
    console.log('recovered:', addr)

    return addr
  }

  // ***************************************
  // ********** SIGNATURE METHODS **********
  // ***************************************

  // /**
  //  * Generates a signed ledger channel state update.
  //  *
  //  * @param {Object} params - the method object
  //  * @param {Boolean} params.isClose - (optional) flag indicating whether or not this is closing state, defaults to false
  //  * @param {String} params.channelId - ID of the ledger channel you are creating a state update for
  //  * @param {Number} params.nonce - the sequence of the ledger channel update
  //  * @param {Number} params.openVcs - the number of open virtual channels associated with this ledger channel
  //  * @param {String} params.vcRootHash - the root hash of the Merkle tree containing all initial states of the open virtual channels
  //  * @param {String} params.partyA - ETH address of partyA in the ledgerchannel
  //  * @param {String} params.partyI - (optional) ETH address of the hub, defaults to this.ingridAddress
  //  * @param {Number} params.balanceA - updated balance of partyA
  //  * @param {Number} params.balanceI - updated balance of partyI
  //  * @param {Boolean} params.unlockedAccountPresent - (optional) whether to use sign or personal sign, defaults to false if in prod and true if in dev
  //  * @param {String} params.signer - (optional) ETH address of person signing data, defaults to account[0]
  //  * @returns {String} signature of signer on data provided
  //  */
  async createChannelStateUpdate ({
    isClose = false, // default isnt close LC
    channelId,
    nonce,
    openVcs,
    vcRootHash,
    partyA,
    partyI = this.ingridAddress, // default to ingrid
    balanceA,
    balanceI,
    unlockedAccountPresent = process.env.DEV ? process.env.DEV : false, // true if hub or ingrid, dev needs unsigned
    signer = null,
    hubEthBond = null,
    hubTokenBond = null,
  }) {
    const methodName = 'createChannelStateUpdate'
    // validate
    // validatorOpts
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBool = { presence: true, isBool: true }
    const isValidDepositObject = { presence: true, isValidDepositObject: true }

    Connext.validatorsResponseToError(
      validate.single(isClose, isBool),
      methodName,
      'isClose'
    )
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(openVcs, isPositiveInt),
      methodName,
      'openVcs'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyI, isAddress),
      methodName,
      'partyI'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isValidDepositObject),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isValidDepositObject),
      methodName,
      'balanceI'
    )
    if (hubEthBond) {
      Connext.validatorsResponseToError(
        validate.single(hubEthBond, isBN),
        methodName,
        'hubEthBond'
      )
    } else {
      hubEthBond = Web3.utils.toBN('0')
    }
    if (hubTokenBond) {
      Connext.validatorsResponseToError(
        validate.single(hubTokenBond, isBN),
        methodName,
        'hubTokenBond'
      )
    } else {
      hubTokenBond = Web3.utils.toBN('0')
    }
    if (signer) {
      Connext.validatorsResponseToError(
        validate.single(signer, isAddress),
        methodName,
        'signer'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      signer = accounts[0].toLowerCase()
    }
    // signer must be in lc
    if (
      signer.toLowerCase() !== partyA.toLowerCase() &&
      signer.toLowerCase() !== partyI.toLowerCase()
    ) {
      throw new LCUpdateError(methodName, 'Invalid signer detected')
    }

    // validate update
    const emptyRootHash = Connext.generateThreadRootHash({ threadInitialStates: [] })
    const channel = await this.getLcById(channelId)
    let proposedEthBalance, proposedTokenBalance
    if (channel == null) {
      // set initial balances to 0 if thread does not exist
      channel.ethBalanceA = '0'
      channel.ethBalanceB = '0'
      channel.tokenBalanceA = '0'
      channel.tokenBalanceB = '0'
      // generating opening cert
      if (nonce !== 0) {
        throw new LCOpenError(methodName, 'Invalid nonce detected')
      }
      if (openVcs !== 0) {
        throw new LCOpenError(methodName, 'Invalid openVcs detected')
      }
      if (vcRootHash !== emptyRootHash) {
        throw new LCOpenError(methodName, 'Invalid vcRootHash detected')
      }
      if (partyA === partyI) {
        throw new LCOpenError(methodName, 'Cannot open channel with yourself')
      }
      if (balanceA.ethDeposit && balanceI.ethDeposit) {
        // channel includes ETH
        proposedEthBalance = balanceA.ethDeposit.add(balanceI.ethDeposit)
      }
      if (balanceA.tokenDeposit && balanceI.tokenDeposit) {
        // channel includes token
        proposedTokenBalance = balanceA.tokenDeposit.add(balanceI.tokenDeposit)
      }
    } else {
      // updating existing lc
      // must be open
      if (CHANNEL_STATES[channel.state] === 3) {
        throw new LCUpdateError(
          methodName,
          'Channel is in invalid state to accept updates'
        )
      }
      // nonce always increasing
      if (nonce < channel.nonce) {
        throw new LCUpdateError(methodName, 'Invalid nonce')
      }
      // only open/close 1 vc per update, or dont open any
      if (
        Math.abs(Number(openVcs) - Number(channel.openVcs)) !== 1 &&
        Math.abs(Number(openVcs) - Number(channel.openVcs)) !== 0
      ) {
        throw new LCUpdateError(
          methodName,
          'Invalid number of openVcs proposed'
        )
      }
      // parties cant change
      if (partyA.toLowerCase() !== channel.partyA.toLowerCase() || partyI.toLowerCase() !== channel.partyI.toLowerCase()) {
        throw new LCUpdateError(methodName, 'Invalid channel parties')
      }
      if (balanceA.ethDeposit && balanceI.ethDeposit) {
        // channel includes ETH
        proposedEthBalance = balanceA.ethDeposit.add(balanceI.ethDeposit)
      }
      if (balanceA.tokenDeposit && balanceI.tokenDeposit) {
        // channel includes token
        proposedTokenBalance = balanceA.tokenDeposit.add(balanceI.tokenDeposit)
      }
      // no change in total balance
      // add ledger channel balances of both parties from previously, subctract new balance of vc being opened
      let isOpeningVc = openVcs - channel.openVcs === 1
      // verify updates dont change channel balance
      const ethChannelBalance = isOpeningVc ? Web3.utils.toBN(channel.ethBalanceA).add(Web3.utils.toBN(channel.ethBalanceI)).sub(hubEthBond) : Web3.utils.toBN(channel.ethBalanceA).add(Web3.utils.toBN(channel.ethBalanceI)).add(hubEthBond)
      const tokenChannelBalance = isOpeningVc ? Web3.utils.toBN(channel.tokenBalanceA).add(Web3.utils.toBN(channel.tokenBalanceI)).sub(hubTokenBond) : Web3.utils.toBN(channel.tokenBalanceA).add(Web3.utils.toBN(channel.tokenBalanceI)).add(hubTokenBond)

      if (proposedEthBalance && !proposedEthBalance.eq(ethChannelBalance)) {
        throw new LCUpdateError(methodName, 'Invalid ETH balance proposed')
      }
      if (proposedTokenBalance && !proposedTokenBalance.eq(tokenChannelBalance)) {
        throw new LCUpdateError(methodName, 'Invalid token balance proposed')
      }
    }

    console.log('signing:', JSON.stringify({
      isClose,
      channelId,
      nonce,
      openVcs,
      vcRootHash,
      partyA,
      partyI,
      ethBalanceA: proposedEthBalance ? balanceA.ethDeposit.toString() : '0',
      ethBalanceI: proposedEthBalance ? balanceI.ethDeposit.toString() : '0',
      tokenBalanceA: proposedTokenBalance ? balanceA.tokenDeposit.toString() : '0',
      tokenBalanceI: proposedTokenBalance ? balanceI.tokenDeposit.toString() : '0',
    }))
    // generate sig
    const hash = Connext.createChannelStateUpdateFingerprint({
      channelId,
      isClose,
      nonce,
      openVcs,
      vcRootHash,
      partyA,
      partyI,
      ethBalanceA: proposedEthBalance ? balanceA.ethDeposit : Web3.utils.toBN('0'),
      ethBalanceI: proposedEthBalance ? balanceI.ethDeposit : Web3.utils.toBN('0'),
      tokenBalanceA: proposedTokenBalance ? balanceA.tokenDeposit : Web3.utils.toBN('0'),
      tokenBalanceI: proposedTokenBalance ? balanceI.tokenDeposit : Web3.utils.toBN('0'),
    })
    let sig
    if (unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, signer)
    } else {
      sig = await this.web3.eth.personal.sign(hash, signer)
    }
    console.log('sig:', sig)
    return sig
  }

  // /**
  //  * Creates a signed virtual channel state update
  //  *
  //  * @param {Object} params - the method object
  //  * @param {String} params.channelId - ID of the virtual channel you are creating a state update for
  //  * @param {Number} params.nonce - the sequence of the state update
  //  * @param {String} params.partyA - ETH address of partyA
  //  * @param {String} params.partyB - ETH address of partyB
  //  * @param {Number} params.balanceA - updated balance of partyA
  //  * @param {Number} params.balanceB - updated balance of partyB
  //  * @param {Boolean} params.unlockedAccountPresent - (optional) whether to use sign or personal sign, defaults to false if in prod and true if in dev
  //  * @param {String} params.signer - (optional) ETH address of person signing data, defaults to account[0]
  //  * @returns {String} signature of signer on data provided
  //  */
  async createThreadStateUpdate ({
    channelId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB,
    updateType,
    unlockedAccountPresent = process.env.DEV ? process.env.DEV : false,
    signer = null // if true, use sign over personal.sign. dev needs true
  }) {
    // validate
    const methodName = 'createThreadStateUpdate'
    // validate
    // validatorOpts'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isValidDepositObject = { presence: true, isValidDepositObject: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isValidDepositObject),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isValidDepositObject),
      methodName,
      'balanceB'
    )
    // verify subchannel
    const subchanA = await this.getLcByPartyA(partyA)

    // verify channel state update
    let thread = await this.getThreadById(channelId)
    let proposedEthBalance, proposedTokenBalance
    if (thread === null) {
      // set initial balances to 0 if thread does not exist
      thread.ethBalanceA = '0'
      thread.ethBalanceB = '0'
      thread.tokenBalanceA = '0'
      thread.tokenBalanceB = '0'
      // channel does not exist, generating opening state
      if (nonce !== 0) {
        throw new VCOpenError(methodName, 'Invalid nonce detected')
      }
      if (balanceB.ethDeposit && !balanceB.ethDeposit.isZero()) {
        throw new VCOpenError(methodName, 'Invalid initial ETH balanceB detected')
      }
      if (balanceB.tokenDeposit && !balanceB.tokenDeposit.isZero()) {
        throw new VCOpenError(methodName, 'Invalid initial token balanceB detected')
      }
      if (partyA.toLowerCase() === partyB.toLowerCase()) {
        throw new VCOpenError(methodName, 'Cannot open thread with yourself')
      }
      if (balanceA.ethDeposit) { // update includes eth
         if(Web3.utils.toBN(subchanA.ethBalanceA).lt(balanceA.ethDeposit)) {
          throw new VCOpenError(methodName, 'Insufficient ETH channel balance detected')
        }
        proposedEthBalance = balanceA.ethDeposit        
      }
      if (balanceA.tokenDeposit) {
        if (Web3.utils.toBN(subchanA.tokenBalanceA).lt(balanceA.tokenDeposit)) {
         throw new VCOpenError(methodName, 'Insufficient ETH channel balance detected')
        }
        proposedTokenBalance = balanceA.tokenDeposit
      }
    } else {
      // thread exists
      if (THREAD_STATES[thread.state] === 3) {
        throw new VCUpdateError(methodName, 'Thread is in invalid state')
      }
      if (nonce < thread.nonce + 1 && nonce !== 0) {
        // could be joining
        throw new VCUpdateError(methodName, 'Invalid nonce')
      }
      if (
        partyA.toLowerCase() !== thread.partyA ||
        partyB.toLowerCase() !== thread.partyB
      ) {
        throw new VCUpdateError(methodName, 'Invalid parties detected')
      }
      // verify updates dont change channel balance
      const threadEthBalance = Web3.utils.toBN(thread.ethBalanceA).add(Web3.utils.toBN(thread.ethBalanceB))
      const threadTokenBalance = Web3.utils.toBN(thread.tokenBalanceA).add(Web3.utils.toBN(thread.tokenBalanceB))
      switch (CHANNEL_TYPES[updateType]) {
        case CHANNEL_TYPES.ETH:
          if (balanceB.ethDeposit.lt(Web3.utils.toBN(thread.ethBalanceB))) {
            throw new VCUpdateError(methodName, 'Thread updates can only increase partyB ETH balance')
          }
          proposedEthBalance = Web3.utils.toBN(balanceA.ethDeposit).add(balanceB.ethDeposit) // proposed balance
          break
        
        case CHANNEL_TYPES.TOKEN:
          if (balanceB.tokenDeposit.lt(Web3.utils.toBN(thread.tokenBalanceB))) {
            throw new VCUpdateError(methodName, 'Thread updates can only increase partyB token balance')
          }
          proposedTokenBalance = Web3.utils.toBN(balanceA.tokenDeposit).add(balanceB.tokenDeposit)
          break
        
        case CHANNEL_TYPES.TOKEN_ETH:
          if (balanceB.ethDeposit.lt(Web3.utils.toBN(thread.ethBalanceB))) {
            throw new VCUpdateError(methodName, 'Thread updates can only increase partyB ETH balance')
          }
          if (balanceB.tokenDeposit.lt(Web3.utils.toBN(thread.tokenBalanceB))) {
            throw new VCUpdateError(methodName, 'Thread updates can only increase partyB token balance')
          }
          proposedEthBalance = Web3.utils.toBN(balanceA.ethDeposit).add(balanceB.ethDeposit)
          proposedTokenBalance = Web3.utils.toBN(balanceA.tokenDeposit).add(balanceB.tokenDeposit)
          break
        default:
          throw new VCUpdateError(methodName, 'Invalid thread update type.')
      }
      if (proposedEthBalance && !proposedEthBalance.eq(threadEthBalance)) {
        throw new VCUpdateError(methodName, 'Thread ETH balance cannot change')
      }
  
      if (proposedTokenBalance && !proposedTokenBalance.eq(threadTokenBalance)) {
        throw new VCUpdateError(methodName, 'Thread token balance cannot change')
      }
    }

    // get accounts
    const accounts = await this.web3.eth.getAccounts()
    // generate and sign hash
    const state = {
      channelId,
      nonce,
      partyA,
      partyB,
      ethBalanceA: proposedEthBalance ? balanceA.ethDeposit : Web3.utils.toBN(thread.ethBalanceA),
      ethBalanceB: proposedEthBalance ? balanceB.ethDeposit : Web3.utils.toBN(thread.ethBalanceB),
      tokenBalanceA: proposedTokenBalance ? balanceA.tokenDeposit : Web3.utils.toBN(thread.tokenBalanceA),
      tokenBalanceB: proposedTokenBalance ? balanceB.tokenDeposit : Web3.utils.toBN(thread.tokenBalanceB),
    }
    const hash = Connext.createThreadStateUpdateFingerprint(state)
    console.log('signing:', JSON.stringify({
      channelId,
      nonce,
      partyA,
      partyB,
      ethBalanceA: proposedEthBalance ? balanceA.ethDeposit.toString() : Web3.utils.toBN(thread.ethBalanceA).toString(),
      ethBalanceB: proposedEthBalance ? balanceB.ethDeposit.toString() : Web3.utils.toBN(thread.ethBalanceB).toString(),
      tokenBalanceA: proposedTokenBalance ? balanceA.tokenDeposit.toString() : Web3.utils.toBN(thread.tokenBalanceA).toString(),
      tokenBalanceB: proposedTokenBalance ? balanceB.tokenDeposit.toString() : Web3.utils.toBN(thread.tokenBalanceB).toString(),
    }))
    let sig
    if (signer && unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, signer)
    } else if (signer) {
      sig = await this.web3.eth.personal.sign(hash, signer)
    } else if (unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, accounts[0])
    } else {
      sig = await this.web3.eth.personal.sign(hash, accounts[0])
    }
    console.log('sig:', sig)
    return sig
  }

  // vc0 is array of all existing vc0 sigs for open vcs
  static generateThreadRootHash ({ threadInitialStates }) {
    const methodName = 'generateThreadRootHash'
    const isArray = { presence: true, isArray: true }
    Connext.validatorsResponseToError(
      validate.single(threadInitialStates, isArray),
      methodName,
      'threadInitialStates'
    )
    const emptyRootHash =
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    let threadRootHash
    if (threadInitialStates.length === 0) {
      // reset to initial value -- no open VCs
      threadRootHash = emptyRootHash
    } else {
      const merkle = Connext.generateMerkleTree(threadInitialStates)
      threadRootHash = Utils.bufferToHex(merkle.getRoot())
    }

    return threadRootHash
  }

  static generateMerkleTree (threadInitialStates) {
    const methodName = 'generateMerkleTree'
    const isArray = { presence: true, isArray: true }
    Connext.validatorsResponseToError(
      validate.single(threadInitialStates, isArray),
      methodName,
      'threadInitialStates'
    )
    if (threadInitialStates.length === 0) {
      throw new Error('Cannot create a Merkle tree with 0 leaves.')
    }
    const emptyRootHash =
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    let merkle
    let elems = threadInitialStates.map(threadInitialState => {
      // vc0 is the initial state of each vc
      // hash each initial state and convert hash to buffer
      const hash = Connext.createThreadStateUpdateFingerprint(threadInitialState)
      const vcBuf = Utils.hexToBuffer(hash)
      return vcBuf
    })
    if (elems.length % 2 !== 0) {
      // cant have odd number of leaves
      elems.push(Utils.hexToBuffer(emptyRootHash))
    }
    merkle = new MerkleTree.default(elems)

    return merkle
  }

  // HELPER FUNCTIONS

  // ***************************************
  // ******** CONTRACT HANDLERS ************
  // ***************************************

  async createChannelContractHandler ({
    ingridAddress = this.ingridAddress,
    channelId,
    initialDeposits,
    challenge,
    channelType,
    tokenAddress = null,
    sender = null
  }) {
    const methodName = 'createChannelContractHandler'
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isValidDepositObject = { presence: true, isValidDepositObject: true}
    Connext.validatorsResponseToError(
      validate.single(ingridAddress, isAddress),
      methodName,
      'ingridAddress'
    )
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(initialDeposits, isValidDepositObject),
      methodName,
      'initialDeposits'
    )
    Connext.validatorsResponseToError(
      validate.single(challenge, isPositiveInt),
      methodName,
      'challenge'
    )
    if (tokenAddress) {
      Connext.validatorsResponseToError(
        validate.single(tokenAddress, isAddress),
        methodName,
        'tokenAddress'
      )
    } 
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }

    // verify partyA !== partyI
    if (sender === ingridAddress) {
      throw new LCOpenError(methodName, 'Cannot open a channel with yourself')
    }

    let result, token, tokenApproval
    switch (CHANNEL_TYPES[channelType]) {
      case CHANNEL_TYPES.ETH: // ETH
        tokenAddress = '0x0'
        result = await this.channelManagerInstance.methods
          .createChannel(
            channelId, 
            ingridAddress, 
            challenge, 
            tokenAddress, 
            [initialDeposits.ethDeposit, Web3.utils.toBN('0')]
          )
          .send({
            from: sender,
            value: initialDeposits.ethDeposit,
            gas: 750000
          })
        break
      case CHANNEL_TYPES.TOKEN: // TOKEN
        // approve token transfer
        token = new this.web3.eth.Contract(tokenAbi, tokenAddress)
        tokenApproval = await token.methods.approve(ingridAddress, initialDeposits.tokenDeposit).send( {
          from: sender,
          gas: 750000
        })
        if (tokenApproval) {
          result = await this.channelManagerInstance.methods
          .createChannel(
            channelId, 
            ingridAddress, 
            challenge, 
            tokenAddress, 
            [Web3.utils.toBN('0'), initialDeposits.tokenDeposit]
          )
          .send({
            from: sender,
            gas: 750000
          })
        } else {
          throw new LCOpenError(methodName, 'Token transfer failed.')
        }
        break
      case CHANNEL_TYPES.TOKEN_ETH: // ETH/TOKEN
        // approve token transfer
        token = new this.web3.eth.Contract(tokenAbi, tokenAddress)
        tokenApproval = await token.approve.call(ingridAddress, initialDeposits.tokenDeposit, {
          from: sender
        })
        if (tokenApproval) {
          result = await this.channelManagerInstance.methods
            .createChannel(
              channelId, 
              ingridAddress, 
              challenge, 
              tokenAddress, 
              [initialDeposits.ethDeposit, initialDeposits.tokenDeposit]
            )
            .send({
              from: sender,
              value: initialDeposits.ethDeposit,
              gas: 750000
          })
        } else {
          throw new LCOpenError(methodName, 'Token transfer failed.')
        }
        break
      default:
        throw new LCOpenError(methodName, 'Invalid channel type')
    }

    if (!result.transactionHash) {
      throw new ContractError(
        methodName,
        301,
        'Transaction failed to broadcast'
      )
    }

    if (!result.blockNumber) {
      throw new ContractError(
        methodName,
        302,
        result.transactionHash,
        'Transaction failed'
      )
    }

    return result
  }

  /**
   * Watchers or users should call this to recover bonded funds if Ingrid fails to join the ledger channel within the challenge window.
   *
   * @param {String} lcId - ledger channel id the hub did not join
   * @param {String} sender - (optional) who is calling the transaction (defaults to accounts[0])
   * @returns {Promise} resolves to the result of sending the transaction
   */
  async LCOpenTimeoutContractHandler (lcId, sender = null) {
    const methodName = 'LCOpenTimeoutContractHandler'
    // validate
    const isAddress = { presence: true, isAddress: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }
    // verify requires
    const lc = await this.getLcById(lcId)
    if (CHANNEL_STATES[lc.state] !== 0) {
      throw new LCOpenError(methodName, 'Channel is in incorrect state')
    }

    if (lc.partyA !== sender) {
      throw new ContractError(
        methodName,
        'Caller must be partyA in ledger channel'
      )
    }

    // TO DO: THROW ERROR IF NOT CORRECT TIME
    // NO WAY TO GET CLOSE TIME
    // if (Date.now() > lc.LCOpenTimeout) {
    //   throw new ContractError(methodName, 'Channel challenge period still active')
    // }

    const result = await this.channelManagerInstance.methods
      .LCOpenTimeout(lcId)
      .send({
        from: sender,
        gas: 470000
      })

    if (!result.transactionHash) {
      throw new ContractError(
        methodName,
        301,
        'Transaction failed to broadcast'
      )
    }

    if (!result.blockNumber) {
      throw new ContractError(
        methodName,
        302,
        result.transactionHash,
        'Transaction failed'
      )
    }

    return result
  }

  async depositContractHandler ({
    channelId,
    deposits,
    sender = null,
    recipient = sender,
    tokenAddress = null // for testing, otherwise get from channel
  }) {
    const methodName = 'depositContractHandler'
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isValidDepositObject = { presence: true, isValidDepositObject: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(deposits, isValidDepositObject),
      methodName,
      'deposits'
    )
    const accounts = await this.web3.eth.getAccounts()
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      sender = accounts[0].toLowerCase()
    }
    if (recipient) {
      Connext.validatorsResponseToError(
        validate.single(recipient, isAddress),
        methodName,
        'recipient'
      )
    } else {
      // unspecified, defaults to active account
      recipient = sender
    }

    // verify requires --> already checked in deposit() fn, necessary?
    const channel = await this.getLcById(channelId)
    if (CHANNEL_STATES[channel.state] !== CHANNEL_STATES.LCS_OPENED) {
      throw new ContractError(methodName, 'Channel is not open')
    }
    if (
      recipient.toLowerCase() !== channel.partyA.toLowerCase() &&
      recipient.toLowerCase() !== channel.partyI.toLowerCase()
    ) {
      throw new ContractError(
        methodName,
        'Recipient is not a member of the ledger channel'
      )
    }

    // determine deposit type
    const { ethDeposit, tokenDeposit } = deposits
    let depositType
    if (ethDeposit && tokenDeposit) {
      // token and eth
      tokenAddress = tokenAddress ? tokenAddress : channel.tokenAddress
      depositType = Object.keys(CHANNEL_TYPES)[2]
    } else if (tokenDeposit) {
      tokenAddress = tokenAddress ? tokenAddress : channel.tokenAddress
      depositType = Object.keys(CHANNEL_TYPES)[1]
    } else if (ethDeposit) {
      depositType = Object.keys(CHANNEL_TYPES)[0]
    }

    let result, token, tokenApproval
    switch (CHANNEL_TYPES[depositType]) {
      case CHANNEL_TYPES.ETH:
        // call contract method
        result = await this.channelManagerInstance.methods
        .deposit(
          channelId, // PARAM NOT IN CONTRACT YET, SHOULD BE
          recipient,
          [deposits.ethDeposit, 0],
          false
        )
        .send({
          from: sender,
          value: deposits.ethDeposit,
          gas: 1000000,
        })
        break
      case CHANNEL_TYPES.TOKEN:
        // approve transfer
        token = new this.web3.eth.Contract(tokenAbi, tokenAddress)
        tokenApproval = await token.methods.approve(this.ingridAddress, deposits.tokenDeposit).send({
          from: sender,
          gas: 750000
        })
        if (tokenApproval) {
          result = await this.channelManagerInstance.methods
            .deposit(
              channelId, // PARAM NOT IN CONTRACT YET, SHOULD BE
              recipient,
              [0, deposits.tokenDeposit],
              false
            )
            .send({
              from: sender,
              gas: 1000000,
            })
        }
        break
      case CHANNEL_TYPES.TOKEN_ETH:
        // approve transfer
        token = new this.web3.eth.Contract(tokenAbi, tokenAddress)
        tokenApproval = await token.methods.approve(this.ingridAddress, deposits.tokenDeposit).send({
          from: sender,
          gas: 750000
        })
        if (tokenApproval) {
          result = await this.channelManagerInstance.methods
            .deposit(
              channelId, // PARAM NOT IN CONTRACT YET, SHOULD BE
              recipient,
              [deposits.ethDeposit, deposits.tokenDeposit],
              false
            )
            .send({
              from: sender,
              value: deposits.ethDeposit,
              gas: 1000000,
            })
        }
        break
      default:
        throw new LCUpdateError(methodName, `Invalid deposit type detected`)
    }

    if (!result.transactionHash) {
      throw new ContractError(
        methodName,
        301,
        'Transaction failed to broadcast'
      )
    }

    if (!result.blockNumber) {
      throw new ContractError(
        methodName,
        302,
        result.transactionHash,
        'Transaction failed'
      )
    }
    return result
  }

  async consensusCloseChannelContractHandler ({
    channelId,
    nonce,
    balanceA,
    balanceI,
    sigA,
    sigI,
    sender = null
  }) {
    const methodName = 'consensusCloseChannelContractHandler'
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isValidDepositObject = { presence: true, isValidDepositObject: true }
    const isHex = { presence: true, isHex: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isValidDepositObject),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isValidDepositObject),
      methodName,
      'balanceI'
    )
    Connext.validatorsResponseToError(
      validate.single(sigA, isHex),
      methodName,
      'sigA'
    )
    Connext.validatorsResponseToError(
      validate.single(sigI, isHex),
      methodName,
      'sigI'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }
    // verify sigs
    const emptyRootHash = Connext.generateThreadRootHash({ threadInitialStates: [] })
    let state = {
      sig: sigI,
      isClose: true,
      channelId,
      nonce,
      openVcs: 0,
      vcRootHash: emptyRootHash,
      partyA: sender,
      partyI: this.ingridAddress,
      ethBalanceA: balanceA.ethDeposit ? balanceA.ethDeposit : Web3.utils.toBN('0'),
      ethBalanceI: balanceI.ethDeposit ? balanceI.ethDeposit : Web3.utils.toBN('0'),
      tokenBalanceA: balanceA.tokenDeposit ? balanceA.tokenDeposit : Web3.utils.toBN('0'),
      tokenBalanceI: balanceA.tokenDeposit ? balanceI.tokenDeposit : Web3.utils.toBN('0'),
    }
    let signer = Connext.recoverSignerFromChannelStateUpdate(state)
    if (signer.toLowerCase() !== this.ingridAddress.toLowerCase()) {
      throw new LCCloseError(methodName, 'Hub did not sign closing update')
    }
    state.sig = sigA
    signer = Connext.recoverSignerFromChannelStateUpdate(state)
    if (signer.toLowerCase() !== sender.toLowerCase()) {
      throw new LCCloseError(methodName, 'PartyA did not sign closing update')
    }

    const result = await this.channelManagerInstance.methods
      .consensusCloseChannel(
        channelId, 
        nonce, 
        [ state.ethBalanceA, state.ethBalanceI, state.tokenDepositA, state.tokenDepositI ], 
        sigA, 
        sigI)
      .send({
        from: sender,
        gas: 1000000
      })

    if (!result.transactionHash) {
      throw new ContractError(
        methodName,
        301,
        'Transaction failed to broadcast'
      )
    }

    if (!result.blockNumber) {
      throw new ContractError(
        methodName,
        302,
        result.transactionHash,
        'Transaction failed'
      )
    }

    return result
  }

  // default null means join with 0 deposit
  async joinLedgerChannelContractHandler ({
    lcId,
    deposit = null,
    sender = null
  }) {
    const methodName = 'joinLedgerChannelContractHandler'
    const isAddress = { presence: true, isAddress: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    if (deposit) {
      Connext.validatorsResponseToError(
        validate.single(deposit, isBN),
        methodName,
        'deposit'
      )
      if (deposit.isNeg()) {
        throw new LCOpenError(methodName, 'Invalid deposit provided')
      }
    } else {
      deposit = Web3.utils.toBN('0')
    }
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    }
    const lc = await this.getLcById(lcId)
    if (!lc) {
      // hub does not have lc, may be chainsaw issues
      throw new LCOpenError(methodName, 'Channel is not registered with hub')
    }
    if (sender && sender.toLowerCase() === lc.partyA) {
      throw new LCOpenError(methodName, 'Cannot create channel with yourself')
    }

    if (sender && sender !== lc.partyI) {
      throw new LCOpenError(methodName, 'Incorrect channel counterparty')
    }

    if (CHANNEL_STATES[lc.state] !== 0) {
      throw new LCOpenError(methodName, 'Channel is not in correct state')
    }
    const result = await this.channelManagerInstance.methods
      .joinChannel(lcId)
      .send({
        from: sender || this.ingridAddress, // can also be accounts[0], easier for testing
        value: deposit,
        gas: 3000000 // FIX THIS, WHY HAPPEN, TRUFFLE CONFIG???
      })

    if (!result.transactionHash) {
      throw new ContractError(
        methodName,
        301,
        'Transaction failed to broadcast'
      )
    }

    if (!result.blockNumber) {
      throw new ContractError(
        methodName,
        302,
        result.transactionHash,
        'Transaction failed'
      )
    }
    return result
  }

  async updateChannelStateContractHandler ({
    channelId,
    nonce,
    openVcs,
    balanceA,
    balanceI,
    vcRootHash,
    sigA,
    sigI,
    sender = null
  }) {
    const methodName = 'updateChannelStateContractHandler'
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isValidDepositObject = { presence: true, isValidDepositObject: true }
    const isHex = { presence: true, isHex: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(openVcs, isPositiveInt),
      methodName,
      'openVcs'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isValidDepositObject),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isValidDepositObject),
      methodName,
      'balanceI'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )
    Connext.validatorsResponseToError(
      validate.single(sigA, isHex),
      methodName,
      'sigA'
    )
    Connext.validatorsResponseToError(
      validate.single(sigI, isHex),
      methodName,
      'sigI'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }

    const ethBalanceA = balanceA.ethDeposit ? balanceA.ethDeposit : Web3.utils.toBN('0')
    const ethBalanceI = balanceI.ethDeposit ? balanceI.ethDeposit : Web3.utils.toBN('0')

    const tokenBalanceA = balanceA.tokenDeposit ? balanceA.tokenDeposit : Web3.utils.toBN('0')
    const tokenBalanceI = balanceI.tokenDeposit ? balanceI.tokenDeposit : Web3.utils.toBN('0')

    const result = await this.channelManagerInstance.methods
      .updateLCstate(
        channelId,
        [nonce, openVcs, ethBalanceA, ethBalanceI, tokenBalanceA, tokenBalanceI],
        Web3.utils.padRight(vcRootHash, 64),
        sigA,
        sigI
      )
      .send({
        from: sender,
        gas: '6721975'
      })
    if (!result.transactionHash) {
      throw new ContractError(
        methodName,
        301,
        'Transaction failed to broadcast'
      )
    }

    if (!result.blockNumber) {
      throw new ContractError(
        methodName,
        302,
        result.transactionHash,
        'Transaction failed'
      )
    }
    return result
  }

  async initThreadContractHandler ({
    subchanId,
    threadId,
    proof = null,
    partyA,
    partyB,
    balanceA,
    sigA,
    sender = null
  }) {
    const methodName = 'initThreadContractHandler'
    // validate
    const isAddress = { presence: true, isAddress: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isValidDepositObject = { presence: true, isValidDepositObject: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(subchanId, isHexStrict),
      methodName,
      'subchanId'
    )
    Connext.validatorsResponseToError(
      validate.single(threadId, isHexStrict),
      methodName,
      'threadId'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isValidDepositObject),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(sigA, isHex),
      methodName,
      'sigA'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }
    const ethBalanceA = balanceA.ethDeposit ? balanceA.ethDeposit : Web3.utils.toBN('0')
    const tokenBalanceA = balanceA.tokenDeposit ? balanceA.tokenDeposit : Web3.utils.toBN('0')
    
    let merkle, stateHash
    if (proof === null) {
      // generate proof from lc
      stateHash = Connext.createThreadStateUpdateFingerprint({
        channelId: threadId,
        nonce: 0,
        partyA,
        partyB,
        ethBalanceA,
        ethBalanceB: Web3.utils.toBN('0'),
        tokenBalanceA,
        tokenBalanceB: Web3.utils.toBN('0'),
      })
      const threadInitialStates = await this.getVcInitialStates(subchanId)
      merkle = Connext.generateMerkleTree(threadInitialStates)
      let mproof = merkle.proof(Utils.hexToBuffer(stateHash))

      proof = []
      for (var i = 0; i < mproof.length; i++) {
        proof.push(Utils.bufferToHex(mproof[i]))
      }

      proof.unshift(stateHash)

      proof = Utils.marshallState(proof)
    }

    const results = await this.channelManagerInstance.methods
      .initVCstate(
        subchanId,
        threadId,
        proof,
        0,
        partyA,
        partyB,
        [ ethBalanceA, tokenBalanceA ],
        [ ethBalanceA, Web3.utils.toBN('0'), tokenBalanceA, Web3.utils.toBN('0')],
        sigA
      )
      // .estimateGas({
      //   from: sender,
      // })
      .send({
        from: sender,
        gas: 6721975
      })
    if (!results.transactionHash) {
      throw new Error(`[${methodName}] initVCState transaction failed.`)
    }
    if (!results.transactionHash) {
      throw new ContractError(
        methodName,
        301,
        'Transaction failed to broadcast'
      )
    }

    if (!results.blockNumber) {
      throw new ContractError(
        methodName,
        302,
        results.transactionHash,
        'Transaction failed'
      )
    }
    return results
  }

  async settleThreadContractHandler ({
    subchanId,
    threadId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB,
    sigA,
    sender = null
  }) {
    const methodName = 'settleThreadContractHandler'
    // validate
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isValidDepositObject = { presence: true, isValidDepositObject: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(subchanId, isHexStrict),
      methodName,
      'subchanId'
    )
    Connext.validatorsResponseToError(
      validate.single(threadId, isHexStrict),
      methodName,
      'threadId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isValidDepositObject),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isValidDepositObject),
      methodName,
      'balanceB'
    )
    Connext.validatorsResponseToError(
      validate.single(sigA, isHex),
      methodName,
      'sigA'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }

    const ethBalanceA = balanceA.ethDeposit ? balanceA.ethDeposit : Web3.utils.toBN('0')
    const ethBalanceB = balanceB.ethDeposit ? balanceB.ethDeposit : Web3.utils.toBN('0')

    const tokenBalanceA = balanceA.tokenDeposit ? balanceA.tokenDeposit : Web3.utils.toBN('0')
    const tokenBalanceB = balanceB.tokenDeposit ? balanceB.tokenDeposit : Web3.utils.toBN('0')

    const results = await this.channelManagerInstance.methods
      .settleVC(
        subchanId,
        threadId,
        nonce,
        partyA,
        partyB,
        [ethBalanceA, ethBalanceB, tokenBalanceA, tokenBalanceB],
        sigA
      )
      .send({
        from: sender,
        gas: 6721975
      })
    if (!results.transactionHash) {
      throw new ContractError(
        methodName,
        301,
        'Transaction failed to broadcast'
      )
    }

    if (!results.blockNumber) {
      throw new ContractError(
        methodName,
        302,
        results.transactionHash,
        'Transaction failed'
      )
    }
    return results
  }

  async closeVirtualChannelContractHandler ({ lcId, vcId, sender = null }) {
    const methodName = 'closeVirtualChannelContractHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }
    const results = await this.channelManagerInstance.methods
      .closeVirtualChannel(lcId, vcId)
      .send({
        from: sender
      })
    if (!results.transactionHash) {
      throw new ContractError(
        methodName,
        301,
        'Transaction failed to broadcast'
      )
    }

    if (!results.blockNumber) {
      throw new ContractError(
        methodName,
        302,
        results.transactionHash,
        'Transaction failed'
      )
    }
    return results
  }

  async byzantineCloseChannelContractHandler ({ lcId, sender = null }) {
    const methodName = 'byzantineCloseChannelContractHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    if (sender) {
      Connext.validatorsResponseToError(
        validate.single(sender, isAddress),
        methodName,
        'sender'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      sender = accounts[0].toLowerCase()
    }
    const results = await this.channelManagerInstance.methods
      .byzantineCloseChannel(lcId)
      .send({
        from: sender,
        gas: '470000'
      })
    if (!results.transactionHash) {
      throw new ContractError(
        methodName,
        301,
        'Transaction failed to broadcast'
      )
    }

    if (!results.blockNumber) {
      throw new ContractError(
        methodName,
        302,
        results.transactionHash,
        'Transaction failed'
      )
    }
    return results
  }

  // ***************************************
  // ********** ERROR HELPERS **************
  // ***************************************

  static validatorsResponseToError (validatorResponse, methodName, varName) {
    if (validatorResponse !== undefined) {
      throw new ParameterValidationError(methodName, varName, validatorResponse)
    }
  }

  // ***************************************
  // *********** INGRID GETTERS ************
  // ***************************************

  /**
   * Requests the unjoined virtual channels that have been initiated with you. All threads are unidirectional, and only the reciever of payments may have unjoined threads.
   *
   * @param {String} partyB - (optional) ETH address of party who has yet to join virtual channel threads.
   * @returns {Promise} resolves to an array of unjoined virtual channel objects
   */
  async getUnjoinedChannels (partyB = null) {
    const methodName = 'getUnjoinedChannels'
    const isAddress = { presence: true, isAddress: true }
    if (partyB) {
      Connext.validatorsResponseToError(
        validate.single(partyB, isAddress),
        methodName,
        'partyB'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      partyB = accounts[0].toLowerCase()
    }
    const response = await this.networking.get(
      `virtualchannel/address/${partyB.toLowerCase()}/opening`
    )
    return response.data
  }

  async getVcStateByNonce ({ vcId, nonce }) {
    const methodName = 'getVcStateByNonce'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    const response = await this.networking.get(
      `virtualchannel/${vcId}/update/nonce/${nonce}`
    )
    return response.data
  }

  async getLcStateByNonce ({ lcId, nonce }) {
    const methodName = 'getLcStateByNonce'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    const response = await this.networking.get(
      `ledgerchannel/${lcId}/update/nonce/${nonce}`
    )
    return response.data
  }

  async getLatestLedgerStateUpdate (ledgerChannelId, sigs = null) {
    // lcState == latest ingrid signed state
    const methodName = 'getLatestLedgerStateUpdate'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(ledgerChannelId, isHexStrict),
      methodName,
      'ledgerChannelId'
    )
    if (!sigs) {
      sigs = ['sigI', 'sigA']
    }

    const response = await this.networking.get(
      `ledgerchannel/${ledgerChannelId}/update/latest?sig[]=sigI`
    )
    return response.data
  }

  /**
   * Returns an array of the virtual channel states associated with the given ledger channel.
   *
   * @param {String} channelId - ID of the ledger channel
   * @returns {Promise} resolves to an Array of virtual channel objects
   */
  async getThreadsByChannelId (channelId) {
    // lcState == latest ingrid signed state
    const methodName = 'getThreadsByChannelId'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )

    const response = await this.networking.get(
      `ledgerchannel/${channelId}/vcs`
    )
    return response.data
  }

  /**
   * Returns the ledger channel id between the supplied address and ingrid.
   *
   * If no address is supplied, accounts[0] is used as partyA.
   *
   * @param {String} partyA - (optional) address of the partyA in the channel with Ingrid.
   * @param {Number} status - (optional) state of virtual channel, can be 0 (opening), 1 (opened), 2 (settling), or 3 (settled). Defaults to open channel.
   * @returns {Promise} resolves to either the ledger channel id between hub and supplied partyA, or an Array of the channel IDs between hub and partyA.
   */
  async getLcId (partyA = null, status = null) {
    const methodName = 'getLcId'
    const isAddress = { presence: true, isAddress: true }
    if (partyA) {
      Connext.validatorsResponseToError(
        validate.single(partyA, isAddress),
        methodName,
        'partyA'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      partyA = accounts[0].toLowerCase()
    }
    if (status !== null) {
      Connext.validatorsResponseToError(
        validate.single(status, isLcStatus),
        methodName,
        'status'
      )
    } else {
      status = Object.keys(CHANNEL_STATES)[1]
    }
    // get my LC with ingrid
    const response = await this.networking.get(
      `ledgerchannel/a/${partyA}?status=${status}`
    )
    if (status === Object.keys(CHANNEL_STATES)[1]) {
      // has list length of 1, return obj
      return response.data[0].channelId
    } else {
      return response.data.map(val => {
        return val.channelId
      })
    }
  }

  /**
   * Returns an object representing the virtual channel in the database.
   *
   * @param {String} threadId - the ID of the virtual channel
   * @returns {Promise} resolves to an object representing the virtual channel
   */
  async getThreadById (threadId) {
    const methodName = 'getThreadById'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(threadId, isHexStrict),
      methodName,
      'threadId'
    )
    try {
      const response = await this.networking.get(`virtualchannel/${threadId}`)
      return response.data
    } catch (e) {
      if (e.status === 400) {
        return null
      } else {
        throw e
      }
    }
  }

  /**
   * Returns an object representing the open virtual channel between the two parties in the database.
   *
   * @param {Object} params - the method object
   * @param {String} params.partyA - ETH address of partyA in virtual channel
   * @param {String} params.partyB - ETH address of partyB in virtual channel
   * @returns {Promise} resolves to the virtual channel
   */
  async getThreadByParties ({ partyA, partyB }) {
    const methodName = 'getThreadByParties'
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )
    let openResponse
    try {
      openResponse = await this.networking.get(
        `virtualchannel/a/${partyA.toLowerCase()}/b/${partyB.toLowerCase()}/open`
      )
      if (openResponse.data.length === 0) {
        openResponse = null
      } else {
        return openResponse.data
      }
    } catch (e) {
      if (e.status === 400) {
        // no open channel
        openResponse = null
      }
    }

    if (openResponse === null) {
      // channel between parties is opening
      try {
        openResponse = await this.networking.get(
          `virtualchannel/address/${partyA.toLowerCase()}/opening`
        )
        if (openResponse.data.length === 0) {
          openResponse = null
        } else {
          return openResponse.data
        }
      } catch (e) {
        if (e.status === 400) {
          // no open channel
          openResponse = null
        }
      }
    }
    return openResponse
  }

  async getOtherLcId (vcId) {
    const methodName = 'getOtherLcId'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    // get LC for other VC party and ingrid
    const vc = await this.getThreadById(vcId)
    return vc.subchanBI
  }

  /**
   * Returns an object representing a ledger channel.
   *
   * @param {String} lcId - the ledger channel id
   * @returns {Promise} resolves to the ledger channel object
   */
  async getLcById (lcId) {
    const methodName = 'getLcById'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    try {
      const res = await this.networking.get(`ledgerchannel/${lcId}`)

      return res.data
    } catch (e) {
      if (e.status === 404) {
        return null
      }
      throw e
    }
  }

  /**
   * Returns object representing the ledger channel between partyA and Ingrid
   *
   * @param {String} partyA - (optional) partyA in ledger channel. Default is accounts[0]
   * @param {Number} status - (optional) state of virtual channel, can be 0 (opening), 1 (opened), 2 (settling), or 3 (settled). Defaults to open channel.
   * @returns {Promise} resolves to ledger channel object
   */
  async getLcByPartyA (partyA = null, status = null) {
    const methodName = 'getLcByPartyA'
    const isLcStatus = { presence: true, isLcStatus: true }
    const isAddress = { presence: true, isAddress: true }
    if (partyA !== null) {
      Connext.validatorsResponseToError(
        validate.single(partyA, isAddress),
        methodName,
        'partyA'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      partyA = accounts[0]
    }
    if (status !== null) {
      Connext.validatorsResponseToError(
        validate.single(status, isLcStatus),
        methodName,
        'status'
      )
    } else {
      status = Object.keys(CHANNEL_STATES)[1]
    }

    const response = await this.networking.get(
      `ledgerchannel/a/${partyA.toLowerCase()}?status=${status}`
    )
    if (status === Object.keys(CHANNEL_STATES)[1]) {
      // has list length of 1, return obj
      return response.data[0]
    } else {
      return response.data
    }
  }

  async getChallengeTimer () {
    const response = await this.networking.get(`ledgerchannel/challenge`)
    return response.data.challenge
  }

  async getLatestThreadState (channelId) {
    // validate params
    const methodName = 'getLatestThreadState'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    const response = await this.networking.get(
      `virtualchannel/${channelId}/update/latest`
    )
    return response.data
  }

  async getVcInitialStates (lcId) {
    // validate params
    const methodName = 'getVcInitialStates'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    const response = await this.networking.get(
      `ledgerchannel/${lcId}/vcinitialstates`
    )
    return response.data
  }

  async getVcInitialState (vcId) {
    // validate params
    const methodName = 'getVcInitialState'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    const response = await this.networking.get(
      `virtualchannel/${vcId}/update/nonce/0`
    )
    return response.data
  }

  async getDecomposedChannelStates (threadId) {
    // validate params
    const methodName = 'getDecomposedChannelStates'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(threadId, isHexStrict),
      methodName,
      'threadId'
    )
    const response = await this.networking.get(
      `virtualchannel/${threadId}/decompose`
    )
    return response.data
  }

  // ***************************************
  // *********** INGRID HELPERS ************
  // ***************************************

  // requests ingrid deposits in a given subchan
  /**
   * Requests ingrid deposits into a given subchannel. Ingrid must have sufficient balance in the "B" subchannel to cover the virtual channel balance of "A" since Ingrid is assuming the financial counterparty risk.
   *
   * This function is to be used if the hub has insufficient balance in the ledger channel to create proposed virtual channels.
   *
   * @param {Object} params - the method object
   * @param {String} params.lcId - id of the ledger channel
   * @param {BN} params.deposit - the deposit in Wei
   * @returns {Promise} resolves to the transaction hash of Ingrid calling the deposit function
   */
  async requestIngridDeposit ({ lcId, deposit }) {
    const methodName = 'requestIngridDeposit'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(deposit, isBN),
      methodName,
      'isBN'
    )
    const accountBalance = await this.web3.eth.getBalance(this.ingridAddress)
    if (deposit.gt(Web3.utils.toBN(accountBalance))) {
      throw new LCUpdateError(
        methodName,
        'Hub does not have sufficient balance for requested deposit'
      )
    }
    const response = await this.networking.post(
      `ledgerchannel/${lcId}/requestdeposit`,
      {
        deposit: deposit.toString()
      }
    )
    return response.data.txHash
  }

  /**
   * Requests Ingrid joins the ledger channel after it has been created on chain. This function should be called after the register() returns the ledger channel ID of the created contract.
   *
   * May have to be called after a timeout period to ensure the transaction performed in register to create the channel on chain is properly mined.
   *
   * @example
   * // use register to create channel on chain
   * const deposit = Web3.utils.toBN(1000)
   * const lcId = await connext.register(deposit)
   * const response = await connext.requestJoinLc(lcId)
   *
   * @param {String} lcId - ID of the ledger channel you want the Hub to join
   * @returns {Promise} resolves to the transaction hash of Ingrid joining the channel
   */
  async requestJoinLc (lcId) {
    // validate params
    const methodName = 'requestJoinLc'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )

    // verify the channel exists on chain
    const lc = await this.channelManagerInstance.methods.Channels(lcId).call()
    // no partyA, channel not on chain
    if (lc.partyA === '0x0000000000000000000000000000000000000000') {
      throw new LCOpenError(methodName, 'Channel does not exist on chain.')
    }
    if (lc.partyI.toLowerCase() !== this.ingridAddress.toLowerCase()) {
      throw new LCOpenError(
        methodName,
        'Ingrid is not the counterparty of this channel.'
      )
    }
    if (Date.now() > lc.LCOpenTimeout) {
      throw new LCOpenError(
        methodName,
        'Ledger Channel open has timed out, call LCOpenTimeoutContractHandler'
      )
    }

    try {
      const response = await this.networking.post(
        `ledgerchannel/${lcId}/request`
      )
      return response.data.txHash
    } catch (e) {
      return null
    }
  }

  // ingrid verifies the threadInitialStates and sets up vc and countersigns lc updates
  async joinVcHandler ({ lcSig, vcSig, channelId }) {
    // validate params
    const methodName = 'joinVcHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(vcSig, isHex),
      methodName,
      'vcSig'
    )
    Connext.validatorsResponseToError(
      validate.single(lcSig, isHex),
      methodName,
      'lcSig'
    )
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    // ingrid should verify vcS0A and vcS0b
    const response = await this.networking.post(
      `virtualchannel/${channelId}/join`,
      {
        vcSig,
        lcSig
      }
    )
    return response.data.channelId
  }

  async fastCloseThreadHandler ({ sig, signer, channelId }) {
    // validate params
    const methodName = 'fastCloseThreadHandler'
    const isHex = { presence: true, isHex: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )
    Connext.validatorsResponseToError(
      validate.single(signer, isAddress),
      methodName,
      'signer'
    )
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )

    const response = await this.networking.post(
      `virtualchannel/${channelId}/close`,
      {
        sig,
        signer
      }
    )
    if (response.data.sigI) {
      return response.data.sigI
    } else {
      return false
    }
  }

  async fastCloseChannelHandler ({ sig, channelId }) {
    // validate params
    const methodName = 'fastCloseChannelHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    const response = await this.networking.post(
      `ledgerchannel/${channelId}/fastclose`,
      {
        sig
      }
    )
    return response.data
  }

  async createChannelUpdateOnThreadOpen ({ threadInitialState, channel, signer = null }) {
    const methodName = 'createChannelUpdateOnThreadOpen'
    const isThreadState = { presence: true, isThreadState: true }
    const isChannelObj = { presence: true, isChannelObj: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(threadInitialState, isThreadState),
      methodName,
      'threadInitialState'
    )
    Connext.validatorsResponseToError(
      validate.single(channel, isChannelObj),
      methodName,
      'channel'
    )
    if (signer) {
      Connext.validatorsResponseToError(
        validate.single(signer, isAddress),
        methodName,
        'signer'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      signer = accounts[0].toLowerCase()
    }
    // signer should always be lc partyA
    if (signer.toLowerCase() !== channel.partyA) {
      throw new VCOpenError(methodName, 'Invalid signer detected')
    }
    // signer should be threadInitialState partyA or threadInitialState partyB
    if (
      signer.toLowerCase() !== threadInitialState.partyA.toLowerCase() &&
      signer.toLowerCase() !== threadInitialState.partyB.toLowerCase()
    ) {
      throw new VCOpenError(methodName, 'Invalid signer detected')
    }
    // lc must be open
    if (CHANNEL_STATES[channel.state] !== 1) {
      throw new VCOpenError(methodName, 'Invalid subchannel state')
    }
    // vcId should be unique
    let thread = await this.getThreadById(threadInitialState.channelId)
    if (thread && THREAD_STATES[thread.state] !== 0) {
      throw new VCOpenError(methodName, 'Invalid channel id in threadInitialState')
    }
    // vc0 validation
    if (threadInitialState.nonce !== 0) {
      throw new VCOpenError(methodName, 'Thread nonce is nonzero')
    }
    // check that balanceA of channel is sufficient to create thread
    if (threadInitialState.balanceA.ethDeposit && Web3.utils.toBN(channel.ethBalanceA).lt(threadInitialState.balanceA.ethDeposit)) {
      throw new VCOpenError(methodName, 'Insufficient ETH deposit detected for balanceA')
    }
    if (threadInitialState.balanceA.tokenDeposit && Web3.utils.toBN(channel.tokenBalanceA).lt(threadInitialState.balanceA.tokenDeposit)) {
      throw new VCOpenError(methodName, 'Insufficient token deposit detected for balanceA')
    }
    // verify balanceB for both is 0
    if (threadInitialState.balanceB.ethDeposit && !threadInitialState.balanceB.ethDeposit.isZero()) {
      throw new VCOpenError(methodName, 'The ETH balanceB must be 0 when creating thread.')
    }
    if (threadInitialState.balanceB.tokenDeposit && !threadInitialState.balanceB.tokenDeposit.isZero()) {
      throw new VCOpenError(methodName, 'The token balanceB must be 0 when creating thread.')
    }
    // manipulate threadInitialState to have the right data structure
    threadInitialState.ethBalanceA = threadInitialState.balanceA.ethDeposit ? threadInitialState.balanceA.ethDeposit : Web3.utils.toBN('0')
    threadInitialState.ethBalanceB = Web3.utils.toBN('0')
    threadInitialState.tokenBalanceA = threadInitialState.balanceA.tokenDeposit ? threadInitialState.balanceA.tokenDeposit : Web3.utils.toBN('0')
    threadInitialState.tokenBalanceB = Web3.utils.toBN('0')

    let threadInitialStates = await this.getVcInitialStates(channel.channelId)
    threadInitialStates.push(threadInitialState) // add new vc state to hash
    let newRootHash = Connext.generateThreadRootHash({ threadInitialStates: threadInitialStates })

    // new LC balances should reflect the VC deposits
    // new balanceA = balanceA - (their VC balance)
    const channelEthBalanceA = signer.toLowerCase() === threadInitialState.partyA.toLowerCase() 
      ? Web3.utils.toBN(channel.ethBalanceA).sub(threadInitialState.ethBalanceA) // viewer is signing LC update
      : Web3.utils.toBN(channel.ethBalanceA).sub(threadInitialState.ethBalanceB) // performer is signing LC update
    
    const channelTokenBalanceA = signer.toLowerCase() === threadInitialState.partyA.toLowerCase() 
      ? Web3.utils.toBN(channel.tokenBalanceA).sub(threadInitialState.tokenBalanceA) 
      : Web3.utils.toBN(channel.tokenBalanceA).sub(threadInitialState.tokenBalanceB)
    
    // new balanceI = balanceI - (counterparty VC balance)
    const channelTokenBalanceI = signer.toLowerCase() === threadInitialState.partyA.toLowerCase() 
      ? Web3.utils.toBN(channel.tokenBalanceI).sub(threadInitialState.tokenBalanceB) 
      : Web3.utils.toBN(channel.tokenBalanceI).sub(threadInitialState.tokenBalanceA)

    const channelEthBalanceI = signer.toLowerCase() === threadInitialState.partyA.toLowerCase() 
      ? Web3.utils.toBN(channel.ethBalanceI).sub(threadInitialState.ethBalanceB)
      : Web3.utils.toBN(channel.ethBalanceI).sub(threadInitialState.ethBalanceA) //

    const updateAtoI = {
      channelId: channel.channelId,
      nonce: channel.nonce + 1,
      openVcs: threadInitialStates.length,
      vcRootHash: newRootHash,
      partyA: channel.partyA,
      partyI: this.ingridAddress,
      balanceA: {
        ethDeposit: channelEthBalanceA,
        tokenDeposit: channelTokenBalanceA
      },
      balanceI: {
        ethDeposit: channelEthBalanceI,
        tokenDeposit: channelTokenBalanceI
      },
      signer: signer,
      hubEthBond: threadInitialState.ethBalanceA.add(threadInitialState.ethBalanceB),
      hubTokenBond: threadInitialState.tokenBalanceA.add(threadInitialState.tokenBalanceB),
    }
    const sigAtoI = await this.createChannelStateUpdate(updateAtoI)
    return sigAtoI
  }

  async createChannelUpdateOnThreadClose ({ latestThreadState, subchan, signer = null }) {
    const methodName = 'createChannelUpdateOnThreadClose'
    const isThreadState = { presence: true, isThreadState: true }
    const isChannelObj = { presence: true, isChannelObj: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(latestThreadState, isThreadState),
      methodName,
      'latestThreadState'
    )
    Connext.validatorsResponseToError(
      validate.single(subchan, isChannelObj),
      methodName,
      'subchan'
    )
    if (signer) {
      Connext.validatorsResponseToError(
        validate.single(signer, isAddress),
        methodName,
        'signer'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      signer = accounts[0].toLowerCase()
    }
    // must be partyA in lc
    if (signer.toLowerCase() !== subchan.partyA) {
      throw new VCCloseError(methodName, 'Incorrect signer detected')
    }
    // must be party in vc
    if (
      signer.toLowerCase() !== latestThreadState.partyA.toLowerCase() &&
      signer.toLowerCase() !== latestThreadState.partyB.toLowerCase()
    ) {
      throw new VCCloseError(methodName, 'Not your channel')
    }
    if (CHANNEL_STATES[subchan.state] !== CHANNEL_STATES.LCS_OPENED && CHANNEL_STATES[subchan.state] !== CHANNEL_STATES.LCS_SETTLING) {
      throw new VCCloseError(methodName, 'Channel is in invalid state')
    }

    let threadInitialStates = await this.getVcInitialStates(subchan.channelId)
    // array of state objects, which include the channel id and nonce
    // remove initial state of vcN
    threadInitialStates = threadInitialStates.filter(threadState => {
      return threadState.channelId !== latestThreadState.channelId
    })
    const newRootHash = Connext.generateThreadRootHash({ threadInitialStates: threadInitialStates })

    // add balance from thread to channel balance
    const subchanEthBalanceA = signer.toLowerCase() === latestThreadState.partyA ? Web3.utils.toBN(subchan.ethBalanceA).add(Web3.utils.toBN(latestThreadState.ethBalanceA)) : Web3.utils.toBN(subchan.ethBalanceA).add(Web3.utils.toBN(latestThreadState.ethBalanceB))
    // add counterparty balance from thread to channel balance
    const subchanEthBalanceI = signer.toLowerCase() === latestThreadState.partyA ? Web3.utils.toBN(subchan.ethBalanceI).add(Web3.utils.toBN(latestThreadState.ethBalanceB)) : Web3.utils.toBN(subchan.ethBalanceI).add(Web3.utils.toBN(latestThreadState.ethBalanceA))
    
    const subchanTokenBalanceA = signer.toLowerCase() === latestThreadState.partyA ? Web3.utils.toBN(subchan.tokenBalanceA).add(Web3.utils.toBN(latestThreadState.tokenBalanceA)) : Web3.utils.toBN(subchan.tokenBalanceA).add(Web3.utils.toBN(latestThreadState.tokenBalanceB))
    
    const subchanTokenBalanceI = signer.toLowerCase() === latestThreadState.partyA ? Web3.utils.toBN(subchan.tokenBalanceI).add(Web3.utils.toBN(latestThreadState.tokenBalanceB)) : Web3.utils.toBN(subchan.tokenBalanceI).add(Web3.utils.toBN(latestThreadState.tokenBalanceA))

    const updateAtoI = {
      channelId: subchan.channelId,
      nonce: subchan.nonce + 1,
      openVcs: threadInitialStates.length,
      vcRootHash: newRootHash,
      partyA: signer,
      partyI: this.ingridAddress,
      balanceA: {
        ethDeposit: subchanEthBalanceA,
        tokenDeposit: subchanTokenBalanceA,
      },
      balanceI: {
        ethDeposit: subchanEthBalanceI,
        tokenDeposit: subchanTokenBalanceI,
      },
      hubEthBond: Web3.utils.toBN(latestThreadState.ethBalanceA).add(Web3.utils.toBN(latestThreadState.ethBalanceB)),
      hubTokenBond: Web3.utils.toBN(latestThreadState.tokenBalanceA).add(Web3.utils.toBN(latestThreadState.tokenBalanceB)),
      signer,
    }
    const sigAtoI = await this.createChannelStateUpdate(updateAtoI)
    return sigAtoI
  }
}

module.exports = Connext