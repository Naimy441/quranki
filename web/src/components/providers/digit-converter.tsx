'use client';

import React, { useEffect, useRef } from 'react';
import { formatAppDigits } from '@/lib/arabic-digits';
import { useMasteredArabicDigits } from '@/hooks/use-mastered-arabic-digits';

const SKIP = 'input, textarea, select, option, kbd, code, script, style, [data-keep-digits]';

/**
 * Mirrors the mobile app's text component: once the learner masters Arabic digits (Stage 2),
 * every number in the interface whose digits are all mastered is shown in Arabic-Indic form.
 * Text inside `[data-keep-digits]` (teaching copy, inputs) is left alone.
 */
export function DigitConverter({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const mastered = useMasteredArabicDigits();

  useEffect(() => {
    const root = ref.current;
    if (!root || mastered.size === 0) return;
    const convert = (node: Node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;
      const text = node.nodeValue;
      if (!text || !/\d/.test(text)) return;
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP)) return;
      const next = formatAppDigits(text, mastered);
      if (next !== text) node.nodeValue = next;
    };
    const walk = (start: Node) => {
      if (start.nodeType === Node.TEXT_NODE) return convert(start);
      const walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) convert(n);
    };
    walk(root);
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') convert(r.target);
        else r.addedNodes.forEach(walk);
      }
    });
    observer.observe(root, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [mastered]);

  return <div ref={ref} className="contents">{children}</div>;
}
