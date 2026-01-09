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
    const handleMessage = (data: { message: string }) => {
      try {
        const parsed = JSON.parse(data.message);
        if (parsed.type === 'randomization_result') {
          setRandomizedOrder(parsed.order);
          setHistory(prev => [
            { timestamp: parsed.timestamp, order: parsed.order },
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
      await zoomSdk.sendMessage({
        message: JSON.stringify({
          type: 'randomization_result',
          order: shuffled,
          timestamp: result.timestamp,
        }),
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
