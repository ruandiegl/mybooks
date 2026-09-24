import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { PasswordRequirements } from '../../components/PasswordRequirements';
import { TextField } from '../../components/TextField';
import { VerificationCodeField } from '../../components/VerificationCodeField';
import { authApi, authErrorMessage } from '../../features/auth/authApi';
import { maskBrazilianPhone, maskCpf } from '../../features/auth/inputMasks';
import { passwordIssues, validatePasswordConfirmation } from '../../features/auth/passwordRules';
import { useSession } from '../../providers/SessionProvider';
import { theme } from '../../styles/theme';
import { styles } from './styles';

type AuthStep = 'landing' | 'register' | 'verify' | 'login' | 'forgot' | 'reset';
const validEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return <View accessibilityRole="alert" style={styles.errorBanner}><MaterialIcons name="error-outline" size={19} color={theme.colors.danger} /><Text style={styles.errorBannerText}>{message}</Text></View>;
}

function NoticeBanner({ message }: { message?: string }) {
  if (!message) return null;
  return <View accessibilityRole="alert" style={styles.noticeBanner}><MaterialIcons name="check-circle-outline" size={19} color={theme.colors.success} /><Text style={styles.noticeBannerText}>{message}</Text></View>;
}

function InlineLink({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.inlineLink}><Text style={[styles.inlineLinkText, disabled && styles.disabledLink]}>{label}</Text></Pressable>;
}

