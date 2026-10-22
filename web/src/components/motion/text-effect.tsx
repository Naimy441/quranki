'use client';

import { motion, type Variants } from 'framer-motion';
import React from 'react';

type PresetType = 'fade-in-blur' | 'fade' | 'slide' | 'scale';
type PerType = 'char' | 'word' | 'line';

interface TextEffectProps {
  children: string;
  per?: PerType;
  preset?: PresetType;
  delay?: number;
  className?: string;
  segmentWrapperClassName?: string;
  as?: 'span' | 'h1' | 'h2' | 'p';
}

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (custom: { delay?: number; stagger?: number }) => ({
    opacity: 1,
    transition: {
      staggerChildren: custom.stagger ?? 0.05,
      delayChildren: custom.delay ?? 0,
    },
  }),
};

const defaultPresets: Record<PresetType, Variants> = {
  'fade-in-blur': {
    hidden: { opacity: 0, filter: 'blur(12px)', y: 20 },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: { type: 'spring', stiffness: 150, damping: 19 },
    },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
  },
  slide: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  },
};

export function TextEffect({
  children,
  per = 'word',
  preset = 'fade-in-blur',
  delay = 0,
  className = '',
  segmentWrapperClassName = '',
  as = 'span',
}: TextEffectProps) {
  const segments = React.useMemo(() => {
    if (per === 'char') return children.split('');
    if (per === 'word') return children.split(' ');
    return children.split('\n');
  }, [children, per]);

  const stagger = per === 'char' ? 0.03 : 0.1;
  const itemVariants = defaultPresets[preset];
  const MotionTag = motion[as];

  return (
    <MotionTag
      initial="hidden"
      animate="visible"
      aria-label={children}
      custom={{ delay, stagger }}
      variants={defaultContainerVariants}
      className={`inline-block ${className}`}
    >
      <span className="sr-only">{children}</span>
      {segments.map((segment, index) => (
        <span key={index} aria-hidden="true" className={`inline-block whitespace-pre ${segmentWrapperClassName}`}>
          <motion.span variants={itemVariants} className="inline-block whitespace-pre">
            {segment}
          </motion.span>
          {per === 'word' && index < segments.length - 1 && ' '}
        </span>
      ))}
    </MotionTag>
  );
}
