
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native'; // Added Modal, ScrollView
import { useTranslation } from 'react-i18next'; // Import i18n hook
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { supabaseService } from '../services/supabase';
import Icon from './Icon';
import { LANGUAGES } from '../i18n';

interface LoginProps {
  onLogin: (email: string) => void;
}

const STORED_CREDENTIALS_KEY = 'vouchervault_credentials';

const Login: React.FC<LoginProps> = () => {
  const { t, i18n } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Check biometric availability and stored credentials on mount
  useEffect(() => {
    const checkBiometricAndCredentials = async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      // Check if we have stored credentials
      const stored = await SecureStore.getItemAsync(STORED_CREDENTIALS_KEY);
      if (stored) {
        setHasStoredCredentials(true);
        // Auto-trigger Face ID login
        if (compatible && enrolled) {
          handleBiometricLogin();
        }
      }
    };
    checkBiometricAndCredentials();
  }, []);

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('login.loginWithBiometrics'),
        cancelLabel: t('login.cancel'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        const stored = await SecureStore.getItemAsync(STORED_CREDENTIALS_KEY);
        if (stored) {
          setLoading(true);
          const { email: storedEmail, password: storedPassword } = JSON.parse(stored);
          await supabaseService.signIn(storedEmail, storedPassword);
        }
      }
    } catch (err: any) {
      setError(t('login.biometricFailed'));
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email || !password || (isRegister && (!firstName || !lastName))) {
      setError(t('login.fillAllFields'));
      return;
    }

    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        // Pass language to signUp if supported, or update profile after
        await supabaseService.signUp(email, password, fullName);
        // Note: Actual language saving to DB might happen in supabase.ts if we pass it, 
        // or we can rely on client-side persistence for now.
      } else {
        await supabaseService.signIn(email, password);

        // After successful login, offer to enable biometric login
        if (biometricAvailable && !hasStoredCredentials) {
          Alert.alert(
            t('login.enableBiometrics'),
            t('login.enableBiometricsPrompt'),
            [
              { text: t('login.no'), style: 'cancel' },
              {
                text: t('login.yesActivate'),
                onPress: async () => {
                  await SecureStore.setItemAsync(
                    STORED_CREDENTIALS_KEY,
                    JSON.stringify({ email, password })
                  );
                }
              }
            ]
          );
        }
      }
    } catch (err: any) {
      setError(err.message || t('login.errorOccurred'));
      setLoading(false);
    }
  };

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageModal(false);
  };

  const currentLanguageLabel = LANGUAGES.find(l => l.code === i18n.language)?.label || 'Deutsch';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.inner}>
        {/* Language Selector Button */}
        <TouchableOpacity style={styles.languageButton} onPress={() => setShowLanguageModal(true)}>
          <Icon name="globe-outline" size={20} color="#6b7280" />
          <Text style={styles.languageButtonText}>{currentLanguageLabel}</Text>
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Icon name="ticket" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>{isRegister ? t('login.createAccount') : t('login.welcomeBack')}</Text>
          <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
        </View>

        <View style={styles.form}>
          {/* Face ID Button */}
          {!isRegister && hasStoredCredentials && biometricAvailable && (
            <TouchableOpacity
              style={styles.faceIdButton}
              onPress={handleBiometricLogin}
              disabled={loading}
            >
              <Icon name="finger-print-outline" size={28} color="#2563eb" />
              <Text style={styles.faceIdButtonText}>{t('login.loginWithBiometricsBtn')}</Text>
            </TouchableOpacity>
          )}

          {!isRegister && hasStoredCredentials && biometricAvailable && (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('login.or')}</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {isRegister && (
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>{t('login.firstName')}</Text>
                <TextInput style={styles.input} placeholder="Max" placeholderTextColor="#9ca3af" value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{t('login.lastName')}</Text>
                <TextInput style={styles.input} placeholder="Mustermann" placeholderTextColor="#9ca3af" value={lastName} onChangeText={setLastName} />
              </View>
            </View>
          )}

          <Text style={styles.label}>{t('login.email')}</Text>
          <TextInput
            style={styles.input}
            placeholder="beispiel@email.ch"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t('login.password')}</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isRegister ? t('login.registerNow') : t('login.login')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.toggleMode} onPress={() => setIsRegister(!isRegister)}>
            <Text style={styles.toggleModeText}>
              {isRegister ? t('login.haveAccount') : t('login.noAccount')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Language Modal */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('login.language')}</Text>
            <ScrollView>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langItem, i18n.language === lang.code && styles.langItemActive]}
                  onPress={() => changeLanguage(lang.code)}
                >
                  <Text style={[styles.langText, i18n.language === lang.code && styles.langTextActive]}>{lang.label}</Text>
                  {i18n.language === lang.code && <Icon name="checkmark" size={20} color="#2563eb" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowLanguageModal(false)}>
              <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 70, height: 70, backgroundColor: '#2563eb', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 26, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  form: { width: '100%' },
  row: { flexDirection: 'row', width: '100%' },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6, marginLeft: 4 },
  input: { height: 50, backgroundColor: '#f3f4f6', borderRadius: 14, paddingHorizontal: 16, marginBottom: 16, fontSize: 16, color: '#1f2937' },
  button: { height: 55, backgroundColor: '#2563eb', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  errorText: { color: '#ef4444', fontSize: 13, marginBottom: 10, textAlign: 'center', fontWeight: '600' },
  toggleMode: { marginTop: 20, alignItems: 'center' },
  toggleModeText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  faceIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 55,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#2563eb',
    gap: 12,
    marginBottom: 20
  },
  faceIdButtonText: { color: '#2563eb', fontSize: 17, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { color: '#9ca3af', fontSize: 13, marginHorizontal: 12 },

  // Language Selector Styles
  languageButton: { position: 'absolute', top: 60, right: 30, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  languageButtonText: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: '#374151' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', width: '100%', maxWidth: 320, borderRadius: 24, padding: 20, maxHeight: 500 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center', color: '#111827' },
  langItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  langItemActive: { backgroundColor: '#eff6ff', marginHorizontal: -20, paddingHorizontal: 20 },
  langText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  langTextActive: { color: '#2563eb', fontWeight: '700' },
  modalCloseBtn: { marginTop: 20, alignItems: 'center', padding: 10 },
  modalCloseText: { color: '#6b7280', fontSize: 16, fontWeight: '600' }
});

export default Login;
