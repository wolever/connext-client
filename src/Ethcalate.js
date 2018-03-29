const axios = require('axios')
const check = require('check-types')
const web3 = require('./Web3')

module.exports = class Ethcalate {
  constructor (contractAddress, abi) {
    this.contract = web3.eth.contract(abi).at(contractAddress)
    this.account = web3.eth.accounts[0]
    //TO DO: Figure out API URL
    //this.apiUrl
  }

  async openChannel (destination, stake, challenge) {
    check.assert.string(destination, 'No counterparty address provided')
    check.assert.string(stake, 'No initial deposit provided')
    check.assert.integer(challenge, 'No challenge timer provided')
    let result = await this.contract.methods.openChannel(destination, challenge).send({from: this.account, value: web3.utils.toWei(stake,'ether')})
    if(result.error) return result.error
    console.log(result)
    return result
  }

  async updatePhone (phone) {
    check.assert.string(phone, 'No phone number provided')
    const response = await axios.post(`${this.apiUrl}/updatePhone`, {
      address: this.account,
      phone: phone
    })
    return response.data
  }

  async getChannelStatus (channelID) {
    check.assert.string(channelID, 'No channelID provided')
    const response = await axios.post(`${this.apiUrl}/getChannelStatus`, {
      channelID
    })
    return response.data
  }

  async getUpdates (channelID, nonce) {
    check.assert.string(channelID, 'No phone number provided')
    if(!nonce) {nonce = 0}
    const statusResponse = await axios.post(`${this.apiUrl}/getChannelStatus`, {
      channelID
    })
    if (statusResponse.data.status != open) {
      console.log("Status: " + statusResponse.data.status)
    }

    const response = await axios.get(`${this.apiUrl}/state`, {
      channelID,
      nonce
    })
    return {data: response.data, status: statusResponse.data.status}
  }

  async getChannels () {
    const response = await axios.post(`${this.apiUrl}/getChannels`, {
      address: this.account
    })
    return response.data
  }

  async getChannelID (counterparty) {
    check.assert.string(counterparty, 'No counterparty account provided')
    const response = await axios.post(`${this.apiUrl}/getChannelID`, {
      address1: this.account,
      address2: counterparty
    })
    return response.data
  }

  // async getKey (email, password) {
  //   check.assert.string(email, 'No email provided')
  //   check.assert.string(password, 'No password provided')
  //   const response = await axios.post(`${this.apiUrl}/key`, {
  //     key: email,
  //     secret: password
  //   })
  //   return response.data
  // }

  // async newToken () {
  //   const token = {
  //     cardnumber: '',
  //     provider: 'VISA',
  //     currency: 'usd',
  //     firstname: '',
  //     lastname: '',
  //     month: '',
  //     year: '',
  //     cvv: '',
  //     addr1: '',
  //     addr2: '',
  //     zip: '',
  //     country: ''
  //   }
  //   return token
  // }

  // async tokenize (token) {
  //   check.assert.object(token, 'Invalid token information')
  //   const response = await this.authorizedRequest.post(
  //     `${this.apiUrl}/tokenize`,
  //     { token }
  //   )
  //   return response.data
  // }

  // async chargeCard (token, amount, emailAddress) {
  //   check.assert.object(token, 'Check card information')
  //   check.assert.string(token.cvv, 'Check card information')
  //   check.assert.positive(amount, 'Provide valid amount')
  //   check.assert.string(
  //     emailAddress,
  //     'Provide valid email address for customer'
  //   )

  //   const response = await this.authorizedRequest.post(
  //     `${this.apiUrl}/charge`,
  //     {
  //       token,
  //       amount,
  //       emailAddress
  //     }
  //   )
  //   return response.data
  // }

  // async chargeVenmo ({
  //   amount,
  //   customerEmail,
  //   venmoHandle,
  //   payerAddress,
  //   tokenContractAddress
  // }) {
  //   check.assert.positive(amount, 'Provide valid amount')
  //   check.assert.string(
  //     customerEmail,
  //     'Provide valid email address for customer'
  //   )
  //   check.assert.string(venmoHandle, 'Provide valid Venmo handle for customer')
  //   check.assert.string(payerAddress, 'Provide valid merchant payer address')
  //   check.assert.string(
  //     tokenContractAddress,
  //     'Provide valid token contract address'
  //   )

  //   const response = await this.authorizedRequest.post(`${this.apiUrl}/venmo`, {
  //     amount,
  //     customerEmail,
  //     venmoHandle,
  //     payerAddress,
  //     tokenContractAddress
  //   })
  //   return response.data
  // }

  // async getEthBalance (vaultAddress) {
  //   check.assert.string(
  //     vaultAddress,
  //     'Provide valid ethereum address for vault address'
  //   )

  //   const response = await this.authorizedRequest.get(
  //     `${this.apiUrl}/vault/${vaultAddress}/balance`
  //   )
  //   return response.data
  // }

  // async getTokenBalance (vaultAddress, tokenContractAddress) {
  //   check.assert.string(
  //     vaultAddress,
  //     'Provide valid ethereum address for vault address'
  //   )

  //   check.assert.string(
  //     tokenContractAddress,
  //     'Provide valid ethereum address for token contract'
  //   )

  //   const response = await this.authorizedRequest.get(
  //     `${this.apiUrl}/vault/${vaultAddress}/balance/${tokenContractAddress}`
  //   )
  //   return response.data
  // }
}
