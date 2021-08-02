import { ethErrors } from 'eth-rpc-errors'
import { addHexPrefix } from 'ethereumjs-util'
import { isAddress } from 'web3-utils'

import { TRANSACTION_ENVELOPE_TYPES } from '../../utils/enums'

/**
@module
*/
export { getFinalStates, normalizeTxParameters as normalizeTxParams, validateFrom, validateRecipient, validateTxParameters as validateTxParams }

// functions that handle normalizing of that key in txParams
const normalizers = {
  from: (from, LowerCase = true) => (LowerCase ? addHexPrefix(from).toLowerCase() : addHexPrefix(from)),
  to: (to, LowerCase = true) => (LowerCase ? addHexPrefix(to).toLowerCase() : addHexPrefix(to)),
  nonce: (nonce) => addHexPrefix(nonce),
  customNonceValue: (nonce) => addHexPrefix(nonce),
  value: (value) => addHexPrefix(value),
  data: (data) => addHexPrefix(data),
  gas: (gas) => addHexPrefix(gas),
  gasPrice: (gasPrice) => addHexPrefix(gasPrice),
  isWalletConnectRequest: (isWalletConnectRequest) => isWalletConnectRequest,
  type: addHexPrefix,
  maxFeePerGas: addHexPrefix,
  maxPriorityFeePerGas: addHexPrefix,
}

export function normalizeAndValidateTxParams(txParams, lowerCase = true) {
  const normalizedTxParams = normalizeTxParameters(txParams, lowerCase)
  validateTxParameters(normalizedTxParams)
  return normalizedTxParams
}

/**
 * normalizes txParams
 * @param txParams {object}
 * @returns {object} normalized txParams
 */
function normalizeTxParameters(txParameters, LowerCase) {
  // apply only keys in the normalizers
  const normalizedTxParameters = {}
  for (const key in normalizers) {
    if (txParameters[key]) normalizedTxParameters[key] = normalizers[key](txParameters[key], LowerCase)
  }
  return normalizedTxParameters
}

/**
 * Validates the given tx parameters
 * @param {Object} txParams - the tx params
 * @throws {Error} if the tx params contains invalid fields
 */
export function validateTxParameters(txParams) {
  if (!txParams || typeof txParams !== 'object' || Array.isArray(txParams)) {
    throw ethErrors.rpc.invalidParams('Invalid transaction params: must be an object.')
  }
  if (!txParams.to && !txParams.data) {
    throw ethErrors.rpc.invalidParams(
      'Invalid transaction params: must specify "data" for contract deployments, or "to" (and optionally "data") for all other types of transactions.'
    )
  }

  Object.entries(txParams).forEach(([key, value]) => {
    // validate types
    switch (key) {
      case 'from':
        validateFrom(txParams)
        break
      case 'to':
        validateRecipient(txParams)
        break
      case 'gasPrice':
        ensureProperTransactionEnvelopeTypeProvided(txParams, 'gasPrice')
        ensureMutuallyExclusiveFieldsNotProvided(txParams, 'gasPrice', 'maxFeePerGas')
        ensureMutuallyExclusiveFieldsNotProvided(txParams, 'gasPrice', 'maxPriorityFeePerGas')
        ensureFieldIsString(txParams, 'gasPrice')
        break
      case 'maxFeePerGas':
        ensureProperTransactionEnvelopeTypeProvided(txParams, 'maxFeePerGas')
        ensureMutuallyExclusiveFieldsNotProvided(txParams, 'maxFeePerGas', 'gasPrice')
        ensureFieldIsString(txParams, 'maxFeePerGas')
        break
      case 'maxPriorityFeePerGas':
        ensureProperTransactionEnvelopeTypeProvided(txParams, 'maxPriorityFeePerGas')
        ensureMutuallyExclusiveFieldsNotProvided(txParams, 'maxPriorityFeePerGas', 'gasPrice')
        ensureFieldIsString(txParams, 'maxPriorityFeePerGas')
        break
      case 'value':
        ensureFieldIsString(txParams, 'value')
        if (value.toString().includes('-')) {
          throw ethErrors.rpc.invalidParams(`Invalid transaction value "${value}": not a positive number.`)
        }

        if (value.toString().includes('.')) {
          throw ethErrors.rpc.invalidParams(`Invalid transaction value of "${value}": number must be in wei.`)
        }
        break
      case 'chainId':
        if (typeof value !== 'number' && typeof value !== 'string') {
          throw ethErrors.rpc.invalidParams(`Invalid transaction params: ${key} is not a Number or hex string. got: (${value})`)
        }
        break
      default:
        ensureFieldIsString(txParams, key)
    }
  })
}

