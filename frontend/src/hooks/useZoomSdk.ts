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

export interface DebugInfo {
  role: string | null;
  meetingUUID: string | null;
  registerStatus: string;
  syncStatus: string;
  pollStatus: string;
  webhookCount: number;
  logs: string[];
}

export interface ZoomSdkState {
  isConfigured: boolean;
  isInMeeting: boolean;
  isHost: boolean;
  userContext: UserContext | null;
  participants: Participant[];
  meetingUUID: string | null;
  error: string | null;
  debugInfo: DebugInfo;
}

// Get the API base URL
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// Convert meeting UUID to a URL-safe key.
// Zoom UUIDs are base64 and may contain '/', '+', '=' which break
// URL path segments (nginx decodes %2F before Express sees it).
const toUrlSafeId = (uuid: string): string =>
  uuid.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

export function useZoomSdk() {
  const [state, setState] = useState<ZoomSdkState>({
    isConfigured: false,
    isInMeeting: false,
    isHost: false,
    userContext: null,
    participants: [],
    meetingUUID: null,
    error: null,
    debugInfo: {
      role: null,
      meetingUUID: null,
      registerStatus: 'idle',
      syncStatus: 'idle',
      pollStatus: 'idle',
      webhookCount: 0,
      logs: [],
    },
  });

  const meetingUUIDRef = useRef<string | null>(null);
  const userContextRef = useRef<UserContext | null>(null);
  const isHostRef = useRef<boolean>(false);

  const addDebugLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setState(prev => ({
      ...prev,
      debugInfo: {
        ...prev.debugInfo,
        logs: [`${ts} ${msg}`, ...prev.debugInfo.logs.slice(0, 19)],
      },
    }));
  }, []);

  // Register self with server (all users - initial registration + heartbeat)
  const registerSelf = useCallback(async () => {
    if (!meetingUUIDRef.current || !userContextRef.current) {
      addDebugLog('[Reg] SKIP - no meetingUUID or userContext');
      setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, registerStatus: 'error: missing context' } }));
      return;
    }

    const url = `${getApiBaseUrl()}/api/participants/${toUrlSafeId(meetingUUIDRef.current)}/join`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantUUID: userContextRef.current.participantUUID,
          screenName: userContextRef.current.screenName,
          role: userContextRef.current.role,
        }),
      });

      if (!response.ok) {
        const msg = `error: POST ${response.status} ${response.statusText}`;
        addDebugLog(`[Reg] ${msg}`);
        setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, registerStatus: msg } }));
      } else {
        const msg = 'OK';
        addDebugLog(`[Reg] ${msg}`);
        setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, registerStatus: msg } }));
      }
    } catch (error) {
      const msg = `error: ${error instanceof Error ? error.message : String(error)}`;
      addDebugLog(`[Reg] ${msg}`);
      setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, registerStatus: msg } }));
    }
  }, [addDebugLog]);

  // Fetch participants from server (all users)
  const fetchParticipantsFromServer = useCallback(async () => {
    if (!meetingUUIDRef.current) {
      addDebugLog('[Poll] SKIP - no meetingUUID');
      setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, pollStatus: 'error: no meetingUUID' } }));
      return;
    }

    const url = `${getApiBaseUrl()}/api/participants/${toUrlSafeId(meetingUUIDRef.current)}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const msg = `error: GET ${response.status} ${response.statusText}`;
        addDebugLog(`[Poll] ${msg}`);
        setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, pollStatus: msg } }));
        return;
      }

      const data = await response.json();
      const count = data.participants?.length ?? 0;
      const webhookCount = data.webhookTracked ?? 0;
      const msg = `got ${count} participants (${webhookCount} webhook)`;
      addDebugLog(`[Poll] ${msg}`);
      setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, pollStatus: msg, webhookCount } }));

      if (data.participants) {
        setState(prev => ({
          ...prev,
          participants: data.participants as Participant[],
        }));
      }
    } catch (error) {
      const msg = `error: ${error instanceof Error ? error.message : String(error)}`;
      addDebugLog(`[Poll] ${msg}`);
      setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, pollStatus: msg } }));
    }
  }, [addDebugLog]);

  // Sync SDK participants to server (host only - bulk upsert)
  const syncParticipantsToServer = useCallback(async (participants: Participant[]) => {
    if (!meetingUUIDRef.current) {
      addDebugLog('[Sync] SKIP - no meetingUUID');
      setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, syncStatus: 'error: no meetingUUID' } }));
      return;
    }

    const url = `${getApiBaseUrl()}/api/participants/${toUrlSafeId(meetingUUIDRef.current)}`;
    setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, syncStatus: 'syncing...' } }));

    try {
      const response = await fetch(url, {
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

      if (!response.ok) {
        const msg = `error: POST ${response.status} ${response.statusText}`;
        addDebugLog(`[Sync] ${msg}`);
        setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, syncStatus: msg } }));
      } else {
        const msg = `OK - sent ${participants.length}`;
        addDebugLog(`[Sync] ${msg}`);
        setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, syncStatus: msg } }));
      }
    } catch (error) {
      const msg = `error: ${error instanceof Error ? error.message : String(error)}`;
      addDebugLog(`[Sync] ${msg}`);
      setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, syncStatus: msg } }));
    }
  }, [addDebugLog]);

  // Fetch participants from Zoom SDK and sync to server (host/co-host only)
  const fetchAndSyncParticipants = useCallback(async () => {
    try {
      const response = await zoomSdk.getMeetingParticipants();
      const participantList = response.participants as Participant[];

      addDebugLog(`[SDK] Got ${participantList.length} participants from SDK`);
      // Sync to server (upserts, adds users who haven't opened the app)
      await syncParticipantsToServer(participantList);
    } catch (error) {
      const msg = `error: ${error instanceof Error ? error.message : String(error)}`;
      addDebugLog(`[SDK] ${msg}`);
      setState(prev => ({ ...prev, debugInfo: { ...prev.debugInfo, syncStatus: msg } }));
    }
  }, [syncParticipantsToServer, addDebugLog]);

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
        userContextRef.current = userContext as UserContext;
        addDebugLog(`[Init] role=${userContext.role} isHost=${isHost}`);

        // Get meeting UUID - available to all participants
        // Retry up to 3 times because the SDK may not be ready immediately
        let meetingUUID: string | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const meetingContext = await zoomSdk.getMeetingUUID();
            meetingUUID = meetingContext.meetingUUID;
            meetingUUIDRef.current = meetingUUID;
            addDebugLog(`[Init] meetingUUID=${meetingUUID} (attempt ${attempt})`);
            break;
          } catch (e) {
            addDebugLog(`[Init] getMeetingUUID attempt ${attempt}/3 FAILED: ${e}`);
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }

        // Get running context
        const runningContext = configResponse.runningContext;
        const isInMeeting = runningContext === 'inMeeting' ||
                           runningContext === 'inWebinar' ||
                           runningContext === 'inImmersive';
        addDebugLog(`[Init] context=${runningContext} inMeeting=${isInMeeting}`);

        setState(prev => ({
          ...prev,
          isConfigured: true,
          isInMeeting,
          isHost,
          meetingUUID,
          userContext: userContext as UserContext,
          debugInfo: {
            ...prev.debugInfo,
            role: userContext.role,
            meetingUUID,
          },
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

  // All users: self-registration heartbeat (every 5s) + poll participants (every 3s)
  useEffect(() => {
    if (!state.isConfigured || !state.isInMeeting || !state.meetingUUID) return;

    addDebugLog(`[All] Starting registration + polling (UUID: ${state.meetingUUID})`);

    // Initial registration
    registerSelf();
    // Initial poll
    fetchParticipantsFromServer();

    // Heartbeat: register self every 5s
    const heartbeatId = setInterval(() => {
      registerSelf();
    }, 5000);

    // Poll: fetch participant list every 3s
    const pollId = setInterval(() => {
      fetchParticipantsFromServer();
    }, 3000);

    return () => {
      clearInterval(heartbeatId);
      clearInterval(pollId);
    };
  }, [state.isConfigured, state.isInMeeting, state.meetingUUID, registerSelf, fetchParticipantsFromServer, addDebugLog]);

  // Host/co-host only: SDK participant sync (adds users who haven't opened the app)
  useEffect(() => {
    if (!state.isConfigured || !state.isInMeeting || !state.isHost) return;

    addDebugLog(`[Host] Starting SDK sync (UUID: ${meetingUUIDRef.current ?? 'null'})`);

    // Initial fetch + sync
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
  }, [state.isConfigured, state.isInMeeting, state.isHost, fetchAndSyncParticipants, addDebugLog]);

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
