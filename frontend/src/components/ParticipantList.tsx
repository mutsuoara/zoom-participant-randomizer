import { Participant } from '../hooks/useZoomSdk';

interface ParticipantListProps {
  participants: Participant[];
  isHost: boolean;
}

function ParticipantList({ participants, isHost }: ParticipantListProps) {
  if (!isHost) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          Participants
        </h2>
        <p className="text-gray-500 text-sm">
          Participant list is only visible to hosts and co-hosts.
        </p>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          Participants
        </h2>
        <p className="text-gray-500 text-sm">
          No participants found. Waiting for people to join...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">
        Current Participants ({participants.length})
      </h2>
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {participants.map((participant) => (
          <li
            key={participant.participantUUID}
            className="flex items-center gap-2 text-sm"
          >
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-medium">
              {participant.screenName.charAt(0).toUpperCase()}
            </div>
            <span className="text-gray-800 flex-1">
              {participant.screenName}
            </span>
            {(participant.role === 'host' || participant.role === 'coHost') && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                {participant.role === 'host' ? 'Host' : 'Co-Host'}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ParticipantList;