/**
 * Given two fields, ensure that the second field is not included in txParams,
 * and if it is throw an invalidParams error.
 * @param {Object} txParams - the transaction parameters object
 * @param {string} fieldBeingValidated - the current field being validated
 * @param {string} mutuallyExclusiveField - the field to ensure is not provided
 * @throws {ethErrors.rpc.invalidParams} - throws if mutuallyExclusiveField is
 *  present in txParams.
 */
function ensureMutuallyExclusiveFieldsNotProvided(txParams, fieldBeingValidated, mutuallyExclusiveField) {
  if (typeof txParams[mutuallyExclusiveField] !== 'undefined') {
    throw ethErrors.rpc.invalidParams(
      `Invalid transaction params: specified ${fieldBeingValidated} but also included ${mutuallyExclusiveField}, these cannot be mixed`
    )
  }
}

/**
 * Ensures that the provided value for field is a string, throws an
 * invalidParams error if field is not a string.
 * @param {Object} txParams - the transaction parameters object
 * @param {string} field - the current field being validated
 * @throws {ethErrors.rpc.invalidParams} - throws if field is not a string
 */
function ensureFieldIsString(txParams, field) {
  if (typeof txParams[field] !== 'string') {
    throw ethErrors.rpc.invalidParams(`Invalid transaction params: ${field} is not a string. got: (${txParams[field]})`)
  }
}

/**
 * Ensures that the provided txParams has the proper 'type' specified for the
 * given field, if it is provided. If types do not match throws an
 * invalidParams error.
 * @param {Object} txParams - the transaction parameters object
 * @param {'gasPrice' | 'maxFeePerGas' | 'maxPriorityFeePerGas'} field - the
 *  current field being validated
 * @throws {ethErrors.rpc.invalidParams} - throws if type does not match the
 *  expectations for provided field.
 */
function ensureProperTransactionEnvelopeTypeProvided(txParams, field) {
  switch (field) {
    case 'maxFeePerGas':
    case 'maxPriorityFeePerGas':
      if (txParams.type && txParams.type !== TRANSACTION_ENVELOPE_TYPES.FEE_MARKET) {
        throw ethErrors.rpc.invalidParams(
          `Invalid transaction envelope type: specified type "${txParams.type}" but ` +
            `including maxFeePerGas and maxPriorityFeePerGas requires type: "${TRANSACTION_ENVELOPE_TYPES.FEE_MARKET}"`
        )
      }
      break
    case 'gasPrice':
    default:
      if (txParams.type && txParams.type === TRANSACTION_ENVELOPE_TYPES.FEE_MARKET) {
        throw ethErrors.rpc.invalidParams(
          `Invalid transaction envelope type: specified type "${txParams.type}" but ` +
            'included a gasPrice instead of maxFeePerGas and maxPriorityFeePerGas'
        )
      }
  }
}

/**
 * validates the from field in  txParams
 * @param txParams {object}
 */
function validateFrom(txParams) {
  if (!(typeof txParams.from === 'string')) {
    throw ethErrors.rpc.invalidParams(`Invalid "from" address "${txParams.from}": not a string.`)
  }
  if (!isAddress(txParams.from)) {
    throw ethErrors.rpc.invalidParams('Invalid "from" address.')
  }
}

/**
 * validates the to field in  txParams
 * @param txParams {object}
 */
function validateRecipient(txParameters) {
  if (txParameters.to === '0x' || txParameters.to === null) {
    if (txParameters.data) {
      delete txParameters.to
    } else {
      throw ethErrors.rpc.invalidParams('Invalid "to" address.')
    }
  } else if (txParameters.to !== undefined && !isAddress(txParameters.to)) {
    throw ethErrors.rpc.invalidParams('Invalid "to" address.')
  }
  return txParameters
}

/**
 * @returns an {array} of states that can be considered final
 */
function getFinalStates() {
  return [
    'rejected', // the user has responded no!
    'confirmed', // the tx has been included in a block.
    'failed', // the tx failed for some reason, included on tx data.
    'dropped', // the tx nonce was already used
  ]
}
