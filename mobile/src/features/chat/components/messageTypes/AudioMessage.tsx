import React from 'react';
import VoicePlayer from '../VoicePlayer';

interface AudioMessageProps {
  mediaUrl: string;
  duration?: number;
  isMe: boolean;
}

export const AudioMessage: React.FC<AudioMessageProps> = ({ mediaUrl, duration, isMe }) => {
  return <VoicePlayer url={mediaUrl} duration={duration || 0} isMe={isMe} />;
};

export default AudioMessage;