function PasswordInput({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.passwordField}>
      <TextField accessibilityLabel={label} label={label} value={value} onChangeText={onChangeText} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="password" textContentType="password" style={styles.passwordInput} />
      <Pressable accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'} accessibilityRole="button" hitSlop={8} onPress={() => setVisible((current) => !current)} style={styles.passwordToggle}>
        <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={20} color={theme.colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

export function Auth() {
  const { establishSession } = useSession();
  const [step, setStep] = useState<AuthStep>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmation, setNewConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const title = useMemo(() => ({ landing: '', register: 'Crie sua conta', verify: 'Confirme seu e-mail', login: 'Entre na sua conta', forgot: 'Recupere sua senha', reset: 'Defina uma nova senha' }[step]), [step]);
  const go = (next: AuthStep) => { setError(undefined); setNotice(undefined); setStep(next); };
  const submit = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true); setError(undefined);
    try { await action(); } catch (cause) { setError(authErrorMessage(cause, fallback)); } finally { setBusy(false); }
  };

  const register = () => submit(async () => {
    if (!validEmail(email)) { setError('Digite um e-mail válido.'); return; }
    const issues = passwordIssues(password);
    if (issues.length) { setError(issues[0]); return; }
    const confirmationError = validatePasswordConfirmation(password, confirmation);
    if (confirmationError) { setError(confirmationError); return; }
    if (!cpf.trim()) { setError('Informe um CPF válido.'); return; }
    if (!phone.trim()) { setError('Informe um celular válido.'); return; }
    const result = await authApi.register({ email: email.trim().toLowerCase(), password, cpf, phone });
    setEmail(result.email); setCode(''); setResendSeconds(60); go('verify');
  }, 'Não foi possível criar sua conta. Confira os dados e tente novamente.');

  const verify = () => submit(async () => {
    if (code.length !== 6) { setError('Digite o código de 6 dígitos.'); return; }
    await establishSession(await authApi.verifyEmail({ email, code }));
  }, 'Código inválido ou expirado.');

  const login = () => submit(async () => {
    if (!validEmail(email) || !password) { setError('Informe e-mail e senha.'); return; }
    await establishSession(await authApi.login({ email: email.trim().toLowerCase(), password }));
  }, 'E-mail ou senha inválidos.');

  const forgot = () => submit(async () => {
    if (!validEmail(email)) { setError('Digite um e-mail válido.'); return; }
    await authApi.forgotPassword(email.trim().toLowerCase()); setCode('');
    setNotice('Se existir uma conta para este e-mail, enviaremos um código.'); setStep('reset');
  }, 'Não foi possível processar a solicitação.');

  const reset = () => submit(async () => {
    if (code.length !== 6) { setError('Digite o código de 6 dígitos.'); return; }
    const issues = passwordIssues(newPassword);
    if (issues.length) { setError(issues[0]); return; }
    const confirmationError = validatePasswordConfirmation(newPassword, newConfirmation);
    if (confirmationError) { setError(confirmationError); return; }
    await authApi.resetPassword({ email: email.trim().toLowerCase(), code, password: newPassword });
    setPassword(''); setNewPassword(''); setNewConfirmation(''); setNotice('Senha alterada. Entre novamente com sua nova senha.'); setStep('login');
  }, 'Código inválido ou expirado.');

  const resend = () => submit(async () => {
    await authApi.resendVerification(email); setResendSeconds(60); setNotice('Se o cadastro estiver pendente, um novo código será enviado.');
  }, 'Aguarde e tente reenviar novamente.');

  if (step === 'landing') {
    return <SafeAreaView style={styles.safe}><View style={styles.body}><Text style={styles.brand}>TrocaLivros</Text><View style={styles.hero}><View style={styles.mark}><MaterialIcons name="auto-stories" size={42} color={theme.colors.white} /></View><Text style={styles.title}>Livros parados.{"\n"}<Text style={styles.accent}>Histórias circulando.</Text></Text><Text style={styles.description}>Crie sua conta para cadastrar livros, descobrir novas leituras e combinar trocas com segurança.</Text></View><View style={styles.actions}><AppButton label="Criar minha conta" onPress={() => go('register')} /><AppButton label="Já tenho uma conta" variant="outline" onPress={() => go('login')} /></View></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formScroll}>
      <Pressable accessibilityRole="button" onPress={() => go('landing')} style={styles.backButton}><MaterialIcons name="arrow-back" size={20} color={theme.colors.foreground} /><Text style={styles.backLabel}>Voltar</Text></Pressable>
      <View style={styles.formIntro}><Text style={styles.formEyebrow}>Conta segura</Text><Text style={styles.formTitle}>{title}</Text>{step === 'verify' ? <Text style={styles.formDescription}>Enviamos um código para {email}.</Text> : null}</View>
      <Card style={styles.formCard}>
        <ErrorBanner message={error} /><NoticeBanner message={notice} />
        {step === 'register' ? <><TextField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" /><PasswordInput label="Senha" value={password} onChangeText={setPassword} /><PasswordRequirements password={password} /><PasswordInput label="Confirme a senha" value={confirmation} onChangeText={setConfirmation} /><TextField label="CPF" value={cpf} onChangeText={(value) => setCpf(maskCpf(value))} keyboardType="number-pad" autoComplete="off" placeholder="000.000.000-00" maxLength={14} /><TextField label="Celular" value={phone} onChangeText={(value) => setPhone(maskBrazilianPhone(value))} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="(11) 91234-5678" maxLength={15} /><Text style={styles.legal}>Seus dados serão usados para proteger a conta e preparar recursos de assinatura. CPF não será exibido publicamente.</Text><AppButton label="Criar conta" loading={busy} onPress={register} /><View style={styles.modeSwitch}><Text style={styles.modeSwitchLabel}>Já tem conta?</Text><InlineLink label="Entrar" onPress={() => go('login')} /></View></> : null}
        {step === 'verify' ? <><VerificationCodeField value={code} onChangeText={setCode} /><AppButton label="Confirmar e continuar" loading={busy} onPress={verify} /><InlineLink disabled={busy || resendSeconds > 0} label={resendSeconds > 0 ? `Reenviar em ${resendSeconds}s` : 'Reenviar código'} onPress={resend} /></> : null}
        {step === 'login' ? <><TextField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" /><PasswordInput label="Senha" value={password} onChangeText={setPassword} /><AppButton label="Entrar" loading={busy} onPress={login} /><InlineLink label="Esqueci minha senha" onPress={() => go('forgot')} /><View style={styles.modeSwitch}><Text style={styles.modeSwitchLabel}>Ainda não tem conta?</Text><InlineLink label="Criar conta" onPress={() => go('register')} /></View></> : null}
        {step === 'forgot' ? <><Text style={styles.stepDescription}>Informe seu e-mail. A resposta será a mesma exista ou não uma conta, para proteger sua privacidade.</Text><TextField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" /><AppButton label="Enviar código" loading={busy} onPress={forgot} /></> : null}
        {step === 'reset' ? <><VerificationCodeField value={code} onChangeText={setCode} /><PasswordInput label="Nova senha" value={newPassword} onChangeText={setNewPassword} /><PasswordRequirements password={newPassword} /><PasswordInput label="Confirme a nova senha" value={newConfirmation} onChangeText={setNewConfirmation} /><AppButton label="Alterar senha" loading={busy} onPress={reset} /></> : null}
      </Card>
    </ScrollView></KeyboardAvoidingView></SafeAreaView>
  );
}
