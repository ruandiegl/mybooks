import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSignIn, useSignUp } from '@clerk/expo';
import { useSignInWithGoogle } from '@clerk/expo/google';
import { useSSO } from '@clerk/expo';
import { useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { TextField } from '../../components/TextField';
import { useSession } from '../../providers/SessionProvider';
import { theme } from '../../styles/theme';
import { styles } from './styles';

type AuthAction = 'sign-in' | 'sign-up';
type AuthStep = 'landing' | 'form' | 'verify-email' | 'mfa' | 'reset-email' | 'reset-code' | 'reset-password';
type MfaStrategy = 'email_code' | 'phone_code' | 'totp' | 'backup_code';

type ClerkErrorShape = {
  message?: string;
  longMessage?: string;
  errors?: ClerkErrorShape[];
};

function firstErrorMessage(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstErrorMessage(item);
      if (message) return message;
    }
    return undefined;
  }
  if (typeof value !== 'object') return undefined;

  const error = value as ClerkErrorShape;
  return error.longMessage || error.message || firstErrorMessage(error.errors);
}

function errorMessage(error: unknown, fallback: string) {
  return firstErrorMessage(error) || fallback;
}

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email.trim());
}

function PasswordField({ label, value, onChangeText, error, visible, onToggle }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.passwordField}>
      <TextField
        label={label}
        value={value}
        onChangeText={onChangeText}
        error={error}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        style={styles.passwordInput}
      />
      <Pressable
        accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onToggle}
        style={styles.passwordToggle}
      >
        <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={20} color={theme.colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={styles.errorBanner}>
      <MaterialIcons name="error-outline" size={19} color={theme.colors.danger} />
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

function InlineLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.inlineLink}>
      <Text style={styles.inlineLinkText}>{label}</Text>
    </Pressable>
  );
}

