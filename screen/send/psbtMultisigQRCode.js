/* global alert */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, findNodeHandle, ScrollView, StyleSheet, View } from 'react-native';
import { getSystemName } from 'react-native-device-info';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';

import { BlueSpacing20, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import { SquareButton } from '../../components/SquareButton';
import loc from '../../loc';
import NFCComponent, { NFCComponentProxy } from '../../class/nfcmanager';
const bitcoin = require('bitcoinjs-lib');
const fs = require('../../blue_modules/fs');

const isDesktop = getSystemName() === 'Mac OS X';

const PsbtMultisigQRCode = () => {
  const { navigate } = useNavigation();
  const { colors } = useTheme();
  const openScannerButton = useRef();
  const nfcManagerComponent = useRef();
  const { psbtBase64, isShowOpenScanner } = useRoute().params;
  const [isLoading, setIsLoading] = useState(false);
  const [showNFCButton, setShowNFCButton] = useState(false);

  const psbt = bitcoin.Psbt.fromBase64(psbtBase64);
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    modalContentShort: {
      backgroundColor: colors.elevated,
    },
    exportButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
  });
  const fileName = `${Date.now()}.psbt`;

  useEffect(() => {
    NFCComponentProxy.isSupportedAndEnabled().then(setShowNFCButton);
  }, []);

  const onBarScanned = ret => {
    if (!ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      alert('BC-UR not decoded. This should never happen');
    } else if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      // we dont support it in this flow
      alert(loc.wallets.import_error);
    } else {
      // psbt base64?
      navigate('PsbtMultisig', { receivedPSBTBase64: ret.data });
    }
  };

  const openScanner = () => {
    if (isDesktop) {
      fs.showActionSheet({ anchor: findNodeHandle(openScannerButton.current) }).then(data => onBarScanned({ data }));
    } else {
      navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          onBarScanned: onBarScanned,
          showFileImportButton: true,
        },
      });
    }
  };

  const exportPSBT = () => {
    setIsLoading(true);
    setTimeout(() => fs.writeFileAndExport(fileName, psbt.toBase64()).finally(() => setIsLoading(false)), 10);
  };

  const exportPSBTToTag = () => {
    setIsLoading(true);
    nfcManagerComponent.current.writeNdef(psbt.toBase64()).finally(() => setIsLoading(false));
  };

  return (
    <SafeBlueArea style={stylesHook.root}>
      <ScrollView centerContent contentContainerStyle={styles.scrollViewContent}>
        <View style={[styles.modalContentShort, stylesHook.modalContentShort]}>
          <DynamicQRCode value={psbt.toHex()} />
          {!isShowOpenScanner && (
            <>
              <BlueSpacing20 />
              <SquareButton
                testID="CosignedScanOrImportFile"
                style={[styles.exportButton, stylesHook.exportButton]}
                onPress={openScanner}
                ref={openScannerButton}
                title={loc.multisig.scan_or_import_file}
              />
            </>
          )}
          <BlueSpacing20 />
          {isLoading ? (
            <ActivityIndicator />
          ) : (
            <>
              <SquareButton style={[styles.exportButton, stylesHook.exportButton]} onPress={exportPSBT} title={loc.multisig.share} />
              {showNFCButton && (
                <>
                  <BlueSpacing20 />
                  <SquareButton
                    style={[styles.exportButton, stylesHook.exportButton]}
                    onPress={exportPSBTToTag}
                    title={loc.wallets.write_to_nfc}
                  />
                </>
              )}
            </>
          )}
        </View>
        <NFCComponent ref={nfcManagerComponent} />
      </ScrollView>
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  modalContentShort: {
    marginLeft: 20,
    marginRight: 20,
  },
  copyToClipboard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButton: {
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});

PsbtMultisigQRCode.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.multisig.header }));

export default PsbtMultisigQRCode;
