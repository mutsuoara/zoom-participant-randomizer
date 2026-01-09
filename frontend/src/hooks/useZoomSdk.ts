import { useState, useEffect, useCallback } from 'react';
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
  error: string | null;
}

export function useZoomSdk() {
  const [state, setState] = useState<ZoomSdkState>({
    isConfigured: false,
    isInMeeting: false,
    isHost: false,
    userContext: null,
    participants: [],
    error: null,
  });

  // Initialize Zoom SDK
  useEffect(() => {
    const initializeSdk = async () => {
      console.log('Starting Zoom SDK initialization...');

      try {
        // Start with minimal capabilities
        const configResponse = await zoomSdk.config({
          capabilities: [
            'getUserContext',
            'getMeetingParticipants',
            'onParticipantChange',
            'sendMessageToChat',
            'sendMessage',
            'onMessage',
          ],
        });

        console.log('Zoom SDK configured successfully:', configResponse);
        console.log('Running context:', configResponse.runningContext);

        // Get user context to check role
        const userContext = await zoomSdk.getUserContext();
        const isHost = userContext.role === 'host' || userContext.role === 'coHost';

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
          userContext: userContext as UserContext,
        }));

        // Fetch initial participant list (only hosts can fetch, then broadcast to others)
        if (isInMeeting && isHost) {
          await fetchAndBroadcastParticipants();
        }
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

  // Listen for participant changes (host only - then broadcasts to others)
  useEffect(() => {
    if (!state.isConfigured || !state.isInMeeting || !state.isHost) return;

    const handleParticipantChange = async () => {
      console.log('Participant changed, refreshing and broadcasting list...');
      await fetchAndBroadcastParticipants();
    };

    zoomSdk.onParticipantChange(handleParticipantChange);
  }, [state.isConfigured, state.isInMeeting, state.isHost]);

  // Listen for participant list broadcasts (non-hosts receive from host)
  useEffect(() => {
    if (!state.isConfigured || !state.isInMeeting) return;

    const handleMessage = (event: { timestamp: number; payload: Record<string, unknown> }) => {
      try {
        const data = event.payload;
        if (data.type === 'participant_list_broadcast') {
          console.log('Received participant list broadcast');
          setState(prev => ({
            ...prev,
            participants: data.participants as Participant[],
          }));
        }
      } catch (error) {
        console.error('Failed to handle message:', error);
      }
    };

    zoomSdk.onMessage(handleMessage);
  }, [state.isConfigured, state.isInMeeting]);

  // Fetch participants and broadcast to all app instances
  const fetchAndBroadcastParticipants = useCallback(async () => {
    try {
      const response = await zoomSdk.getMeetingParticipants();
      const participantList = response.participants as Participant[];

      setState(prev => ({
        ...prev,
        participants: participantList,
      }));

      // Broadcast to all app instances so non-hosts get the list
      try {
        const payload = {
          type: 'participant_list_broadcast',
          participants: participantList.map(p => ({
            participantUUID: p.participantUUID,
            screenName: p.screenName,
            role: p.role,
          })),
        };
        await zoomSdk.sendMessage({
          payload: payload as Parameters<typeof zoomSdk.sendMessage>[0]['payload'],
        });
        console.log('Broadcast participant list to all app instances');
      } catch (broadcastError) {
        console.error('Failed to broadcast participants:', broadcastError);
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    }
  }, []);

  // Send message to all app instances
  const broadcastMessage = useCallback(async (data: { [key: string]: string | number | boolean | null | object }) => {
    try {
      await zoomSdk.sendMessage({ payload: data as Parameters<typeof zoomSdk.sendMessage>[0]['payload'] });
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }, []);

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
    fetchParticipants: fetchAndBroadcastParticipants,
    broadcastMessage,
    sendInvitationToAll,
    sendToChat,
  };
}
