import { useEffect, useState, useCallback } from 'react';
import { blockchainService, type BlockchainEvent, type BlockchainEventType } from '@/lib/blockchain-updated';

/**
 * Hook to subscribe to blockchain events
 * @param eventType The type of event to listen for, or '*' for all events
 * @param callback Function to call when the event occurs
 * @param enabled Whether the listener should be active
 */
export function useBlockchainEvent(
  eventType: BlockchainEventType | '*',
  callback: (event: BlockchainEvent) => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;
    
    // Start event listeners if not already started
    blockchainService.startEventListeners().catch(console.error);
    
    // Subscribe to the event
    const unsubscribe = blockchainService.on(eventType, callback);
    
    // Clean up on unmount or when dependencies change
    return () => {
      unsubscribe();
    };
  }, [eventType, callback, enabled]);
}

/**
 * Hook to get the current event history
 * @param filter Optional filter function to filter events
 * @returns An array of BlockchainEvent objects
 */
export function useEventHistory(filter?: (event: BlockchainEvent) => boolean) {
  const [events, setEvents] = useState<BlockchainEvent[]>([]);
  
  // Update events when filter changes
  const updateEvents = useCallback(() => {
    const history = blockchainService.getEventHistory();
    setEvents(filter ? history.filter(filter) : history);
  }, [filter]);
  
  // Initial load
  useEffect(() => {
    updateEvents();
    
    // Subscribe to all events to update the history when new events come in
    const unsubscribe = blockchainService.on('*', updateEvents);
    
    return () => {
      unsubscribe();
    };
  }, [updateEvents]);
  
  return events;
}

/**
 * Hook to subscribe to product-related events
 * @param productId The ID of the product to track
 * @param callback Function to call when an event occurs for the product
 * @param enabled Whether the listener should be active
 */
export function useProductEvents(
  productId: number,
  callback: (event: BlockchainEvent) => void,
  enabled = true
) {
  const eventHandler = useCallback((event: BlockchainEvent) => {
    // Check if the event is related to the specified product
    if (
      (event.type === 'ProductCreated' && event.data.productId === productId.toString()) ||
      (event.type === 'OwnershipTransferred' && event.data.productId === productId.toString())
    ) {
      callback(event);
    }
  }, [productId, callback]);
  
  // Use the generic event hook with our filtered handler
  useBlockchainEvent('*', eventHandler, enabled);
}

/**
 * Hook to subscribe to batch-related events
 * @param batchId The ID of the batch to track
 * @param callback Function to call when an event occurs for the batch
 * @param enabled Whether the listener should be active
 */
export function useBatchEvents(
  batchId: number,
  callback: (event: BlockchainEvent) => void,
  enabled = true
) {
  const eventHandler = useCallback((event: BlockchainEvent) => {
    // Check if the event is related to the specified batch
    if (
      (event.type === 'BatchCreated' && event.data.batchId === batchId.toString()) ||
      (event.type === 'BatchLocationUpdated' && event.data.batchId === batchId.toString()) ||
      (event.type === 'BatchPurchased' && event.data.batchId === batchId.toString())
    ) {
      callback(event);
    }
  }, [batchId, callback]);
  
  // Use the generic event hook with our filtered handler
  useBlockchainEvent('*', eventHandler, enabled);
}
