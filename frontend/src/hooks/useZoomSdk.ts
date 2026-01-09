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

        // Fetch initial participant list if host/co-host
        if (isHost && isInMeeting) {
          await fetchParticipants();
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

  // Listen for participant changes
  useEffect(() => {
    if (!state.isConfigured || !state.isHost) return;

    const handleParticipantChange = async () => {
      console.log('Participant changed, refreshing list...');
      await fetchParticipants();
    };

    zoomSdk.onParticipantChange(handleParticipantChange);

    // Note: Zoom SDK doesn't provide a way to remove listeners,
    // but the component will unmount when the app closes
  }, [state.isConfigured, state.isHost]);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    try {
      const response = await zoomSdk.getMeetingParticipants();
      setState(prev => ({
        ...prev,
        participants: response.participants as Participant[],
      }));
    } catch (error) {
      console.error('Failed to fetch participants:', error);
      // Don't set error state, just log - participant access may be restricted
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
    fetchParticipants,
    broadcastMessage,
    sendInvitationToAll,
    sendToChat,
  };
}
