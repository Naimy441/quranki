import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppColorScheme, useTheme } from '@/hooks/use-theme';
import { hapticSelection, hapticSuccess } from '@/lib/haptics';
import { isValidEmail, isValidPassword } from '@/lib/account-auth';
import { useAccountStore } from '@/store/account-store';

function applyInputTextColor(input: TextInput | null, color: string) {
  if (!input) return;
  input.setNativeProps({
    style: Platform.OS === 'web' ? { color, WebkitTextFillColor: color } : { color },
  });
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
  const inputRef = useRef<TextInput>(null);

  const recolor = () => {
    applyInputTextColor(inputRef.current, theme.text);
    requestAnimationFrame(() => applyInputTextColor(inputRef.current, theme.text));
  };

  return (
    <TextInput
      ref={inputRef}
      value={value}
      onChangeText={(next) => {
        onChangeText(next);
        recolor();
      }}
      onFocus={recolor}
      placeholder={placeholder}
      placeholderTextColor={theme.textMuted}
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      autoComplete={email ? 'username' : newPassword ? 'new-password' : 'password'}
      textContentType={email ? 'username' : newPassword ? 'newPassword' : 'password'}
      keyboardType={email ? 'email-address' : 'default'}
      keyboardAppearance={scheme}
      secureTextEntry={secure}
      editable={editable}
      style={[
        styles.input,
        {
          backgroundColor: theme.background,
          color: theme.text,
          borderColor: theme.border,
          ...(Platform.OS === 'web' ? { WebkitTextFillColor: theme.text } : null),
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
