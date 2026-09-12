import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppColorScheme, useTheme } from '@/hooks/use-theme';
import { hapticSelection, hapticSuccess } from '@/lib/haptics';
import { isValidEmail, isValidPassword } from '@/lib/account-auth';
import { useAccountStore } from '@/store/account-store';

/** iOS Strong Password / Autofill writes UITextField.textColor to black after RN has already
 *  committed `theme.text`. Fabric then skips a same-color update, so the field stays black in
 *  dark mode. Nudging the last hex digit forces a real style commit; delayed ticks catch the
 *  Strong Password animation finishing after `onChangeText`. */
function nudgeTextColor(color: string): string {
  if (!color.startsWith('#') || color.length < 7) return color;
  const last = color[color.length - 1];
  return `${color.slice(0, -1)}${last === '2' ? '3' : '2'}`;
}

function AuthField({
  value,
  onChangeText,
  placeholder,
  secure,
  newPassword,
  email,
  editable,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secure?: boolean;
  newPassword?: boolean;
  email?: boolean;
  editable: boolean;
}) {
  const theme = useTheme();
  const scheme = useAppColorScheme();
  const [colorEpoch, setColorEpoch] = useState(0);

  useEffect(() => {
    if (!value) return;
    setColorEpoch((n) => n + 1);
    const ticks = [80, 280, 700].map((ms) => setTimeout(() => setColorEpoch((n) => n + 1), ms));
    return () => ticks.forEach(clearTimeout);
  }, [value, theme.text]);

  const color = colorEpoch % 2 === 0 ? theme.text : nudgeTextColor(theme.text);

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textMuted}
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      autoComplete={email ? 'username' : newPassword ? 'new-password' : 'password'}
      textContentType={email ? 'username' : newPassword ? 'newPassword' : 'password'}
      keyboardType={email ? 'email-address' : 'default'}
      keyboardAppearance={scheme}
      cursorColor={theme.text}
      selectionColor={theme.primary}
      secureTextEntry={secure}
      editable={editable}
      style={[
        styles.input,
        {
          backgroundColor: theme.background,
          color,
          borderColor: theme.border,
          ...(Platform.OS === 'web'
            ? {
                WebkitTextFillColor: color,
                WebkitBoxShadow: `0 0 0 1000px ${theme.background} inset`,
              }
            : null),
        },
      ]}
    />
  );
}

export function AccountSessionCard() {
  const theme = useTheme();
  const email = useAccountStore((state) => state.email);
  const busy = useAccountStore((state) => state.busy);
  const signOut = useAccountStore((state) => state.signOut);

  return (
    <View style={styles.block}>
      {email ? <ThemedText type="smallBold">{email}</ThemedText> : null}
      <Pressable
        disabled={busy}
        onPress={() => {
          hapticSelection();
          const confirmSignOut = () => void signOut();
          if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.confirm('Sign out?\nLearned words stay on this device. Syncing stops until you sign in again.')) {
              confirmSignOut();
            }
            return;
          }
          Alert.alert(
            'Sign out?',
            'Learned words stay on this device. Syncing stops until you sign in again.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: confirmSignOut },
            ],
          );
        }}
        style={({ pressed }) => [
          styles.secondaryButton,
          { borderColor: theme.border, backgroundColor: theme.background },
          (pressed || busy) && styles.pressed,
        ]}>
        {busy ? (
          <ActivityIndicator size="small" color={theme.textMuted} />
        ) : (
          <ThemedText type="smallBold">Sign out</ThemedText>
        )}
      </Pressable>
    </View>
  );
}

export function AccountAuthForm({
  mode,
  onSignedIn,
}: {
  mode: 'signIn' | 'create';
  onSignedIn?: () => void;
}) {
  const theme = useTheme();
  const hydrated = useAccountStore((state) => state.hydrated);
  const busy = useAccountStore((state) => state.busy);
  const error = useAccountStore((state) => state.error);
  const signIn = useAccountStore((state) => state.signIn);
  const createAccount = useAccountStore((state) => state.createAccount);
  const clearError = useAccountStore((state) => state.clearError);
  const [emailDraft, setEmailDraft] = useState('');
  const [passwordDraft, setPasswordDraft] = useState('');
  const [confirmDraft, setConfirmDraft] = useState('');
  const [pending, setPending] = useState(false);

  if (!hydrated) {
    return (
      <View style={styles.block}>
        <ActivityIndicator size="small" color={theme.textMuted} />
      </View>
    );
  }

  const passwordsMatch = mode === 'signIn' || passwordDraft === confirmDraft;
  const canSubmit = isValidEmail(emailDraft) && isValidPassword(passwordDraft) && passwordsMatch;
  const loading = pending || busy;

  if (pending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="small" themeColor="textSecondary">
          {mode === 'create' ? 'Creating your account…' : 'Signing you in…'}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <AuthField
        value={emailDraft}
        onChangeText={(value) => {
          if (error) clearError();
          setEmailDraft(value);
        }}
        placeholder="Email"
        email
        editable
      />
      <AuthField
        value={passwordDraft}
        onChangeText={(value) => {
          if (error) clearError();
          setPasswordDraft(value);
        }}
        placeholder="Password"
        secure
        newPassword={mode === 'create'}
        editable
      />
      {mode === 'create' ? (
        <AuthField
          value={confirmDraft}
          onChangeText={setConfirmDraft}
          placeholder="Confirm password"
          secure
          newPassword
          editable
        />
      ) : null}
      <Pressable
        disabled={loading || !canSubmit}
        onPress={() => {
          hapticSelection();
          Keyboard.dismiss();
          setPending(true);
          void (mode === 'create' ? createAccount : signIn)(emailDraft, passwordDraft).then(() => {
            if (useAccountStore.getState().uid) {
              hapticSuccess();
              onSignedIn?.();
              return;
            }
            setPending(false);
          });
        }}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: theme.primary },
          (pressed || loading || !canSubmit) && styles.pressed,
        ]}>
        <ThemedText type="smallBold" themeColor="onPrimary">
          {mode === 'create' ? 'Create account' : 'Sign in'}
        </ThemedText>
      </Pressable>
      {mode === 'create' && passwordDraft.length > 0 && !passwordsMatch ? (
        <ThemedText type="small" themeColor="danger">
          Passwords do not match.
        </ThemedText>
      ) : error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.three,
  },
  loading: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  input: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  primaryButton: {
    height: 48,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    height: 48,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
