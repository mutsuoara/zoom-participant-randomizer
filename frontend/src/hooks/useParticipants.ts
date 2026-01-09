import { useState, useEffect, useCallback } from 'react';
import zoomSdk from '@zoom/appssdk';
import { Participant } from './useZoomSdk';

export interface RandomizationResult {
  timestamp: number;
  order: Participant[];
}

export function useParticipants(initialParticipants: Participant[]) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [randomizedOrder, setRandomizedOrder] = useState<Participant[] | null>(null);
  const [history, setHistory] = useState<RandomizationResult[]>([]);

  // Update participants when props change
  useEffect(() => {
    setParticipants(initialParticipants);
  }, [initialParticipants]);

  // Listen for broadcast messages from other app instances
  useEffect(() => {
    const handleMessage = (event: { timestamp: number; payload: Record<string, unknown> }) => {
      try {
        const data = event.payload;
        if (data.type === 'randomization_result') {
          setRandomizedOrder(data.order as Participant[]);
          setHistory(prev => [
            { timestamp: data.timestamp as number, order: data.order as Participant[] },
            ...prev.slice(0, 9), // Keep last 10
          ]);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    zoomSdk.onMessage(handleMessage);
  }, []);

  // Fisher-Yates shuffle algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Randomize participants
  const randomize = useCallback(async () => {
    const shuffled = shuffleArray(participants);
    const result: RandomizationResult = {
      timestamp: Date.now(),
      order: shuffled,
    };

    setRandomizedOrder(shuffled);
    setHistory(prev => [result, ...prev.slice(0, 9)]);

    // Broadcast to all app instances
    try {
      const payload = {
        type: 'randomization_result',
        order: shuffled.map(p => ({ participantUUID: p.participantUUID, screenName: p.screenName, role: p.role })),
        timestamp: result.timestamp,
      };
      await zoomSdk.sendMessage({
        payload: payload as Parameters<typeof zoomSdk.sendMessage>[0]['payload'],
      });
    } catch (error) {
      console.error('Failed to broadcast randomization:', error);
    }

    return shuffled;
  }, [participants]);

  // Clear current randomization
  const clearRandomization = useCallback(() => {
    setRandomizedOrder(null);
  }, []);

  // Format order as text for copying
  const formatOrderAsText = useCallback((order: Participant[]): string => {
    return order
      .map((p, i) => `${i + 1}. ${p.screenName}`)
      .join('\n');
  }, []);

  return {
    participants,
    randomizedOrder,
    history,
    randomize,
    clearRandomization,
    formatOrderAsText,
  };
}
