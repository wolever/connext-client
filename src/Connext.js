const channelManagerAbi = require('../artifacts/LedgerChannel.json');
const util = require('ethereumjs-util');
import Web3 from 'web3'
import validate from 'validate.js'
import { LCOpenError, ParameterValidationError, ContractError, VCOpenError, LCUpdateError, VCUpdateError, LCCloseError, VCCloseError } from './helpers/Errors';
const MerkleTree = require('./helpers/MerkleTree');
const Utils = require('./helpers/utils')
const crypto = require('crypto');
const networking = require('./helpers/networking');

// Channel ENUMS
const LC_STATES = {
  0: 'LCS_OPENING',
  1: 'LCS_OPENED',
  2: 'LCS_SETTLING',
  3: 'LCS_SETTLED'
}

// ***************************************
// ******* PARAMETER VALIDATION **********
// ***************************************
validate.validators.isLcStatus = value => {
  if (Object.values(LC_STATES).indexOf(value) > -1 || Object.keys(LC_STATES).indexOf(value) > -1) {
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

validate.validators.isVcState = value => {
  if (
    value.channelId != null && Web3.utils.isHexStrict(value.channelId) &&
    value.nonce != null && value.nonce >= 0 &&
    value.partyA != null && Web3.utils.isAddress(value.partyA) &&
    value.partyB != null && Web3.utils.isAddress(value.partyB) &&
    value.balanceA != null &&
    value.balanceB != null
  ) {
    return null
  } else {
    return `${JSON.stringify(value)} is not a valid VC state`
  }
}

validate.validators.isLcObj = value => {
  if (
    value.state != null &&
    value.channelId != null && Web3.utils.isHexStrict(value.channelId) &&
    value.nonce != null && value.nonce >= 0 &&
    value.openVcs != null && value.openVcs >= 0 &&
    value.vcRootHash != null && Web3.utils.isHexStrict(value.channelId) &&
    value.partyA != null && Web3.utils.isAddress(value.partyA) &&
    value.partyI != null && Web3.utils.isAddress(value.partyI) &&
    value.balanceA != null &&
    value.balanceI != null
  ) {
    return null
  } else {
    return `${JSON.stringify(value)} is not a valid LC object`
  }
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
      hubAuth = 's%3ACiKWh3t14XjMAllKSmNfYC3F1CzvsFXl.LxI4s1J33VukHvx58lqlPwYlDwEMEbMw1dWhxJz1bjM'
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
    this.networking = networking(ingridUrl);
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
   * @param {BN} initialDeposit - deposit in wei
   * @param {String} sender - (optional) counterparty with hub in ledger channel, defaults to accounts[0]
   * @param {Number} challenge - (optional) challenge period in seconds
   * @returns {Promise} resolves to the ledger channel id of the created channel
   */
  async register (initialDeposit, sender = null, challenge = null) {
    // validate params
    const methodName = 'register'
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(initialDeposit, isBN),
      methodName,
      'initialDeposit'
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
    if (challenge) {
      Connext.validatorsResponseToError(
        validate.single(challenge, isPositiveInt),
        methodName,
        'isPositiveInt'
      )
    } else {
      // get challenge timer from ingrid
      challenge = await this.getLedgerChannelChallengeTimer()
    }
    // verify channel does not exist between ingrid and sender
    let lc = await this.getLcByPartyA(sender)
    if (lc != null && lc.state === 1) {
      throw new LCOpenError(methodName, `PartyA has open channel with hub, ID: ${lc.channelId}`)
    }
    // verify deposit is positive
    if (initialDeposit.isNeg()) {
      throw new LCOpenError(methodName, 'Invalid deposit provided')
    }

    // verify opening state channel with different account
    if (sender.toLowerCase() === this.ingridAddress.toLowerCase()) {
      throw new LCOpenError(methodName, 'Cannot open a channel with yourself')
    }

    // generate additional initial lc params
    const lcId = Connext.getNewChannelId()
    // verify channel ID does not exist
    lc = await this.getLcById(lcId)
    if (lc != null) {
      throw new LCOpenError(methodName, 'Channel by that ID already exists')
    }

    const contractResult = await this.createLedgerChannelContractHandler({
      lcId,
      challenge,
      initialDeposit,
      sender
    })
    console.log('tx hash:', contractResult.transactionHash)

    return lcId
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
   * @param {BN} depositInWei - value of the deposit
   * @param {String} sender - (optional) ETH address sending funds to the ledger channel
   * @param {String} recipient - (optional) ETH address recieving funds in their ledger channel
   * @returns {Promise} resolves to the transaction hash of the onchain deposit.
   */
  async deposit (depositInWei, sender = null, recipient = sender) {
    // validate params
    const methodName = 'deposit'
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(depositInWei, isBN),
      methodName,
      'depositInWei'
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
    if (recipient) {
      Connext.validatorsResponseToError(
        validate.single(recipient, isAddress),
        methodName,
        'recipient'
      )
    }
    // verify deposit is positive and nonzero
    if (deposit.isNeg() || deposit.isZero()) {
      throw new LCUpdateError(methodName, 'Invalid deposit provided')
    }

    const lc = await this.getLcByPartyA(recipient)
    // verify lc is open
    if (lc.state !== 1) {
      throw new LCUpdateError(methodName, 'Channel is not in the right state')
    }
    // verify recipient is in lc
    if (lc.partyA !== recipient.toLowerCase() || lc.partyI !== recipient.toLowerCase()) {
      throw new LCUpdateError(methodName, 'Recipient is not member of channel')
    }
    
    // call contract handler
    const result = await this.depositContractHandler({ lcId: lc.channelId, depositInWei, recipient, sender })
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
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(to, isAddress),
      methodName,
      'to'
    )
    if (deposit) {
      Connext.validatorsResponseToError(
        validate.single(deposit, isBN),
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

    const lcA = await this.getLcByPartyA(sender)
    const lcB = await this.getLcByPartyA(to)
    
    // validate the subchannels exist
    if (lcB == null || lcA == null) {
      throw new VCOpenError(methodName, 'Missing one or more required subchannels')
    }
    // subchannels in right state
    if (lcB.state !== 1 || lcA.state !== 1) {
      throw new VCOpenError(methodName, 'One or more required subchannels are in the incorrect state')
    }

    // validate lcA has enough to deposit or set deposit
    if (deposit && Web3.utils.toBN(lcA.balanceA).lt(deposit)) {
      throw new VCOpenError(methodName, 'Insufficient value to open channel with provided deposit')
    } else if (deposit === null) {
      deposit = Web3.utils.toBN(lcA.balanceA)
    }
    // valid deposit provided
    if (deposit.isNeg() || deposit.isZero()) {
      throw new VCOpenError(methodName, `Invalid deposit provided: ${deposit}`)
    }

    // generate initial vcstate
    const vcId = Connext.getNewChannelId()
    const vc0 = {
      channelId: vcId,
      nonce: 0,
      partyA: sender,
      partyB: to.toLowerCase(),
      balanceA: deposit,
      balanceB: Web3.utils.toBN(0),
      signer: sender
    }
    const sigVC0 = await this.createVCStateUpdate(vc0)
    const sigAtoI = await this.createLCUpdateOnVCOpen({ vc0, lc: lcA, signer: sender })

    // ping ingrid
    const result = await this.openVc({
      channelId: vcId,
      partyA: sender,
      partyB: to.toLowerCase(),
      balanceA: deposit || Web3.utils.toBN(lcA.balanceA),
      vcSig: sigVC0,
      lcSig: sigAtoI
    })
    return result
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
    const vc = await this.getChannelById(channelId)
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
    if (lcB.state !== 1 || lcA.state !== 1) {
      throw new VCOpenError(methodName, 'Subchannel(s) in invalid state')
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
    const vcSig = await this.createVCStateUpdate(vc0)
    // generate lcSig
    const lcSig = await this.createLCUpdateOnVCOpen({ vc0, lc: lcB, signer: sender })
    // ping ingrid with vc0 (hub decomposes to lc)
    const result = await this.joinVcHandler({
      vcSig,
      lcSig,
      channelId
    })
    return result
  }

  /**
   * Updates channel balance by provided ID and balances.
   *
   * In the unidirectional scheme, this function is called by the "A" party only, and only updates that increase the balance of the "B" party are accepted.
   * 
   * Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.
   *
   * @example
   * await connext.updateBalance({
   *   channelId: 10,
   *   balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
   * })
   * @param {Object} params - the method object
   * @param {String} params.channelId - ID of channel
   * @param {BigNumber} params.balanceA - channel balance in Wei (of "A" party)
   * @param {BigNumber} params.balanceB - channel balance in Wei (of "B" party)
   * @returns {Promise} resolves to the signature of the "A" party on the balance update
   */
  async updateBalance ({ channelId, balanceA, balanceB }) {
    // validate params
    const methodName = 'updateBalance'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceB'
    )
    // balances cant be negative
    if (balanceA.isNeg() || balanceB.isNeg()) {
      throw new VCUpdateError(methodName, 'Channel balances cannot be negative')
    }
    // get the vc
    const vc = await this.getChannelById(channelId)
    // must exist
    if (vc === null) {
      throw new VCUpdateError(methodName, 'Channel not found')
    }
    // channel must be opening or opened
    if (vc.state !== 1 && vc.state !== 0) {
      throw new VCUpdateError(methodName, 'Channel is in invalid state')
    }
    // total channel balance cant change
    const channelBalance = Web3.utils.toBN(vc.balanceA).add(Web3.utils.toBN(vc.balanceB))
    if (balanceA.add(balanceB).eq(channelBalance) === false) {
      throw new VCUpdateError(methodName, 'Invalid channel balances')
    }

    if (balanceB.lt(Web3.utils.toBN(vc.balanceB))) {
      throw new VCUpdateError(methodName, 'Updates can only be additive to balanceB')
    }

    // generate new state update
    const state = {
      channelId,
      nonce: vc.nonce + 1,
      partyA: vc.partyA,
      partyB: vc.partyB,
      balanceA: balanceA,
      balanceB: balanceB,
      signer: vc.partyA
    }
    const sig = await this.createVCStateUpdate(state)
    // post signed update to watcher
    const response = await this.vcStateUpdateHandler({
      channelId,
      sig,
      balanceA,
      balanceB,
      nonce: vc.nonce + 1
    })
    return response
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
  async closeChannel (channelId) {
    // validate params
    const methodName = 'closeChannel'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )

    // get latest state in vc
    const vc = await this.getChannelById(channelId)
    if (vc === null) {
      throw new VCCloseError(methodName, 'Channel not found')
    }
    // must be opened or opening
    if (vc.state !== 1 && vc.state !== 0) {
      throw new VCCloseError(methodName, 'Channel is in invalid state')
    }
    const vcN = await this.getLatestVCStateUpdate(channelId)
    // verify vcN was signed by agentA
    const signer = Connext.recoverSignerFromVCStateUpdate({
      sig: vcN.sigA,
      channelId: channelId,
      nonce: vcN.nonce,
      partyA: vc.partyA,
      partyB: vc.partyB,
      balanceA: Web3.utils.toBN(vcN.balanceA),
      balanceB: Web3.utils.toBN(vcN.balanceB)
    })
    if (signer.toLowerCase() !== vc.partyA.toLowerCase()) {
      throw new VCCloseError(methodName, 'Incorrect signer detected on latest update')
    }

    vcN.channelId = channelId
    vcN.partyA = vc.partyA
    vcN.partyB = vc.partyB
    // get partyA ledger channel
    const subchan = await this.getLcByPartyA(vc.partyA)
    // who should sign lc state update from vc
    let isPartyAInVC
    if (subchan.partyA === vcN.partyA) {
      isPartyAInVC = true
    } else if (subchan.partyA === vcN.partyB) {
      isPartyAInVC = false
    } else {
      throw new VCCloseError(methodName, 'Not your virtual channel.')
    }
    // generate decomposed lc update
    const sigAtoI = await this.createLCUpdateOnVCClose({ 
      vcN, 
      subchan, 
      signer: isPartyAInVC ? vcN.partyA : vcN.partyB 
    })

    // request ingrid closes vc with this update
    const fastCloseSig = await this.fastCloseVCHandler({
      sig: sigAtoI,
      signer: isPartyAInVC ? vcN.partyA : vcN.partyB,
      channelId: vcN.channelId
    })

    if (fastCloseSig) {
      // ingrid cosigned proposed LC update
      return fastCloseSig
    } else {
      // take to chain
      const result = await this.byzantineCloseVc(channelId)
      return result
    }
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
  async closeChannels (channelIds) {
    const methodName = 'closeChannels'
    const isArray = { presence: true, isArray: true }
    Connext.validatorsResponseToError(
      validate.single(channelIds, isArray),
      methodName,
      'channels'
    )
    // should this try to fast close any of the channels?
    // or just immediately force close in dispute many channels
    channelIds.forEach(async channelId => {
      // async ({ channelId, balance }) maybe?
      console.log('Closing channel:', channelId)
      await this.closeChannel(channelId)
      console.log('Channel closed.')
    })
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
    const lc = await this.getLcByPartyA(sender.toLowerCase())
    // channel must be open
    if (lc.state !== 1) {
      throw new LCCloseError(methodName, 'Channel is in invalid state')
    }
    // sender must be channel member
    if (sender.toLowerCase() !== lc.partyA && sender.toLowerCase() !== lc.partyI) {
      throw new LCCloseError(methodName, 'Not your channel')
    }

    // get latest i-signed lc state update
    let lcState = await this.getLatestLedgerStateUpdate(lc.channelId, ['sigI'])
    if (lcState) {
      // openVcs?
      if (Number(lcState.openVcs) !== 0) {
        throw new LCCloseError(methodName, 'Cannot close channel with open VCs')
      }
      // empty root hash?
      if (lcState.vcRootHash !== Web3.utils.padRight('0x0', 64)) {
        throw new LCCloseError(methodName, 'Cannot close channel with open VCs')
      }
      // i-signed?
      const signer = Connext.recoverSignerFromLCStateUpdate({
        sig: lcState.sigI,
        isClose: lcState.isClose,
        channelId: lc.channelId,
        nonce: lcState.nonce,
        openVcs: lcState.openVcs,
        vcRootHash: lcState.vcRootHash,
        partyA: lc.partyA,
        partyI: this.ingridAddress,
        balanceA: Web3.utils.toBN(lcState.balanceA),
        balanceI: Web3.utils.toBN(lcState.balanceI)
      })
      if (signer.toLowerCase() !== this.ingridAddress.toLowerCase()) {
        throw new LCCloseError(methodName, 'Hub did not sign update')
      }
    } else {
       // no state updates made in LC
      // PROBLEM: ingrid doesnt return lcState, just uses empty
      lcState = {
        isClose: false,
        channelId: lc.channelId,
        nonce: 0,
        openVcs: 0,
        vcRootHash: Connext.generateVcRootHash({vc0s: []}),
        partyA: lc.partyA,
        partyI: this.ingridAddress,
        balanceA: Web3.utils.toBN(lc.balanceA),
        balanceI: Web3.utils.toBN(lc.balanceI)
      }
    }

    // generate same update with fast close flag and post
    const sigParams = {
      isClose: true,
      channelId: lc.channelId,
      nonce: lcState.nonce + 1,
      openVcs: lcState.openVcs,
      vcRootHash: lcState.vcRootHash,
      partyA: lc.partyA,
      partyI: this.ingridAddress,
      balanceA: Web3.utils.toBN(lcState.balanceA),
      balanceI: Web3.utils.toBN(lcState.balanceI),
      signer: sender
    }
    const sig = await this.createLCStateUpdate(sigParams)
    const lcFinal = await this.fastCloseLcHandler({ sig, lcId: lc.channelId })
    let response
    if (lcFinal.sigI) {
      // call consensus close channel
      response = await this.consensusCloseChannelContractHandler({
        lcId: lc.channelId,
        nonce: lcState.nonce + 1,
        balanceA: Web3.utils.toBN(lcState.balanceA),
        balanceI: Web3.utils.toBN(lcState.balanceI),
        sigA: sig,
        sigI: lcFinal.sigI,
        sender: sender.toLowerCase()
      })
      return { response, fastClosed: true }
    } else {
      // call updateLCState
      response = await this.updateLcStateContractHandler({
        // challenge flag..?
        lcId,
        nonce: lcState.nonce,
        openVcs: lcState.openVcs,
        balanceA: Web3.utils.toBN(lcState.balanceA),
        balanceI: Web3.utils.toBN(lcState.balanceI),
        vcRootHash: lcState.vcRootHash,
        sigA: sig,
        sigI: lcState.sigI,
        sender: sender
      })
      return { response, fastClosed: false }
    }
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
   * await connext.cosignLatestLcUpdate(lcId)
   * 
   * @param {String} lcId - ledger channel id
   * @param {String} sender - (optional) the person who cosigning the update, defaults to accounts[0]
   * @returns {Promise} resolves to the cosigned ledger channel state update
   */
  async cosignLatestLcUpdate(lcId, sender = null) {
    const methodName = 'cosignLatestLcUpdate'
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
    const lc = await this.getLcById(lcId)
    if (lc == null) {
      throw new LCUpdateError(methodName, 'Channel not found')
    }
    if (lc.partyA !== sender.toLowerCase()) {
      throw new LCUpdateError(methodName, 'Incorrect signer detected')
    }
    if (lc.state !== 1) {
      throw new LCUpdateError(methodName, 'Channel is in invalid state')
    }
    // TO DO
    let latestState = await this.getLatestLedgerStateUpdate(lcId, ['sigI'])
    const result = await this.cosignLCUpdate({ lcId, nonce: latestState.nonce, sender })
    return result
  }

  /**
   * Verifies and cosigns the ledger state update indicated by the provided nonce.
   * 
   * @example
   * const lcId = await connext.getLcId() // get ID by accounts[0] and open status by default
   * await connext.cosignLatestLcUpdate(lcId)
   * 
   * @param {Object} params - the method object
   * @param {String} params.lcId - ledger channel id
   * @param {String} params.sender - (optional) the person who cosigning the update, defaults to accounts[0]
   * @returns {Promise} resolves to the cosigned ledger channel state update
   */
  async cosignLCUpdate({ lcId, nonce, sender = null }) {
    const methodName = 'cosignLCUpdate'
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
    const lc = await this.getLcById(lcId)
    if (lc == null) {
      throw new LCUpdateError(methodName, 'Channel not found')
    }
    if (lc.partyA !== sender.toLowerCase()) {
      throw new LCUpdateError(methodName, 'Incorrect signer detected')
    }
    if (lc.state !== 1) {
      throw new LCUpdateError(methodName, 'Channel is in invalid state')
    }
    if (nonce > lc.nonce) {
      throw new LCUpdateError(methodName, 'Invalid nonce detected')
    }

    // TO DO: factor out into above section
    let state = await this.getLcStateByNonce({vcId, nonce})

    // verify sigI
    const signer = Connext.recoverSignerFromLCStateUpdate({
      sig: state.sigI,
      isClose: state.isClose,
      channelId: lcId,
      nonce,
      openVcs: state.openVcs,
      vcRootHash: state.vcRootHash,
      partyA: sender,
      partyI: this.ingridAddress,
      balanceA: Web3.utils.toBN(state.balanceA),
      balanceI: Web3.utils.toBN(state.balanceI)
    })
    if (signer.toLowerCase() !== this.ingridAddress.toLowerCase()) {
      throw new LCUpdateError(methodName, 'Invalid signature detected')
    }

    state.signer = state.partyA
    state.channelId = vcId
    const sigA = await this.createLCStateUpdate(state)
    const response = await this.networking.post(
      `ledgerchannel/${lcId}/update/${nonce}/cosign`,
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
   * @param {String} params.channelId - ID of the ledger channel you are creating a state update for
   * @param {Number} params.nonce - the sequence of the ledger channel update
   * @param {Number} params.openVcs - the number of open virtual channels associated with this ledger channel
   * @param {String} params.vcRootHash - the root hash of the Merkle tree containing all initial states of the open virtual channels
   * @param {String} params.partyA - ETH address of partyA in the ledgerchannel
   * @param {String} params.partyI - ETH address of the hub (Ingrid)
   * @param {Number} params.balanceA - updated balance of partyA
   * @param {Number} params.balanceI - updated balance of partyI
   * @returns {String} the hash of the state data
   */
  static createLCStateUpdateFingerprint ({
    isClose,
    channelId,
    nonce,
    openVcs,
    vcRootHash,
    partyA,
    partyI,
    balanceA,
    balanceI
  }) {
    // validate params
    const methodName = 'createLCStateUpdateFingerprint'
    // validate
    // validatorOpts
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBool = { presence: true, isBool: true }

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
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )
    // generate state update to sign
    const hash = Web3.utils.soliditySha3(
      { type: 'bool', value: isClose },
      { type: 'uint256', value: nonce },
      { type: 'uint256', value: openVcs },
      { type: 'bytes32', value: vcRootHash },
      { type: 'address', value: partyA }, // address will be returned bytepadded
      { type: 'address', value: partyI }, // address is returned bytepadded
      { type: 'uint256', value: balanceA },
      { type: 'uint256', value: balanceI }
    )
    return hash
  }

  /**
   * Recovers the signer from the hashed data generated by the Connext.createLCStateUpdateFingerprint function.
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
  static recoverSignerFromLCStateUpdate ({
    sig,
    isClose,
    channelId,
    nonce,
    openVcs,
    vcRootHash,
    partyA,
    partyI,
    balanceA,
    balanceI
  }) {
    const methodName = 'recoverSignerFromLCStateUpdate'
    // validate
    // validatorOpts
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBool = { presence: true, isBool: true }

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
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )

    // generate fingerprint
    let fingerprint = Connext.createLCStateUpdateFingerprint({
      isClose,
      channelId,
      nonce,
      openVcs,
      vcRootHash,
      partyA,
      partyI,
      balanceA,
      balanceI
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
  static createVCStateUpdateFingerprint ({
    channelId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB
  }) {
    const methodName = 'createVCStateUpdateFingerprint'
    // typecast balances incase chained
    balanceA = Web3.utils.toBN(balanceA)
    balanceB = Web3.utils.toBN(balanceB)
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
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
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    const hubBond = balanceA.add(balanceB)

    // generate state update to sign
    const hash = Web3.utils.soliditySha3(
      { type: 'bytes32', value: channelId },
      { type: 'uint256', value: nonce },
      { type: 'address', value: partyA },
      { type: 'address', value: partyB },
      { type: 'uint256', value: hubBond },
      { type: 'uint256', value: balanceA },
      { type: 'uint256', value: balanceB }
    )
    return hash
  }

  /**
   * Recovers the signer from the hashed data generated by the Connext.createVCStateUpdateFingerprint function.
   * 
   * @param {Object} params - the method object
   * @param {String} params.sig - signature of the data created in Connext.createVCStateUpdate
   * @param {String} params.channelId - ID of the virtual channel you are creating a state update for
   * @param {Number} params.nonce - the sequence of the state update
   * @param {String} params.partyA - ETH address of partyA
   * @param {String} params.partyB - ETH address of partyB
   * @param {Number} params.balanceA - updated balance of partyA
   * @param {Number} params.balanceB - updated balance of partyB
   * @returns {String} ETH address of the person who signed the data
   */
  static recoverSignerFromVCStateUpdate ({
    sig,
    channelId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB
  }) {
    const methodName = 'recoverSignerFromVCStateUpdate'
    // validate
    // typecast balances incase chained
    balanceA = Web3.utils.toBN(balanceA)
    balanceB = Web3.utils.toBN(balanceB)
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

    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )

    let fingerprint = Connext.createVCStateUpdateFingerprint({
      channelId,
      nonce,
      partyA,
      partyB,
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
  async createLCStateUpdate ({
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
    hubBond = null
  }) {
    const methodName = 'createLCStateUpdate'
    // validate
    // validatorOpts
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBool = { presence: true, isBool: true }

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
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )
    if (hubBond) {
      Connext.validatorsResponseToError(
        validate.single(hubBond, isBN),
        methodName,
        'hubBond'
      )
    } else {
      hubBond = Web3.utils.toBN('0')
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
    if (signer.toLowerCase() !== partyA.toLowerCase() && signer.toLowerCase() !== partyI.toLowerCase()) {
      throw new LCUpdateError(methodName, 'Invalid signer detected')
    }
    // balances must be positive
    if (balanceA.isNeg() || balanceI.isNeg()) {
      throw new LCUpdateError(methodName, 'Cannot have negative balances')
    }

    // validate update
    const emptyRootHash = Connext.generateVcRootHash({ vc0s: []})
    const lc = await this.getLcById(channelId)
    if (lc == null) {
      // generating opening cert
      if (nonce !== 0 ) {
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
    } else {
      // updating existing lc
      // must be open
      if (lc.state === 3) {
        throw new LCUpdateError(methodName, 'Channel is in invalid state to accept updates')
      }
      // nonce always increasing
      if (nonce < lc.nonce) {
        throw new LCUpdateError(methodName, 'Invalid nonce')
      }
      // only open/close 1 vc per update, or dont open any
      if (Math.abs(Number(openVcs) - Number(lc.openVcs)) !== 1 && Math.abs(Number(openVcs) - Number(lc.openVcs)) !== 0 ) {
        throw new LCUpdateError(methodName, 'Invalid number of openVcs proposed')
      }
      // parties cant change
      if (partyA !== lc.partyA || partyI !== lc.partyI) {
        throw new LCUpdateError(methodName, 'Invalid channel parties')
      }
      // no change in total balance
      // add ledger channel balances of both parties from previously, subctract new balance of vc being opened
      let isOpeningVc = (openVcs - lc.openVcs) === 1 ? true : false
      const channelBal = isOpeningVc ? 
        Web3.utils.toBN(lc.balanceA).add(Web3.utils.toBN(lc.balanceI)).sub(hubBond) :
        Web3.utils.toBN(lc.balanceA).add(Web3.utils.toBN(lc.balanceI)).add(hubBond)
      if (balanceA.add(balanceI).eq(channelBal) === false) {
        throw new LCUpdateError(methodName, 'Invalid balance proposed')
      }
    }

    // generate sig
    const hash = Connext.createLCStateUpdateFingerprint({
      isClose,
      channelId,
      nonce,
      openVcs,
      vcRootHash,
      partyA,
      partyI,
      balanceA,
      balanceI
    })
    let sig
    if (unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, signer)
    } else {
      sig = await this.web3.eth.personal.sign(hash, signer)
    }
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
  async createVCStateUpdate ({
    channelId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB,
    unlockedAccountPresent = process.env.DEV ? process.env.DEV : false,
    signer = null // if true, use sign over personal.sign. dev needs true
  }) {
    // validate
    const methodName = 'createVCStateUpdate'
    // validate
    // validatorOpts'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
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
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    // verify subchannel
    const lcA = await this.getLcByPartyA(partyA)
    const lcB = await this.getLcByPartyA(partyB)
    if (lcB === null || lcA === null) {
      throw new VCOpenError(methodName, 'Missing one or more required subchannels')
    }
    // subchannels in right state
    if (lcB.state !== 1 || lcA.state !== 1) {
      throw new VCOpenError(methodName, 'One or more required subchannels are in the incorrect state')
    }
    // verify channel state update
    const vc = await this.getChannelById(channelId)
    if (vc === null) {
      // channel does not exist, generating opening state
      if (nonce !== 0) {
        throw new VCOpenError(methodName, 'Invalid nonce detected')
      }
      if (!balanceB.isZero()) {
        throw new VCOpenError(methodName, 'Invalid balance detected')
      }
      if (balanceA.isZero() || balanceA.isNeg()) {
        throw new VCOpenError(methodName, 'Invalid balance detected')
      }
      if (partyA.toLowerCase() === partyB.toLowerCase()) {
        throw new VCOpenError(methodName, 'Cannot open channel with yourself')
      }
      if (Web3.utils.toBN(lcA.balanceA).lt(balanceA)) {
        throw new VCOpenError(methodName, 'Insufficient balance detected')
      }
    } else {
      // vc exists
      if (vc.state === 3) {
        throw new VCUpdateError(methodName, 'Channel is in invalid state')
      }
      if (nonce < vc.nonce + 1 && nonce !== 0) { // could be joining
        throw new VCUpdateError(methodName, 'Invalid nonce')
      }
      if (balanceA.isNeg() || balanceB.isNeg()) {
        throw new VCUpdateError(methodName, 'Balances cannot be negative')
      }
      if (!balanceA.add(balanceB).eq(Web3.utils.toBN(vc.balanceA).add(Web3.utils.toBN(vc.balanceB)))) {
        throw new VCUpdateError(methodName, 'Invalid update detected')
      }
      if (partyA.toLowerCase() !== vc.partyA || partyB.toLowerCase() !== vc.partyB) {
        throw new VCUpdateError(methodName, 'Invalid parties detected')
      }
    }
    
    // get accounts
    const accounts = await this.web3.eth.getAccounts()
    // generate and sign hash
    const hash = Connext.createVCStateUpdateFingerprint({
      channelId,
      nonce,
      partyA,
      partyB,
      balanceA,
      balanceB
    })
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
    return sig
  }

  // vc0 is array of all existing vc0 sigs for open vcs
  static generateVcRootHash ({ vc0s }) {
    const methodName = 'generateVcRootHash'
    const isArray = { presence: true, isArray: true }
    Connext.validatorsResponseToError(
      validate.single(vc0s, isArray),
      methodName,
      'vc0s'
    )
    const emptyRootHash = '0x0000000000000000000000000000000000000000000000000000000000000000'
    let vcRootHash
    if (vc0s.length === 0) {
      // reset to initial value -- no open VCs
      vcRootHash = emptyRootHash
    } else {
      const merkle = Connext.generateMerkleTree(vc0s)
      vcRootHash = Utils.bufferToHex(merkle.getRoot())
    }

    return vcRootHash
  }

  static generateMerkleTree (vc0s) {
    const methodName = 'generateVcRootHash'
    const isArray = { presence: true, isArray: true }
    Connext.validatorsResponseToError(
      validate.single(vc0s, isArray),
      methodName,
      'vc0s'
    )
    if (vc0s.length === 0) {
      throw new Error('Cannot create a Merkle tree with 0 leaves.')
    }
    const emptyRootHash = '0x0000000000000000000000000000000000000000000000000000000000000000'
    let merkle
    let elems = vc0s.map(vc0 => {
      // vc0 is the initial state of each vc
      // hash each initial state and convert hash to buffer
      const hash = Connext.createVCStateUpdateFingerprint(vc0)
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


  async createLedgerChannelContractHandler ({
    ingridAddress = this.ingridAddress,
    lcId,
    initialDeposit,
    challenge,
    sender = null
  }) {
    const methodName = 'createLedgerChannelContractHandler'
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(ingridAddress, isAddress),
      methodName,
      'ingridAddress'
    )
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(challenge, isPositiveInt),
      methodName,
      'challenge'
    )
    Connext.validatorsResponseToError(
      validate.single(initialDeposit, isBN),
      methodName,
      'initialDeposit'
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
    // verify deposit is positive and nonzero
    if (initialDeposit.isNeg()) {
      throw new LCOpenError(methodName, 'Invalid deposit provided')
    }
    // verify partyA !== partyI
    if (sender === ingridAddress) {
      throw new LCOpenError(methodName, 'Cannot open a channel with yourself')
    }

    // validate requires on contract before sending transactions
    const lc = await this.getLcById(lcId)
    if (lc != null) {
      throw new LCOpenError('Channel has been used')
    }
    
    const result = await this.channelManagerInstance.methods
      .createChannel(lcId, ingridAddress, challenge)
      .send(
      {
        from: sender,
        value: initialDeposit,
        gas: 750000
      }
    )

    if (!result.transactionHash) {
      throw new ContractError(methodName, 301, 'Transaction failed to broadcast')
    }

    if (!result.blockNumber) {
      throw new ContractError(methodName, 302, result.transactionHash, 'Transaction failed')
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
    if (lc.state !== 0) {
      throw new LCOpenError(methodName, 'Channel is in incorrect state')
    }

    if (lc.partyA !== sender) {
      throw new ContractError(methodName, 'Caller must be partyA in ledger channel')
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
      throw new ContractError(methodName, 301, 'Transaction failed to broadcast')
    }

    if (!result.blockNumber) {
      throw new ContractError(methodName, 302, result.transactionHash, 'Transaction failed')
    }

    return result
  }

  async depositContractHandler ({ lcId, depositInWei, sender = null, recipient = sender }) {
    const methodName = 'depositContractHandler'
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(depositInWei, isBN),
      methodName,
      'depositInWei'
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

    // verify deposit is nonzero
    if (depositInWei.isNeg() || depositInWei.isZero()) {
      throw new LCUpdateError(methodName, 'Invalid deposit provided')
    }
    // verify requires
    const lc = await this.getLcById(lcId)
    if (lc.state !== 1) {
      throw new ContractError(methodName, 'Channel is not open')
    }
    if (recipient.toLowerCase() !== lc.partyA || recipient.toLowerCase() !== lc.partyI) {
      throw new ContractError(methodName, 'Recipient is not a member of the ledger channel')
    }

    // call LC method
    const result = await this.channelManagerInstance.methods
      .deposit(
        lcId, // PARAM NOT IN CONTRACT YET, SHOULD BE
        recipient
      )
      .send({
        from: sender,
        value: depositInWei
      })
    
    if (!result.transactionHash) {
      throw new ContractError(methodName, 301, 'Transaction failed to broadcast')
    }
  
    if (!result.blockNumber) {
      throw new ContractError(methodName, 302, result.transactionHash, 'Transaction failed')
    }
    return result
  }

  async consensusCloseChannelContractHandler ({
    lcId,
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
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    const isAddress = { presence: true, isAddress: true }
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
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
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
    const emptyRootHash = Connext.generateVcRootHash({ vc0s: [] })
    let state = {
      sig: sigI,
      isClose: true,
      channelId: lcId,
      nonce,
      openVcs: 0,
      vcRootHash: emptyRootHash,
      partyA: sender,
      partyI: this.ingridAddress,
      balanceA,
      balanceI
    }
    let signer = Connext.recoverSignerFromLCStateUpdate(state)
    if (signer !== this.ingridAddress.toLowerCase()) {
      throw new LCCloseError(methodName, 'Ingrid did not sign closing update')
    }
    state.sig = sigA
    signer = Connext.recoverSignerFromLCStateUpdate(state)
    if (signer !== sender) {
      throw new LCCloseError(methodName, 'PartyA did not sign closing update')
    }

    // TO DO
    // add way to validate balAOnChain + balIOnChain == balI + balA

    const result = await this.channelManagerInstance.methods
      .consensusCloseChannel(lcId, nonce, balanceA, balanceI, sigA, sigI)
      .send({
        from: sender,
        gas: 1000000
      })

    if (!result.transactionHash) {
      throw new ContractError(methodName, 301, 'Transaction failed to broadcast')
    }
  
    if (!result.blockNumber) {
      throw new ContractError(methodName, 302, result.transactionHash, 'Transaction failed')
    }

    return result
  }

  // default null means join with 0 deposit
  async joinLedgerChannelContractHandler ({ lcId, deposit = null, sender = null }) {
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
    
    if(sender && sender !== lc.partyI) {
      throw new LCOpenError(methodName, 'Incorrect channel counterparty')
    }


    if (lc.state !== 0) {
      throw new LCOpenError(methodName, 'Channel is not in correct state')
    }
    const result = await this.channelManagerInstance.methods
      .joinChannel(lcId)
      .send({
        from: sender ? sender : this.ingridAddress, // can also be accounts[0], easier for testing
        value: deposit,
        gas: 3000000 // FIX THIS, WHY HAPPEN, TRUFFLE CONFIG???
      })

    if (!result.transactionHash) {
      throw new ContractError(methodName, 301, 'Transaction failed to broadcast')
    }
  
    if (!result.blockNumber) {
      throw new ContractError(methodName, 302, result.transactionHash, 'Transaction failed')
    }
    return result
  }

  async updateLcStateContractHandler ({
    lcId,
    nonce,
    openVcs,
    balanceA,
    balanceI,
    vcRootHash,
    sigA,
    sigI,
    sender = null
  }) {
    const methodName = 'updateLcStateContractHandler'
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    const isAddress = { presence: true, isAddress: true }
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
    Connext.validatorsResponseToError(
      validate.single(openVcs, isPositiveInt),
      methodName,
      'openVcs'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
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
    const result = await this.channelManagerInstance.methods
      .updateLCstate(
        lcId,
        [ nonce, openVcs, balanceA, balanceI ],
        Web3.utils.padRight(vcRootHash, 64),
        sigA,
        sigI
      )
      .send({
        from: sender,
        gas: 4700000 // FIX THIS, WHY HAPPEN, TRUFFLE CONFIG???
      })
    if (!result.transactionHash) {
      throw new Error(`[${methodName}] updateLCstate transaction failed.`)
    }
    return result
  }

  async initVcStateContractHandler ({
    subchanId,
    vcId,
    proof = null,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB,
    sigA,
    sender = null,
  }) {
    const methodName = 'initVcStateContractHandler'
    // validate
    const isAddress = { presence: true, isAddress: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(subchanId, isHexStrict),
      methodName,
      'subchanId'
    )
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
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
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
    if (proof === null) {
      // generate proof from lc
      const stateHash = Connext.createVCStateUpdateFingerprint({
        channelId: vcId,
        nonce,
        partyA,
        partyB,
        balanceA,
        balanceB
      })
      const vc0s = await this.getVcInitialStates(subchanId)
      let merkle = Connext.generateMerkleTree(vc0s)
      let mproof = merkle.proof(Utils.hexToBuffer(stateHash))

      proof = []
      for(var i=0; i<mproof.length; i++){
        proof.push(Utils.bufferToHex(mproof[i]))
      }

      proof.unshift(stateHash)

      proof = Utils.marshallState(proof)
    }

    const hubBond = balanceA.add(balanceB)

    const results = await this.channelManagerInstance.methods
      .initVCstate(
        subchanId,
        vcId,
        proof,
        nonce,
        partyA,
        partyB,
        hubBond,
        balanceA,
        balanceB,
        sigA
      )
      .send({
        from: sender,
        gas: 6500000
      })
    // if (!results.transactionHash) {
    //   throw new Error(`[${methodName}] initVCState transaction failed.`)
    // }
    return results
  }

  async settleVcContractHandler ({
    subchanId,
    vcId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB,
    sigA,
    sender = null
  }) {
    const methodName = 'settleVcContractHandler'
    // validate
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(subchanId, isHexStrict),
      methodName,
      'subchanId'
    )
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
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
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
    const results = await this.channelManagerInstance.methods
      .settleVC(
        subchanId,
        vcId,
        nonce,
        partyA,
        partyB,
        [ balanceA, balanceB ],
        sigA
      )
      .send({
        from: sender,
        gas: 4700000
      })
    if (!results.transactionHash) {
      throw new Error(`[${methodName}] settleVC transaction failed.`)
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
      throw new Error(`[${methodName}] transaction failed.`)
    }
    return results
  }

  async byzantineCloseChannelContractHandler ({lcId, sender = null }) {
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
        from: sender
      })
    if (!results.transactionHash) {
      throw new Error(`[${methodName}] transaction failed.`)
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
  async getUnjoinedChannels(partyB = null) {
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
    if (sigs == null) {
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
   * @param {String} ledgerChannelId - ID of the ledger channel
   * @returns {Promise} resolves to an Array of virtual channel objects
   */
  async getChannelsByLcId (ledgerChannelId) {
    // lcState == latest ingrid signed state
    const methodName = 'getChannelsByLcId'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(ledgerChannelId, isHexStrict),
      methodName,
      'ledgerChannelId'
    )

    const response = await this.networking.get(
      `ledgerchannel/${ledgerChannelId}/vcs`
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
      status = LC_STATES[1]
    }
    // get my LC with ingrid
    const response = await this.networking.get(
      `ledgerchannel/a/${partyA}?status=${status}` 
    )
    if (status === LC_STATES[1]) {
      // has list length of 1, return obj
      return response.data[0].channelId
    } else {
      return response.data.map((val) => {
        return val.channelId
      })
    }
  }

  /**
   * Returns an object representing the virtual channel in the database.
   *
   * @param {String} channelId - the ID of the virtual channel
   * @returns {Promise} resolves to an object representing the virtual channel
   */
  async getChannelById (channelId) {
    const methodName = 'getChannelById'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    try {
      const response = await this.networking.get(
        `virtualchannel/${channelId}`
      )
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
  async getChannelByParties ({ partyA, partyB }) {
    const methodName = 'getChannelByParties'
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
    const response = await this.networking.get(
      `virtualchannel/a/${partyA}/b/${partyB}/open`
    )
    return response.data
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
    const vc = await this.getChannelById(vcId)
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
      const res = await this.networking.get(
        `ledgerchannel/${lcId}`
      )

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
    const isLcStatus = { presence: true, isLcStatus: true}
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
      status = LC_STATES[1]
    }

    const response = await this.networking.get(
      `ledgerchannel/a/${partyA.toLowerCase()}?status=${status}`    
    )
    if (status === LC_STATES[1]) {
      // has list length of 1, return obj
      return response.data[0]
    } else {
      return response.data
    }
  }
  
  async getLedgerChannelChallengeTimer () {
    const response = await this.networking.get(
      `ledgerchannel/challenge`
    )
    return response.data.challenge
  }

  // /**
  //  * Returns the latest signed virtual channel state as an object.
  //  *
  //  * @param {String} channelId - ID of the virtual channel
  //  * @returns {Object} representing the latest signed virtual channel state
  //  */
  async getLatestVCStateUpdate (channelId) {
    // validate params
    const methodName = 'getLatestVCStateUpdate'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    const response = await this.networking.get(
      `virtualchannel/${channelId}/update/latest`,
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
      `virtualchannel/${vcId}/intialstate`
    )
    return response.data
  }

  async getDecomposedLcStates (vcId) {
    // validate params
    const methodName = 'getDecomposedLcStates'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    const response = await this.networking.get(
      `virtualchannel/${vcId}/decompose`
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
  async requestIngridDeposit({lcId, deposit}) {
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
    const response = await this.networking.post(
      `ledgerchannel/${lcId}/deposit`,
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
  async requestJoinLc(lcId) {
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
      throw new LCOpenError(methodName, 'Ingrid is not the counterparty of this channel.')
    }
    if (Date.now() > lc.LCOpenTimeout) {
      throw new LCOpenError(methodName, 'Ledger Channel open has timed out, call LCOpenTimeoutContractHandler')
    }

    try {
      const response = await this.networking.post(
        `ledgerchannel/${lcId}/request`)
      return response.data.txHash
    } catch (e) {
      return null
    }
  }

  // HELPER FUNCTION TO HAVE INGRID SET UP VC
  async openVc ({ channelId, partyA, partyB, balanceA, vcSig, lcSig }) {
    // validate params
    const methodName = 'openVc'
    const isHexStrict = { presence: true, isHex: true }
    const isAddress = { presence: true, isAddress: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
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
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
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
    if (balanceA.isNeg() || balanceA.isZero()) {
      throw new VCOpenError(methodName, 'Invalid channel balance provided')
    }

    // verify sigs -- signer === partyA
    // lcSig -- add later
    // vcSig
    let signer = Connext.recoverSignerFromVCStateUpdate({
      sig: vcSig,
      channelId,
      nonce: 0,
      partyA,
      partyB,
      balanceA,
      balanceB: Web3.utils.toBN('0')
    })
    if (signer.toLowerCase() !== partyA.toLowerCase()) {
      throw new VCOpenError(methodName, 'PartyA did not sign channel opening cert')
    }

    // ingrid should add vc params to db
    const response = await this.networking.post(
      `virtualchannel/`,
      { channelId, partyA: partyA.toLowerCase(), partyB: partyB.toLowerCase(), balanceA: balanceA.toString(), lcSig, vcSig }
    )
    return response.data.channelId
  }

  // ingrid verifies the vc0s and sets up vc and countersigns lc updates
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


  async fastCloseVCHandler ({ sig, signer, channelId }) {
    // validate params
    const methodName = 'fastCloseVCHandler'
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
        signer,
      }
    )
    if (response.data.sigI) {
      return response.data.sigI
    } else {
      return false
    }
  }

  // posts to ingrid endpoint to decompose ledger channel
  // based on latest double signed update
  // should return ingrids signature on the closing lc update used in
  // consensusCloseChannel

  // as called in withdraw: requests ingrid cosigns final ledger update
  // if she cosigns, call consensus
  async fastCloseLcHandler ({ sig, lcId }) {
    // validate params
    const methodName = 'fastCloseLcHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    const response = await this.networking.post(
      `ledgerchannel/${lcId}/fastclose`,
      {
        sig
      }
    )
    return response.data
  }
  
  async vcStateUpdateHandler ({ channelId, sig, balanceA, balanceB, nonce }) {
    // validate params
    const methodName = 'vcStateUpdateHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
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
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    // balances cant be negative
    if (balanceA.isNeg() || balanceB.isNeg()) {
      throw new VCUpdateError(methodName, 'Channel balances cannot be negative')
    }
    // get the vc
    const vc = await this.getChannelById(channelId)
    // must exist
    if (vc === null) {
      throw new VCUpdateError(methodName, 'Channel not found')
    }
    // channel must be opened or opening
    if (vc.state !== 1 && vc.state !== 0) {
      throw new VCUpdateError(methodName, 'Channel is in invalid state')
    }
    // total channel balance cant change
    const channelBalance = Web3.utils.toBN(vc.balanceA).add(Web3.utils.toBN(vc.balanceB))
    if (balanceA.add(balanceB).eq(channelBalance) === false) {
      throw new VCUpdateError(methodName, 'Invalid channel balances')
    }
    // nonce must be increasing
    if (nonce !== Number(vc.nonce) + 1) {
      throw new VCUpdateError(methodName, 'Invalid nonce provided')
    }
    // validate sig
    const signer = Connext.recoverSignerFromVCStateUpdate({
      sig,
      channelId,
      nonce,
      partyA: vc.partyA,
      partyB: vc.partyB,
      balanceA,
      balanceB
    })
    if (signer.toLowerCase() !== vc.partyA.toLowerCase()) {
      throw new VCUpdateError(methodName, 'Invalid signer detected')
    }
    const response = await this.networking.post(
      `virtualchannel/${channelId}/update`,
      {
        sig,
        balanceA: balanceA.toString(),
        balanceB: balanceB.toString(),
        nonce
      }
    )
    return response.data
  }

  async createLCUpdateOnVCOpen ({ vc0, lc, signer = null }) {
    const methodName = 'createLCUpdateOnVCOpen'
    const isVcState = { presence: true, isVcState: true }
    const isLcObj = { presence: true, isLcObj: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(vc0, isVcState),
      methodName,
      'vc0'
    )
    Connext.validatorsResponseToError(
      validate.single(lc, isLcObj),
      methodName,
      'lc'
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
    if (signer.toLowerCase() !== lc.partyA) {
      throw new VCOpenError(methodName, 'Invalid signer detected')
    }
    // signer should be vc0 partyA or vc0 partyB
    if (signer.toLowerCase() !== vc0.partyA.toLowerCase() && signer.toLowerCase() !== vc0.partyB.toLowerCase()) {
      throw new VCOpenError(methodName, 'Invalid signer detected')
    }
    // lc must be open
    if (lc.state !== 1) {
      throw new VCOpenError(methodName, 'Invalid subchannel state')
    }
    // vcId should be unique
    let vc = await this.getChannelById(vc0.channelId)
    if (vc && vc.state !== 0) {
      throw new VCOpenError(methodName, 'Invalid channel id in vc0')
    }
    // vc0 validation
    if (vc0.nonce !== 0) {
      throw new VCOpenError(methodName, 'Nonce is nonzero')
    }
    if (Web3.utils.toBN(vc0.balanceB).isZero() === false) {
      throw new VCOpenError(methodName, 'Invalid balanceB')
    }
    if (
      Web3.utils.toBN(vc0.balanceA).isNeg() || 
      Web3.utils.toBN(vc0.balanceA).isZero() || 
      Web3.utils.toBN(vc0.balanceA).gt(Web3.utils.toBN(lc.balanceA))
    ) {
      throw new VCOpenError(methodName, 'Invalid balanceA')
    }
    let vcInitialStates = await this.getVcInitialStates(lc.channelId)
    vcInitialStates.push(vc0) // add new vc state to hash
    let newRootHash = Connext.generateVcRootHash({vc0s: vcInitialStates})

    const updateAtoI = {
      channelId: lc.channelId,
      nonce: lc.nonce + 1,
      openVcs: vcInitialStates.length,
      vcRootHash: newRootHash,
      partyA: lc.partyA,
      partyI: this.ingridAddress,
      balanceA: signer.toLowerCase() === vc0.partyA.toLowerCase() ? Web3.utils.toBN(lc.balanceA).sub(Web3.utils.toBN(vc0.balanceA)) : Web3.utils.toBN(lc.balanceA).sub(Web3.utils.toBN(vc0.balanceB)),
      balanceI: signer.toLowerCase() === vc0.partyA.toLowerCase() ? Web3.utils.toBN(lc.balanceI).sub(Web3.utils.toBN(vc0.balanceB)) : Web3.utils.toBN(lc.balanceI).sub(Web3.utils.toBN(vc0.balanceA)),
      signer: signer,
      hubBond: Web3.utils.toBN(vc0.balanceA).add(Web3.utils.toBN(vc0.balanceB))
    }
    const sigAtoI = await this.createLCStateUpdate(updateAtoI)
    return sigAtoI
  }


 async createLCUpdateOnVCClose ({ vcN, subchan, signer = null }) {
  const methodName = 'createLCUpdateOnVCClose'
  const isVcState = { presence: true, isVcState: true }
  const isLcObj = { presence: true, isLcObj: true }
  const isAddress = { presence: true, isAddress: true }
  Connext.validatorsResponseToError(
    validate.single(vcN, isVcState),
    methodName,
    'vcN'
  )
  Connext.validatorsResponseToError(
    validate.single(subchan, isLcObj),
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
  if (signer.toLowerCase() !== vcN.partyA && signer.toLowerCase() !== vcN.partyB) {
    throw new VCCloseError(methodName, 'Not your channel')
  }
  if (subchan.state !== 1 && subchan.state !== 2) {
    throw new VCCloseError(methodName, 'Channel is in invalid state')
  }

  let vcInitialStates = await this.getVcInitialStates(subchan.channelId)
  // array of state objects, which include the channel id and nonce
  // remove initial state of vcN
  vcInitialStates = vcInitialStates.filter((val) => {
    return val.channelId !== vcN.channelId
  })
  const newRootHash = Connext.generateVcRootHash({ vc0s: vcInitialStates})
  
  const updateAtoI = {
    channelId: subchan.channelId,
    nonce: subchan.nonce + 1,
    openVcs: vcInitialStates.length,
    vcRootHash: newRootHash,
    partyA: vcN.partyA,
    partyI: this.ingridAddress,
    balanceA: signer === vcN.partyA ? Web3.utils.toBN(subchan.balanceA).add(Web3.utils.toBN(vcN.balanceA)) : Web3.utils.toBN(subchan.balanceA).add(Web3.utils.toBN(vcN.balanceB)),
    balanceI: signer === vcN.partyA ? Web3.utils.toBN(subchan.balanceI).add(Web3.utils.toBN(vcN.balanceB)) : Web3.utils.toBN(subchan.balanceI).add(Web3.utils.toBN(vcN.balanceA)),
    signer: signer,
    hubBond: Web3.utils.toBN(vcN.balanceA).add(Web3.utils.toBN(vcN.balanceB))
  }
  const sigAtoI = await this.createLCStateUpdate(updateAtoI)
  return sigAtoI
 }

  // settles all vcs on chain in the case of a dispute (used in close channel)
  // first calls init vc
  // then calls settleVc

  /// SHOULD WE JUST POST THIS DIRECTLY TO THE WATCHER URL FROM OUR PACKAGE

  // then posts to watcher (?) -- maybe just post all of this to the watcher url (?)
  async byzantineCloseVc (vcId) {
    // validate params
    const methodName = 'byzantineCloseVc'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    const accounts = await this.web3.eth.getAccounts()
    const vc0 = await this.getVcInitialState(vcId)
    let subchan
    if (accounts[0] === vc0.partyA) {
      subchan = vc0.subchanAI
    } else if (accounts[0] == vc0.partyB) {
      subchan = vc0.subchanBI
    }
    const initResult = await this.initVcStateContractHandler({
      subchanId: subchan,
      vcId,
      partyA: vc0.partyA,
      partyB: vc0.partyB,
      balanceA: Web3.utils.toBN(vc0.balanceA),
      balanceB: Web3.utils.toBN(vc0.balanceB),
      sigA: vc0.sigA,
      nonce: vc0.nonce,
      sender: vc0.partyA
    })
    if (initResult) {
      const vcState = await this.getLatestVCStateUpdate(vcId)
      const settleResult = await this.settleVcContractHandler({
        subchanId: subchan,
        vcId,
        nonce: vcState.nonce,
        partyA: vcState.partyA,
        partyB: vcState.partyB,
        balanceA: Web3.utils.toBN(vcState.balanceA),
        balanceB: Web3.utils.toBN(vcState.balanceB),
        sigA: vcState.sigA,
        sender: vcState.partyA
      })
      return settleResult
    } else {
      return initResult
    }
  }
}

module.exports = Connext
