import React from 'react';
import { ZackRetriever3D, Zack3DMood } from './ZackRetriever3D';

export type ZackMood = Zack3DMood;

interface ZackRetrieverProps {
  mood?: ZackMood;
  isPasswordMode?: boolean;
  pinLength?: number;
  isTyping?: boolean;
  hasError?: boolean;
  isSuccess?: boolean;
  onInteract?: (action: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showSpeech?: boolean;
  customSpeech?: string | null;
  allowBellyRub?: boolean;
}

export const ZackRetriever: React.FC<ZackRetrieverProps> = ({
  size = 'md',
  width: customWidth,
  height: customHeight,
  ...props
}: ZackRetrieverProps & { width?: number | string; height?: number | string }) => {
  const dimensions = {
    sm: { width: 120, height: 110 },
    md: { width: 160, height: 140 },
    lg: { width: 220, height: 190 }
  }[size];

  return (
    <ZackRetriever3D
      {...props}
      width={customWidth || dimensions.width}
      height={customHeight || dimensions.height}
    />
  );
};