function GoogleAuthControls({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  return (
    <View style={styles.socialAuth}>
      <View style={styles.socialDivider}>
        <View style={styles.socialDividerLine} />
        <Text style={styles.socialDividerText}>ou continue com</Text>
        <View style={styles.socialDividerLine} />
      </View>
      <Pressable
        accessibilityLabel="Continuar com Google"
        accessibilityRole="button"
        disabled={loading}
        onPress={onPress}
        style={({ pressed }) => [styles.googleButton, loading && styles.googleButtonDisabled, pressed && { opacity: 0.82 }]}
      >
        <View style={styles.googleLogo}>
          <Text style={styles.googleLogoText}>G</Text>
        </View>
        <Text style={styles.googleLabel}>{loading ? 'Conectando ao Google...' : 'Continuar com Google'}</Text>
      </Pressable>
      <Text style={styles.socialHint}>No celular, o Google abre o seletor seguro de contas do aparelho.</Text>
    </View>
  );
}

function AuthLanding({ mode, loading, onAction }: {
  mode: 'clerk' | 'development';
  loading?: AuthAction | null;
  onAction: (action: AuthAction) => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.brand}>mybooks.</Text>
        <View style={styles.hero}>
          <View style={styles.mark}>
            <MaterialIcons name="auto-stories" size={42} color={theme.colors.white} />
          </View>
          <Text style={styles.title}>
            Livros parados.{"\n"}
            <Text style={styles.accent}>Histórias circulando.</Text>
          </Text>
          <Text style={styles.description}>
            Encontre leitores por perto, combine trocas e converse com segurança em um só lugar.
          </Text>
        </View>
        <View style={styles.actions}>
          <AppButton
            label={mode === 'development' ? 'Entrar no modo local' : 'Entrar'}
            icon="arrow-forward"
            loading={loading === 'sign-in'}
            onPress={() => onAction('sign-in')}
          />
          <AppButton
            label="Criar minha conta"
            variant="outline"
            loading={loading === 'sign-up'}
            onPress={() => onAction('sign-up')}
          />
          <Text style={styles.finePrint}>
            Ao continuar, você concorda com os termos da comunidade. Sua conta e seus dados ficam protegidos pelo Clerk.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AuthShell({ eyebrow, title, description, onBack, children }: {
  eyebrow: string;
  title: string;
  description: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.authTop}>
            <Pressable accessibilityLabel="Voltar" accessibilityRole="button" onPress={onBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={20} color={theme.colors.foreground} />
              <Text style={styles.backLabel}>Voltar</Text>
            </Pressable>
            <Text style={styles.authBrand}>mybooks.</Text>
          </View>
          <View style={styles.formIntro}>
            <View style={styles.formMark}>
              <MaterialIcons name="auto-stories" size={22} color={theme.colors.white} />
            </View>
            <Text style={styles.formEyebrow}>{eyebrow}</Text>
            <Text style={styles.formTitle}>{title}</Text>
            <Text style={styles.formDescription}>{description}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function VerificationStep({ action, email, code, onCodeChange, error, loading, onSubmit, onResend, onChangeEmail }: {
  action: AuthAction;
  email: string;
  code: string;
  onCodeChange: (value: string) => void;
  error?: string;
  loading: boolean;
  onSubmit: () => void;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  return (
    <Card style={styles.formCard}>
      <Text style={styles.stepTitle}>{action === 'sign-up' ? 'Confirme seu e-mail' : 'Digite o código de acesso'}</Text>
      <Text style={styles.stepDescription}>
        Enviamos um código para <Text style={styles.emphasis}>{email}</Text>. Ele é válido por alguns minutos.
      </Text>
      <TextField
        label="Código de verificação"
        value={code}
        onChangeText={onCodeChange}
        error={error}
        placeholder="000000"
        keyboardType="number-pad"
        autoCapitalize="none"
        maxLength={8}
        textContentType="oneTimeCode"
      />
      <AppButton label="Confirmar código" icon="verified" loading={loading} onPress={onSubmit} />
      {action === 'sign-up' ? <View nativeID="clerk-captcha" style={styles.captchaMount} /> : null}
      <View style={styles.stepActions}>
        <InlineLink label="Enviar outro código" onPress={onResend} />
        <InlineLink label="Usar outro e-mail" onPress={onChangeEmail} />
      </View>
    </Card>
  );
}

function MfaStep({ strategy, code, onCodeChange, error, loading, onSubmit, onChangeStrategy }: {
  strategy: MfaStrategy;
  code: string;
  onCodeChange: (value: string) => void;
  error?: string;
  loading: boolean;
  onSubmit: () => void;
  onChangeStrategy: () => void;
}) {
  const labels: Record<MfaStrategy, string> = {
    email_code: 'seu e-mail',
    phone_code: 'seu telefone',
    totp: 'seu aplicativo autenticador',
    backup_code: 'seus códigos de recuperação'
  };

  return (
    <Card style={styles.formCard}>
      <Text style={styles.stepTitle}>Mais uma camada de segurança</Text>
      <Text style={styles.stepDescription}>Digite o código enviado para {labels[strategy]} para continuar.</Text>
      <TextField
        label={strategy === 'totp' ? 'Código do autenticador' : 'Código de segurança'}
        value={code}
        onChangeText={onCodeChange}
        error={error}
        placeholder="000000"
        keyboardType="number-pad"
        autoCapitalize="none"
        maxLength={12}
      />
      <AppButton label="Continuar" icon="lock-open" loading={loading} onPress={onSubmit} />
      <InlineLink label="Escolher outra forma" onPress={onChangeStrategy} />
    </Card>
  );
}

function DevelopmentAuthFlow({ startAuth }: { startAuth?: (mode: AuthAction) => Promise<void> }) {
  const [loading, setLoading] = useState<AuthAction | null>(null);

  async function authenticate(action: AuthAction) {
    if (!startAuth) return;
    try {
      setLoading(action);
      await startAuth(action);
    } catch {
      Alert.alert('Não foi possível abrir a autenticação', 'Confira sua conexão e tente novamente.');
    } finally {
      setLoading(null);
    }
  }

  return <AuthLanding mode="development" loading={loading} onAction={authenticate} />;
}

function ClerkAuthFlow() {
  const { signIn, errors: signInErrors, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, errors: signUpErrors, fetchStatus: signUpFetchStatus } = useSignUp();
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  const { startSSOFlow } = useSSO();
  const [action, setAction] = useState<AuthAction>('sign-in');
  const [step, setStep] = useState<AuthStep>('landing');
  const [formError, setFormError] = useState<string>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [mfaStrategy, setMfaStrategy] = useState<MfaStrategy>('email_code');
  const [googleLoading, setGoogleLoading] = useState(false);

  const loading = signInFetchStatus === 'fetching' || signUpFetchStatus === 'fetching';
  const signInFieldError = (field: 'identifier' | 'password' | 'code') => firstErrorMessage(signInErrors?.fields?.[field]);
  const signUpFieldError = (field: 'firstName' | 'emailAddress' | 'password' | 'code') => firstErrorMessage(signUpErrors?.fields?.[field]);

  function clearFormError() {
    setFormError(undefined);
  }

  function selectAction(nextAction: AuthAction) {
    setAction(nextAction);
    setStep('form');
    setFormError(undefined);
    setCode('');
    setPassword('');
    setPasswordConfirmation('');
  }

  function goBack() {
    clearFormError();
    setCode('');
    if (step === 'landing') return;
    if (step !== 'form') {
      setStep('form');
      return;
    }
    setStep('landing');
  }

  function resetToEmailForm() {
    clearFormError();
    setCode('');
    setStep('form');
  }

  async function finishSignIn() {
    const result = await signIn?.finalize();
    if (result?.error) throw result.error;
  }

  async function finishSignUp() {
    const result = await signUp?.finalize();
    if (result?.error) throw result.error;
  }

  function availableMfaStrategy(): MfaStrategy | undefined {
    const factors = signIn?.supportedSecondFactors;
    if (!Array.isArray(factors)) return undefined;
    const strategies: MfaStrategy[] = ['email_code', 'phone_code', 'totp', 'backup_code'];
    return strategies.find((candidate) => factors.some((factor) => factor.strategy === candidate));
  }

  async function sendMfaCode(strategy: MfaStrategy) {
    if (!signIn) return;
    const result = strategy === 'email_code'
      ? await signIn.mfa.sendEmailCode()
      : strategy === 'phone_code'
        ? await signIn.mfa.sendPhoneCode()
        : undefined;
    if (result?.error) throw result.error;
  }

  async function submitGoogle() {
    clearFormError();
    setGoogleLoading(true);
    try {
      const result = Platform.OS === 'web'
        ? await startSSOFlow({ strategy: 'oauth_google' })
        : await startGoogleAuthenticationFlow();

      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
        return;
      }

      if (result.signUp?.status === 'missing_requirements') {
        setFormError('Sua conta Google precisa de mais um dado antes de entrar. Confira as configurações de cadastro no Clerk.');
      }
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : undefined;
      if (code === 'SIGN_IN_CANCELLED' || code === '-5') return;
      setFormError(errorMessage(error, 'Não foi possível entrar com o Google agora. Tente novamente.'));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function submitSignIn() {
    clearFormError();
    if (!signIn) return;
    if (!isValidEmail(email)) {
      setFormError('Digite um e-mail válido para entrar.');
      return;
    }
    if (!password) {
      setFormError('Digite sua senha para entrar.');
      return;
    }

    try {
      const result = await signIn.password({ emailAddress: email.trim(), password });
      if (result.error) throw result.error;
      if (signIn.status === 'complete') {
        await finishSignIn();
        return;
      }
      if (signIn.status === 'needs_second_factor') {
        const strategy = availableMfaStrategy();
        if (!strategy) throw new Error('Sua conta pede uma segunda etapa que ainda não está disponível nesta tela.');
        setMfaStrategy(strategy);
        if (strategy === 'email_code' || strategy === 'phone_code') await sendMfaCode(strategy);
        setCode('');
        setStep('mfa');
        return;
      }
      if (signIn.status === 'needs_client_trust') {
        throw new Error('Este acesso precisa ser confirmado pelo dispositivo. Tente novamente neste aparelho.');
      }
      throw new Error('Não foi possível concluir o acesso. Confira seus dados e tente novamente.');
    } catch (error) {
      setFormError(errorMessage(error, 'Não foi possível entrar. Confira seus dados e tente novamente.'));
    }
  }

  async function submitSignUp() {
    clearFormError();
    if (!signUp) return;
    if (fullName.trim().length < 2) {
      setFormError('Digite seu nome para criar a conta.');
      return;
    }
    if (!isValidEmail(email)) {
      setFormError('Digite um e-mail válido para criar a conta.');
      return;
    }
    if (password.length < 8) {
      setFormError('Sua senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== passwordConfirmation) {
      setFormError('As senhas precisam ser iguais.');
      return;
    }

    try {
      const names = fullName.trim().split(/\s+/);
      const firstName = names.shift() || fullName.trim();
      const lastName = names.join(' ') || undefined;
      const result = await signUp.password({ emailAddress: email.trim(), password, firstName, lastName });
      if (result.error) throw result.error;
      if (signUp.status === 'complete') {
        await finishSignUp();
        return;
      }
      if (signUp.unverifiedFields?.includes('email_address')) {
        const verification = await signUp.verifications.sendEmailCode();
        if (verification.error) throw verification.error;
        setCode('');
        setStep('verify-email');
        return;
      }
      throw new Error('Ainda faltam dados para concluir seu cadastro.');
    } catch (error) {
      setFormError(errorMessage(error, 'Não foi possível criar sua conta. Confira os dados e tente novamente.'));
    }
  }

  async function submitMfa() {
    clearFormError();
    if (!signIn || !code.trim()) {
      setFormError('Digite o código de segurança.');
      return;
    }
    try {
      let result: { error?: unknown };
      if (mfaStrategy === 'email_code') result = await signIn.mfa.verifyEmailCode({ code: code.trim() });
      else if (mfaStrategy === 'phone_code') result = await signIn.mfa.verifyPhoneCode({ code: code.trim() });
      else if (mfaStrategy === 'totp') result = await signIn.mfa.verifyTOTP({ code: code.trim() });
      else result = await signIn.mfa.verifyBackupCode({ code: code.trim() });
      if (result.error) throw result.error;
      await finishSignIn();
    } catch (error) {
      setFormError(errorMessage(error, 'O código não foi aceito. Confira e tente novamente.'));
    }
  }

  async function submitEmailVerification() {
    clearFormError();
    if (!signUp || !code.trim()) {
      setFormError('Digite o código recebido por e-mail.');
      return;
    }
    try {
      const result = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (result.error) throw result.error;
      if (signUp.status === 'complete') await finishSignUp();
      else throw new Error('O cadastro ainda precisa de mais uma confirmação.');
    } catch (error) {
      setFormError(errorMessage(error, 'O código não foi aceito. Confira e tente novamente.'));
    }
  }

  async function resendEmailCode() {
    clearFormError();
    try {
      const result = step === 'verify-email'
        ? await signUp?.verifications.sendEmailCode()
        : mfaStrategy === 'email_code'
          ? await signIn?.mfa.sendEmailCode()
          : await signIn?.mfa.sendPhoneCode();
      if (result?.error) throw result.error;
    } catch (error) {
      setFormError(errorMessage(error, 'Não foi possível enviar outro código agora.'));
    }
  }

  async function beginPasswordReset() {
    clearFormError();
    if (!signIn) return;
    if (!isValidEmail(email)) {
      setFormError('Digite o e-mail da sua conta.');
      return;
    }
    try {
      const result = await signIn.create({ identifier: email.trim() });
      if (result.error) throw result.error;
      const codeResult = await signIn.resetPasswordEmailCode.sendCode();
      if (codeResult.error) throw codeResult.error;
      setCode('');
      setStep('reset-code');
    } catch (error) {
      setFormError(errorMessage(error, 'Não foi possível iniciar a recuperação agora.'));
    }
  }

  async function verifyPasswordResetCode() {
    clearFormError();
    if (!signIn || !code.trim()) {
      setFormError('Digite o código recebido por e-mail.');
      return;
    }
    try {
      const result = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (result.error) throw result.error;
      setStep('reset-password');
    } catch (error) {
      setFormError(errorMessage(error, 'O código não foi aceito. Confira e tente novamente.'));
    }
  }

  async function submitNewPassword() {
    clearFormError();
    if (!signIn) return;
    if (newPassword.length < 8) {
      setFormError('Sua nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== newPasswordConfirmation) {
      setFormError('As senhas precisam ser iguais.');
      return;
    }
    try {
      const result = await signIn.resetPasswordEmailCode.submitPassword({ password: newPassword, signOutOfOtherSessions: true });
      if (result.error) throw result.error;
      await finishSignIn();
    } catch (error) {
      setFormError(errorMessage(error, 'Não foi possível atualizar sua senha.'));
    }
  }

  function renderForm() {
    const isSignUp = action === 'sign-up';
    return (
      <Card style={styles.formCard}>
        <ErrorBanner message={formError || firstErrorMessage(isSignUp ? signUpErrors?.global : signInErrors?.global)} />
        {isSignUp ? (
          <TextField
            label="Nome completo"
            value={fullName}
            onChangeText={setFullName}
            error={signUpFieldError('firstName')}
            placeholder="Como você quer ser chamado?"
            autoCapitalize="words"
            textContentType="name"
          />
        ) : null}
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          error={isSignUp ? signUpFieldError('emailAddress') : signInFieldError('identifier')}
          placeholder="voce@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
        />
        <PasswordField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          error={isSignUp ? signUpFieldError('password') : signInFieldError('password')}
          visible={passwordVisible}
          onToggle={() => setPasswordVisible((visible) => !visible)}
        />
        {isSignUp ? (
          <PasswordField
            label="Repita sua senha"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            visible={passwordVisible}
            onToggle={() => setPasswordVisible((visible) => !visible)}
          />
        ) : (
          <InlineLink label="Esqueci minha senha" onPress={() => { clearFormError(); setStep('reset-email'); }} />
        )}
        {isSignUp ? <View nativeID="clerk-captcha" style={styles.captchaMount} /> : null}
        <GoogleAuthControls loading={loading || googleLoading} onPress={() => void submitGoogle()} />
        <AppButton label={isSignUp ? 'Criar minha conta' : 'Entrar'} icon="arrow-forward" loading={loading || googleLoading} onPress={() => void (isSignUp ? submitSignUp() : submitSignIn())} />
        <View style={styles.modeSwitch}>
          <Text style={styles.modeSwitchLabel}>{isSignUp ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}</Text>
          <InlineLink label={isSignUp ? 'Entrar' : 'Criar conta'} onPress={() => selectAction(isSignUp ? 'sign-in' : 'sign-up')} />
        </View>
        <Text style={styles.legal}>Seus dados de acesso são processados com segurança pelo Clerk.</Text>
      </Card>
    );
  }

  if (!signIn || !signUp) return <AuthLanding mode="clerk" loading={null} onAction={selectAction} />;
  if (step === 'landing') return <AuthLanding mode="clerk" loading={null} onAction={selectAction} />;

  if (step === 'verify-email') {
    return (
      <AuthShell eyebrow="Quase lá" title="Confirme seu e-mail." description="Só falta confirmar que este e-mail é seu para liberar sua estante." onBack={goBack}>
        <ErrorBanner message={formError} />
        <VerificationStep
          action="sign-up"
          email={email}
          code={code}
          onCodeChange={setCode}
          error={firstErrorMessage(signUpErrors?.fields?.code)}
          loading={loading}
          onSubmit={() => void submitEmailVerification()}
          onResend={() => void resendEmailCode()}
          onChangeEmail={resetToEmailForm}
        />
      </AuthShell>
    );
  }

  if (step === 'mfa') {
    return (
      <AuthShell eyebrow="Acesso protegido" title="Mais uma etapa." description="Uma confirmação extra ajuda a manter sua conta e suas conversas protegidas." onBack={goBack}>
        <ErrorBanner message={formError} />
        <MfaStep
          strategy={mfaStrategy}
          code={code}
          onCodeChange={setCode}
          error={signInFieldError('code')}
          loading={loading}
          onSubmit={() => void submitMfa()}
          onChangeStrategy={() => setFormError('Para usar outra forma, volte e entre novamente para selecionar o próximo método disponível.')}
        />
      </AuthShell>
    );
  }

  if (step === 'reset-email') {
    return (
      <AuthShell eyebrow="Recupere seu acesso" title="Vamos encontrar sua conta." description="Digite o e-mail usado no MyBooks e enviaremos um código de recuperação." onBack={goBack}>
        <Card style={styles.formCard}>
          <ErrorBanner message={formError} />
          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            error={signInFieldError('identifier')}
            placeholder="voce@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
          />
          <AppButton label="Enviar código" icon="mail-outline" loading={loading} onPress={() => void beginPasswordReset()} />
        </Card>
      </AuthShell>
    );
  }

  if (step === 'reset-code') {
    return (
      <AuthShell eyebrow="Recupere seu acesso" title="Confirme o código." description="Use o código que enviamos para continuar com a troca da senha." onBack={goBack}>
        <ErrorBanner message={formError} />
        <VerificationStep
          action="sign-in"
          email={email}
          code={code}
          onCodeChange={setCode}
          error={signInFieldError('code')}
          loading={loading}
          onSubmit={() => void verifyPasswordResetCode()}
          onResend={() => void beginPasswordReset()}
          onChangeEmail={resetToEmailForm}
        />
      </AuthShell>
    );
  }

  if (step === 'reset-password') {
    return (
      <AuthShell eyebrow="Novo capítulo" title="Escolha uma nova senha." description="Crie uma senha nova para voltar à sua estante com tranquilidade." onBack={goBack}>
        <Card style={styles.formCard}>
          <ErrorBanner message={formError} />
          <PasswordField label="Nova senha" value={newPassword} onChangeText={setNewPassword} visible={newPasswordVisible} onToggle={() => setNewPasswordVisible((visible) => !visible)} />
          <PasswordField label="Repita a nova senha" value={newPasswordConfirmation} onChangeText={setNewPasswordConfirmation} visible={newPasswordVisible} onToggle={() => setNewPasswordVisible((visible) => !visible)} />
          <AppButton label="Salvar nova senha" icon="check" loading={loading} onPress={() => void submitNewPassword()} />
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={action === 'sign-up' ? 'Abra sua conta' : 'Bem-vindo de volta'}
      title={action === 'sign-up' ? 'Crie seu espaço de leitura.' : 'Entre na sua estante.'}
      description={action === 'sign-up' ? 'Uma conta para acompanhar livros, trocas e conversas que fazem sentido.' : 'Continue de onde parou e descubra a próxima história.'}
      onBack={goBack}
    >
      {renderForm()}
    </AuthShell>
  );
}

export function Auth() {
  const { startAuth, mode } = useSession();
  return mode === 'clerk' ? <ClerkAuthFlow /> : <DevelopmentAuthFlow startAuth={startAuth} />;
}
