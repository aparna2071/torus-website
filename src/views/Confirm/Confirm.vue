<template>
  <v-container px-0 py-0 class="confirm-container">
    <template v-if="type === 'none'">
      <PopupScreenLoader />
    </template>
    <ConfirmForm v-else :current-confirm-modal="currentConfirmModal" @triggerSign="triggerSign" @triggerDeny="triggerDeny" />
  </v-container>
</template>

<script>
import { BroadcastChannel } from '@toruslabs/broadcast-channel'

import ConfirmForm from '../../components/Confirm/ConfirmForm'
// import DappCreateTkey from '../../components/helpers/DappCreateTkey'
import { PopupScreenLoader } from '../../content-loader'
import { POPUP_LOADED, POPUP_RESULT } from '../../utils/enums'
import { broadcastChannelOptions } from '../../utils/utils'

export default {
  name: 'Confirm',
  components: {
    PopupScreenLoader,
    ConfirmForm,
    // DappCreateTkey,
  },
  data() {
    return {
      id: 0,
      type: 'none',
      currentConfirmModal: undefined,
      channel: '',
    }
  },
  created() {
    const queryParameters = this.$route.query
    const { instanceId, id: queryParameterId } = queryParameters

    this.channel = `torus_channel_${instanceId}`
    const bc = new BroadcastChannel(this.channel, broadcastChannelOptions)
    bc.addEventListener('message', async (ev) => {
      const {
        type,
        msgParams,
        txParams,
        origin,
        balance,
        selectedCurrency,
        tokenRates,
        jwtToken,
        whiteLabel,
        currencyData,
        network,
        networkDetails,
        gasFees,
      } = ev.data || {}
      if (txParams && txParams.id.toString() !== queryParameterId) return
      this.type = type
      this.currentConfirmModal = {
        type,
        msgParams,
        txParams,
        origin,
        balance,
        selectedCurrency,
        tokenRates,
        jwtToken,
        whiteLabel,
        currencyData,
        network,
        networkDetails,
        gasFees,
      }
      this.$store.commit('setWhiteLabel', whiteLabel)
      bc.close()
    })
    bc.postMessage({ data: { type: POPUP_LOADED, id: queryParameterId } })
  },
  methods: {
    async triggerSign({ gasPrice, gas, customNonceValue, id, maxFeePerGas, maxPriorityFeePerGas, txEnvelopeType }) {
      const bc = new BroadcastChannel(this.channel, broadcastChannelOptions)

      await bc.postMessage({
        data: {
          type: POPUP_RESULT,
          gasPrice,
          maxFeePerGas,
          maxPriorityFeePerGas,
          txEnvelopeType,
          gas,
          id,
          txType: this.type,
          customNonceValue,
          approve: true,
        },
      })
      bc.close()
    },
    async triggerDeny({ id }) {
      const bc = new BroadcastChannel(this.channel, broadcastChannelOptions)
      await bc.postMessage({ data: { type: POPUP_RESULT, id, txType: this.type, approve: false } })
      bc.close()
    },
  },
}
</script>

<style lang="scss" scoped>
@import 'Confirm.scss';
</style>
