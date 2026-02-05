import { useState, useEffect, useCallback, useRef } from 'react';
import zoomSdk from '@zoom/appssdk';

export interface Participant {
  participantUUID: string;
  screenName: string;
  role: string;
}

export interface UserContext {
  screenName: string;
  role: string;
  participantUUID: string;
  status: string;
}

export interface ZoomSdkState {
  isConfigured: boolean;
  isInMeeting: boolean;
  isHost: boolean;
  userContext: UserContext | null;
  participants: Participant[];
  meetingUUID: string | null;
  error: string | null;
}

// Get the API base URL
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

export function useZoomSdk() {
  const [state, setState] = useState<ZoomSdkState>({
    isConfigured: false,
    isInMeeting: false,
    isHost: false,
    userContext: null,
    participants: [],
    meetingUUID: null,
    error: null,
  });

  const meetingUUIDRef = useRef<string | null>(null);
  const isHostRef = useRef<boolean>(false);

  // Sync participants to server (host only)
  const syncParticipantsToServer = useCallback(async (participants: Participant[]) => {
    if (!meetingUUIDRef.current) return;

    try {
      await fetch(`${getApiBaseUrl()}/api/participants/${encodeURIComponent(meetingUUIDRef.current)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: participants.map(p => ({
            participantUUID: p.participantUUID,
            screenName: p.screenName,
            role: p.role,
          })),
        }),
      });
    } catch (error) {
      console.error('Failed to sync participants to server:', error);
    }
  }, []);

  // Fetch participants from server (non-hosts)
  const fetchParticipantsFromServer = useCallback(async () => {
    if (!meetingUUIDRef.current) return;

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/participants/${encodeURIComponent(meetingUUIDRef.current)}`);
      const data = await response.json();

      if (data.participants && data.participants.length > 0) {
        setState(prev => ({
          ...prev,
          participants: data.participants as Participant[],
        }));
      }
    } catch (error) {
      console.error('Failed to fetch participants from server:', error);
    }
  }, []);

  // Fetch participants from Zoom and sync to server (host only)
  const fetchAndSyncParticipants = useCallback(async () => {
    try {
      const response = await zoomSdk.getMeetingParticipants();
      const participantList = response.participants as Participant[];

      setState(prev => ({
        ...prev,
        participants: participantList,
      }));

      // Sync to server for non-hosts to fetch
      await syncParticipantsToServer(participantList);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    }
  }, [syncParticipantsToServer]);

  // Initialize Zoom SDK
  useEffect(() => {
    const initializeSdk = async () => {
      console.log('Starting Zoom SDK initialization...');

      try {
        const configResponse = await zoomSdk.config({
          capabilities: [
            'getUserContext',
            'getMeetingParticipants',
            'getMeetingUUID',
            'onParticipantChange',
            'sendMessageToChat',
          ],
        });

        console.log('Zoom SDK configured successfully:', configResponse);
        console.log('Running context:', configResponse.runningContext);

        // Get user context to check role
        const userContext = await zoomSdk.getUserContext();
        const isHost = userContext.role === 'host' || userContext.role === 'coHost';
        isHostRef.current = isHost;

        // Get meeting UUID - available to all participants
        let meetingUUID: string | null = null;
        try {
          const meetingContext = await zoomSdk.getMeetingUUID();
          meetingUUID = meetingContext.meetingUUID;
          meetingUUIDRef.current = meetingUUID;
        } catch (e) {
          console.error('Failed to get meeting UUID:', e);
        }

        // Get running context
        const runningContext = configResponse.runningContext;
        const isInMeeting = runningContext === 'inMeeting' ||
                           runningContext === 'inWebinar' ||
                           runningContext === 'inImmersive';

        setState(prev => ({
          ...prev,
          isConfigured: true,
          isInMeeting,
          isHost,
          meetingUUID,
          userContext: userContext as UserContext,
        }));

      } catch (error) {
        console.error('Failed to initialize Zoom SDK:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize Zoom SDK',
        }));
      }
    };

    initializeSdk();
  }, []);

  // Host: Fetch participants and sync to server periodically
  useEffect(() => {
    if (!state.isConfigured || !state.isInMeeting || !state.isHost) return;

    // Initial fetch
    fetchAndSyncParticipants();

    // Listen for participant changes
    const handleParticipantChange = async () => {
      console.log('Participant changed, refreshing...');
      await fetchAndSyncParticipants();
    };
    zoomSdk.onParticipantChange(handleParticipantChange);

    // Periodic sync every 5 seconds
    const intervalId = setInterval(() => {
      fetchAndSyncParticipants();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [state.isConfigured, state.isInMeeting, state.isHost, fetchAndSyncParticipants]);

  // Non-host: Poll server for participants
  useEffect(() => {
    if (!state.isConfigured || !state.isInMeeting || state.isHost || !state.meetingUUID) return;

    // Initial fetch
    fetchParticipantsFromServer();

    // Poll every 3 seconds
    const intervalId = setInterval(() => {
      fetchParticipantsFromServer();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [state.isConfigured, state.isInMeeting, state.isHost, state.meetingUUID, fetchParticipantsFromServer]);

  // Send app invitation to all participants
  const sendInvitationToAll = useCallback(async () => {
    try {
      await zoomSdk.sendAppInvitationToAllParticipants();
      console.log('App invitation sent to all participants');
    } catch (error) {
      console.error('Failed to send app invitation:', error);
    }
  }, []);

  // Send message to meeting chat
  const sendToChat = useCallback(async (message: string): Promise<boolean> => {
    try {
      await zoomSdk.sendMessageToChat({ message });
      console.log('Message sent to chat successfully');
      return true;
    } catch (error) {
      console.error('Failed to send message to chat:', error);
      return false;
    }
  }, []);

  return {
    ...state,
    fetchParticipants: fetchAndSyncParticipants,
    sendInvitationToAll,
    sendToChat,
  };
}
