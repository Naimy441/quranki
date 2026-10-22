'use client';

import { useEffect, useState } from 'react';

interface VisitorState {
  ready: boolean;
  hasCompletedOnboarding: boolean;
  signedIn: boolean;
}

/**
 * Reads just enough of the saved app state for marketing pages to pick the right call to action,
 * without loading the curriculum and progress providers.
 */
export function useReturningVisitor(): VisitorState {
  const [state, setState] = useState<VisitorState>({ ready: false, hasCompletedOnboarding: false, signedIn: false });
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('quranki_web_data_v1') || '{}');
      const session = localStorage.getItem('quranki_account_session_v1');
      setState({ ready: true, hasCompletedOnboarding: Boolean(data.hasCompletedOnboarding), signedIn: Boolean(session) });
    } catch {
      setState({ ready: true, hasCompletedOnboarding: false, signedIn: false });
    }
  }, []);
  return state;
}
