import { useState } from 'react';
import { Participant } from '../hooks/useZoomSdk';
import { copyToClipboard } from '../utils/randomize';

interface RandomizedOrderProps {
  order: Participant[];
  onClear: () => void;
  formatAsText: (order: Participant[]) => string;
  onSendToChat: (message: string) => Promise<boolean>;
}

function RandomizedOrder({ order, onClear, formatAsText, onSendToChat }: RandomizedOrderProps) {
  const [copied, setCopied] = useState(false);
  const [sentToChat, setSentToChat] = useState(false);
  const [sending, setSending] = useState(false);

  const handleCopy = async () => {
    const text = formatAsText(order);
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendToChat = async () => {
    setSending(true);
    const text = formatAsText(order);
    const success = await onSendToChat(text);
    setSending(false);
    if (success) {
      setSentToChat(true);
      setTimeout(() => setSentToChat(false), 2000);
    }
  };

  return (
    <div className="mt-4 bg-white rounded-lg shadow-sm border border-green-200 overflow-hidden">
      {/* Header */}
      <div className="bg-green-50 px-4 py-3 border-b border-green-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-green-800">
          Randomized Order
        </h2>
        <button
          onClick={onClear}
          className="text-green-600 hover:text-green-800 text-xs"
        >
          Clear
        </button>
      </div>

      {/* Order List */}
      <div className="p-4">
        <ol className="space-y-2">
          {order.map((participant, index) => (
            <li
              key={participant.participantUUID}
              className="flex items-center gap-3 text-sm"
            >
              <span className="w-6 h-6 bg-zoom-blue text-white rounded-full flex items-center justify-center text-xs font-bold">
                {index + 1}
              </span>
              <span className="text-gray-800">{participant.screenName}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4 space-y-2">
        {/* Send to Chat Button (Primary) */}
        <button
          onClick={handleSendToChat}
          disabled={sending}
          className={`
            w-full py-2 px-4 rounded-lg text-sm font-medium
            transition-all duration-200 flex items-center justify-center gap-2
            ${sentToChat
              ? 'bg-green-500 text-white'
              : 'bg-zoom-blue text-white hover:bg-blue-600'
            }
            ${sending ? 'opacity-75 cursor-not-allowed' : ''}
          `}
        >
          {sending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Sending...</span>
            </>
          ) : sentToChat ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Sent to Chat!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Send to Chat</span>
            </>
          )}
        </button>

        {/* Copy Button (Secondary) */}
        <button
          onClick={handleCopy}
          className={`
            w-full py-2 px-4 rounded-lg text-sm font-medium
            transition-all duration-200 flex items-center justify-center gap-2
            ${copied
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Copy to Clipboard</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default RandomizedOrder;
