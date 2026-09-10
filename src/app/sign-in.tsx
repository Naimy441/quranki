import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountAuthForm } from '@/components/quranki/account-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { hrefAfterAccountAuth } from '@/lib/account-routes';

export default function SignInScreen() {
  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Sign in', headerBackTitle: 'Back' }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <ThemedText type="small" themeColor="textSecondary">
            Your learned words come back after you sign in.
          </ThemedText>
          <AccountAuthForm
            mode="signIn"
            onSignedIn={() => {
              void hrefAfterAccountAuth().then((href) => router.replace(href));
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
});
