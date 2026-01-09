import { useZoomSdk } from '../hooks/useZoomSdk';
import { useParticipants } from '../hooks/useParticipants';
import ParticipantList from './ParticipantList';
import RandomizeButton from './RandomizeButton';
import RandomizedOrder from './RandomizedOrder';

function App() {
  const {
    isConfigured,
    isInMeeting,
    isHost,
    userContext,
    participants: zoomParticipants,
    error,
    sendToChat,
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
        <ParticipantList
          participants={participants}
          isHost={isHost}
        />

        {/* Randomize Button - Host/Co-Host Only */}
        {isHost && (
          <RandomizeButton
            onRandomize={randomize}
            disabled={participants.length < 2}
          />
        )}

        {/* Not Host Message */}
        {!isHost && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center">
            <p className="text-gray-600 text-sm">
              Only the host or co-host can randomize participants.
            </p>
            <p className="text-gray-500 text-xs mt-1">
              You'll see the results when they randomize.
            </p>
          </div>
        )}

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
