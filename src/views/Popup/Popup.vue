<template>
  <v-container class="pa-0">
    <PopupLogin :login-dialog="loginDialog" @closeDialog="cancelLogin" />
    <v-dialog max-width="400px" :value="showWalletConnect" persistent>
      <WalletConnectCard :show-from-embed="showWalletConnect" />
    </v-dialog>
    <PopupWidget
      v-if="torusWidgetVisibility && !showWalletConnect"
      :login-dialog="loginDialog || loginInProgress"
      :logged-in="loggedIn"
      @onLogin="startLogin"
    />
  </v-container>
</template>

<script>
// import log from 'loglevel'
import { mapActions, mapState } from 'vuex'

import WalletConnectCard from '../../components/WalletHome/WalletConnectCard'
import PopupLogin from '../../containers/Popup/PopupLogin'
import PopupWidget from '../../containers/Popup/PopupWidget'
import { apiStreamSupported } from '../../utils/utils'

export default {
  name: 'Popup',
  components: { PopupLogin, PopupWidget, WalletConnectCard },
  computed: mapState({
    loggedIn: (state) => state.selectedAddress !== '' && state.wallet[state.selectedAddress] !== undefined,
    loginDialog: (state) => state.embedState.isOAuthModalVisible,
    torusWidgetVisibility: (state) => state.embedState.torusWidgetVisibility,
    loginInProgress: (state) => state.embedState.loginInProgress,
    showWalletConnect: (state) => {
      const loggedIn = state.selectedAddress !== '' && state.wallet[state.selectedAddress] !== undefined
      const canConnect = state.embedState.showWalletConnect && apiStreamSupported && loggedIn
      return canConnect
    },
    apiStreamSupported() {
      return apiStreamSupported()
    },
  }),
  methods: {
    ...mapActions({
      cancelLogin: 'cancelLogin',
      startLogin: 'startLogin',
    }),
  },
}
</script>

<style lang="scss" scoped>
@import 'Popup.scss';
</style>
