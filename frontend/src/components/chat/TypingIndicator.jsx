import React from 'react';

/**
 * TypingIndicator component
 * Renders a list of active typers in a conversation with a smooth bouncing dots animation.
 */
const TypingIndicator = ({ typingUsers = [] }) => {
  if (!typingUsers || typingUsers.length === 0) {
    return null;
  }

  // Generate the typing/recording text dynamically
  const getTypingText = () => {
    const names = typingUsers.map(user => user.name || 'Someone');
    const recordingCount = typingUsers.filter(user => user.isRecording).length;
    const typingCount = typingUsers.length - recordingCount;

    if (typingUsers.length === 1) {
      const isRec = typingUsers[0].isRecording;
      return (
        <>
          <span className="typing-username">{names[0]}</span> {isRec ? 'is recording audio' : 'is typing'}
        </>
      );
    }

    if (typingUsers.length === 2) {
      if (recordingCount === 2) {
        return (
          <>
            <span className="typing-username">{names[0]}</span> and <span className="typing-username">{names[1]}</span> are recording audio
          </>
        );
      }
      if (typingCount === 2) {
        return (
          <>
            <span className="typing-username">{names[0]}</span> and <span className="typing-username">{names[1]}</span> are typing
          </>
        );
      }
      // Mixed actions
      return (
        <>
          <span className="typing-username">{names[0]}</span> and <span className="typing-username">{names[1]}</span> are active
        </>
      );
    }

    // 3+ users
    return (
      <>
        <span className="typing-username">{names[0]}</span>, <span className="typing-username">{names[1]}</span> and {typingUsers.length - 2} others are active
      </>
    );
  };

  return (
    <div className="typing-indicator-container">
      <div className="typing-indicator-bubble">
        <span className="typing-indicator-text">{getTypingText()}</span>
        <div className="typing-indicator-dots">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
