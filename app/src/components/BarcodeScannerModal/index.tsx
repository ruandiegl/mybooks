import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  CameraView,
  PermissionStatus,
  useCameraPermissions,
  type BarcodeScanningResult
} from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getBarcodeScanDecision,
  shouldRefreshCameraPermission,
  shouldRequestCameraPermission
} from '../../features/books/scannerFlow';
import { theme } from '../../styles/theme';
import { AppButton } from '../AppButton';
import { styles } from './styles';

export type BarcodeScannerModalProps = {
  visible: boolean;
  onClose: () => void;
  onIsbnScanned: (isbn: string) => void;
};

export function BarcodeScannerModal({ visible, onClose, onIsbnScanned }: BarcodeScannerModalProps) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [invalidBarcode, setInvalidBarcode] = useState(false);
  const [locked, setLocked] = useState(false);
  const requestedForOpen = useRef(false);
  const lockedRef = useRef(false);
  const lastDataRef = useRef<string | null>(null);
  const waitingForSettingsRef = useRef(false);

  function announce(message: string) {
    AccessibilityInfo.announceForAccessibility(message);
  }

  function showScannerError(message: string) {
    setScannerError(message);
    announce(message);
  }

  async function askForPermission() {
    setRequestingPermission(true);
    setScannerError(null);
    try {
      await requestPermission();
    } catch {
      showScannerError('Não foi possível solicitar a permissão da câmera. Tente novamente ou digite o ISBN.');
    } finally {
      setRequestingPermission(false);
    }
  }

  async function refreshPermission() {
    try {
      await getPermission();
      setScannerError(null);
    } catch {
      showScannerError('Não foi possível atualizar a permissão da câmera. Tente novamente ou digite o ISBN.');
    }
  }

  async function openCameraSettings() {
    setScannerError(null);
    waitingForSettingsRef.current = true;
    try {
      await Linking.openSettings();
    } catch {
      waitingForSettingsRef.current = false;
      showScannerError('Não foi possível abrir as configurações. Abra-as manualmente ou digite o ISBN.');
    }
  }

  useEffect(() => {
    if (!visible) {
      requestedForOpen.current = false;
      lockedRef.current = false;
      lastDataRef.current = null;
      setLocked(false);
      setInvalidBarcode(false);
      setScannerError(null);
      waitingForSettingsRef.current = false;
      return;
    }

    if (shouldRequestCameraPermission({
      visible,
      permissionStatus: permission?.status === PermissionStatus.UNDETERMINED
        ? 'undetermined'
        : permission?.status ?? null,
      requestedForOpen: requestedForOpen.current
    })) {
      requestedForOpen.current = true;
      void askForPermission();
    }
  }, [permission, visible]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (!shouldRefreshCameraPermission({
        appState: nextState,
        visible,
        waitingForSettings: waitingForSettingsRef.current
      })) return;
      waitingForSettingsRef.current = false;
      void refreshPermission();
    });
    return () => subscription.remove();
  }, [visible, getPermission]);

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    const decision = getBarcodeScanDecision({
      payload: result,
      locked: lockedRef.current,
      lastData: lastDataRef.current
    });
    if (decision.kind === 'duplicate') return;

    lastDataRef.current = decision.data;
    if (decision.kind === 'invalid') {
      setInvalidBarcode(true);
      announce('Esse código não é um ISBN válido. Tente outro ou digite manualmente.');
      return;
    }

    lockedRef.current = true;
    setLocked(true);
    setInvalidBarcode(false);
    announce('ISBN reconhecido. Buscando dados do livro.');
    onIsbnScanned(decision.isbn);
  }

  function handleCameraMountError() {
    showScannerError('Não foi possível iniciar a câmera. Tente novamente ou digite o ISBN.');
  }

  const close = () => {
    lockedRef.current = true;
    setLocked(true);
    onClose();
  };

  const permissionGranted = permission?.granted === true;
  const permissionBlocked = permission?.granted === false && permission.canAskAgain === false;
  const showPermissionLoading = permission === null || requestingPermission;
  const showCamera = visible && permissionGranted && !scannerError;

  const retryPermission = () => {
    if (permissionGranted) {
      setScannerError(null);
      return;
    }
    if (permissionBlocked) {
      void openCameraSettings();
      return;
    }
    void askForPermission();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {showCamera ? (
          <CameraView
            active={showCamera}
            barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
            facing="back"
            onBarcodeScanned={locked ? undefined : handleBarcodeScanned}
            onMountError={handleCameraMountError}
            style={styles.camera}
          />
        ) : null}

        {showCamera ? (
          <View pointerEvents="none" style={styles.overlay}>
            <View style={styles.topShade} />
            <View style={styles.scanRow}>
              <View style={styles.sideShade} />
              <View style={styles.scanFrame} />
              <View style={styles.sideShade} />
            </View>
            <View style={styles.bottomShade} />
          </View>
        ) : null}

        <Pressable
          accessibilityLabel="Fechar leitor de código de barras"
          accessibilityRole="button"
          hitSlop={8}
          onPress={close}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <MaterialIcons color={theme.colors.white} name="close" size={28} />
        </Pressable>

        {!showCamera ? (
          <ScrollView
            contentContainerStyle={styles.permissionContent}
            style={styles.permissionScroll}
          >
            <View style={styles.permissionCard}>
            {showPermissionLoading ? (
              <>
                <ActivityIndicator color={theme.colors.primary} size="large" />
                <Text style={styles.permissionTitle}>Preparando a câmera</Text>
                <Text style={styles.permissionText}>Aguarde enquanto verificamos a permissão.</Text>
              </>
            ) : (
              <>
                <MaterialIcons color={theme.colors.primary} name="photo-camera" size={34} />
                <Text style={styles.permissionTitle}>
                  {scannerError ? 'Câmera indisponível' : 'Permissão de câmera necessária'}
                </Text>
                <Text style={styles.permissionText}>
                  {scannerError ?? (permissionBlocked
                    ? 'Ative a câmera nas configurações do aparelho para ler o ISBN.'
                    : 'Permita o acesso à câmera para ler o código de barras. Você também pode digitar o ISBN.')}
                </Text>
                <AppButton
                  accessibilityLabel={permissionBlocked ? 'Abrir configurações da câmera' : 'Tentar permitir câmera novamente'}
                  label={permissionBlocked ? 'Abrir configurações' : 'Tentar novamente'}
                  onPress={retryPermission}
                />
              </>
            )}
              <AppButton
                accessibilityLabel="Fechar leitor e digitar o ISBN"
                label="Digitar ISBN"
                onPress={close}
                variant="outline"
              />
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.cameraChromeContent}
            style={styles.cameraChrome}
          >
            <View style={styles.header} pointerEvents="none">
              <Text style={styles.eyebrow}>LEITOR DE ISBN</Text>
              <Text style={styles.title}>Aponte para o código de barras do livro</Text>
            </View>
            <View style={styles.footer}>
              <Text accessibilityLiveRegion="polite" style={[styles.hint, invalidBarcode && styles.invalidHint]}>
                {locked
                  ? 'ISBN reconhecido. Buscando dados do livro…'
                  : invalidBarcode
                    ? 'Esse código não é um ISBN válido. Tente outro ou digite manualmente.'
                    : 'Centralize o EAN-13 na moldura. A leitura é automática.'}
              </Text>
              <AppButton
                accessibilityLabel="Fechar leitor e digitar o ISBN"
                label="Digitar ISBN"
                onPress={close}
                style={styles.manualButton}
                variant="secondary"
              />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
