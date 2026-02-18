import { useState } from 'react';
import { useZoomSdk, DebugInfo } from '../hooks/useZoomSdk';
import { useParticipants } from '../hooks/useParticipants';
import ParticipantList from './ParticipantList';
import RandomizeButton from './RandomizeButton';
import RandomizedOrder from './RandomizedOrder';

function DebugBanner({ debugInfo, isHost }: { debugInfo: DebugInfo; isHost: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const hasError = debugInfo.registerStatus.startsWith('error') ||
    debugInfo.syncStatus.startsWith('error') ||
    debugInfo.pollStatus.startsWith('error');
  const borderColor = hasError ? 'border-red-400' : 'border-blue-300';
  const bgColor = hasError ? 'bg-red-50' : 'bg-blue-50';

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-2 mb-4 text-xs font-mono`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex justify-between items-center"
      >
        <span className="font-bold text-gray-700">
          DEBUG {hasError ? '(!)' : ''}
        </span>
        <span className="text-gray-400">{expanded ? 'collapse' : 'expand'}</span>
      </button>

      {/* Always-visible summary */}
      <div className="mt-1 space-y-0.5 text-gray-600">
        <div>Role: <span className="font-semibold">{debugInfo.role ?? 'unknown'}</span></div>
        <div>UUID: <span className="font-semibold">{debugInfo.meetingUUID ?? 'null'}</span></div>
        <div>
          Reg:{' '}
          <span className={`font-semibold ${debugInfo.registerStatus.startsWith('error') ? 'text-red-600' : 'text-green-700'}`}>
            {debugInfo.registerStatus}
          </span>
        </div>
        <div>
          Poll:{' '}
          <span className={`font-semibold ${debugInfo.pollStatus.startsWith('error') ? 'text-red-600' : 'text-green-700'}`}>
            {debugInfo.pollStatus}
          </span>
        </div>
        <div>
          Webhook:{' '}
          <span className="font-semibold text-green-700">
            {debugInfo.webhookCount} tracked
          </span>
        </div>
        {isHost && (
          <div>
            Sync:{' '}
            <span className={`font-semibold ${debugInfo.syncStatus.startsWith('error') ? 'text-red-600' : 'text-green-700'}`}>
              {debugInfo.syncStatus}
            </span>
          </div>
        )}
      </div>

      {/* Expandable log */}
      {expanded && debugInfo.logs.length > 0 && (
        <div className="mt-2 border-t border-gray-300 pt-1 max-h-40 overflow-y-auto">
          {debugInfo.logs.map((log, i) => (
            <div key={i} className="text-gray-500 leading-tight">{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const {
    isConfigured,
    isInMeeting,
    isHost,
    userContext,
    participants: zoomParticipants,
    error,
    sendToChat,
    debugInfo,
  } = useZoomSdk();

  const {
    participants,
    randomizedOrder,
    randomize,
    clearRandomization,
    formatOrderAsText,
  } = useParticipants(zoomParticipants);

  // Loading state
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zoom-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to Zoom...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm">
          <h2 className="text-red-800 font-semibold mb-2">Connection Error</h2>
          <p className="text-red-600 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-2">
            Make sure you're running this app inside Zoom.
          </p>
        </div>
      </div>
    );
  }

  // Not in meeting
  if (!isInMeeting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-sm text-center">
          <h2 className="text-yellow-800 font-semibold mb-2">Join a Meeting</h2>
          <p className="text-yellow-700 text-sm">
            Please join a Zoom meeting to use the Participant Randomizer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4">
        {/* Debug Banner */}
        <DebugBanner debugInfo={debugInfo} isHost={isHost} />

        {/* Header */}
        <header className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            Participant Randomizer
          </h1>
          {userContext && (
            <p className="text-sm text-gray-500">
              Logged in as {userContext.screenName}
              {isHost && (
                <span className="ml-2 px-2 py-0.5 bg-zoom-blue text-white text-xs rounded-full">
                  {userContext.role === 'host' ? 'Host' : 'Co-Host'}
                </span>
              )}
            </p>
          )}
        </header>

        {/* Participant List */}
        <ParticipantList participants={participants} />

        {/* Randomize Button - Available to all participants */}
        <RandomizeButton
          onRandomize={randomize}
          disabled={participants.length < 2}
        />

        {/* Randomized Order */}
        {randomizedOrder && (
          <RandomizedOrder
            order={randomizedOrder}
            onClear={clearRandomization}
            formatAsText={formatOrderAsText}
            onSendToChat={sendToChat}
          />
        )}
      </div>
    </div>
  );
}

export default App;
