/**
 * Chat Persistence Utility
 * Handles saving and restoring chat messages between different views
 */

export interface PersistedChatMessage {
  id: string;
  content: string;
  timestamp: number;
  sender: 'user' | 'assistant';
}

const CHAT_STORAGE_KEY = 'atelier_chat_messages';
const CURRENT_CONVERSATION_KEY = 'atelier_current_conversation';
const EMBED_TO_CANVAS_FLAG_KEY = 'atelier_embed_to_canvas';

/**
 * Mark that user is coming from embed view to canvas view (via Edit button)
 */
export function markEmbedToCanvasTransition(): void {
  try {
    localStorage.setItem(EMBED_TO_CANVAS_FLAG_KEY, 'true');
    console.log('🏷️ Marked embed-to-canvas transition');
  } catch (error) {
    console.warn('Failed to mark embed-to-canvas transition:', error);
  }
}

/**
 * Check if user is coming from embed view to canvas view
 */
export function isEmbedToCanvasTransition(): boolean {
  try {
    return localStorage.getItem(EMBED_TO_CANVAS_FLAG_KEY) === 'true';
  } catch (error) {
    console.warn('Failed to check embed-to-canvas transition:', error);
    return false;
  }
}

/**
 * Clear the embed-to-canvas transition flag
 */
export function clearEmbedToCanvasFlag(): void {
  try {
    localStorage.removeItem(EMBED_TO_CANVAS_FLAG_KEY);
    console.log('🧹 Cleared embed-to-canvas transition flag');
  } catch (error) {
    console.warn('Failed to clear embed-to-canvas transition flag:', error);
  }
}

/**
 * Save a chat message to localStorage - only keeps the current conversation
 */
export function saveChatMessage(message: string, sender: 'user' | 'assistant' = 'user'): void {
  try {
    const newMessage: PersistedChatMessage = {
      id: crypto.randomUUID(),
      content: message.trim(),
      timestamp: Date.now(),
      sender
    };

    // For new user messages, start a fresh conversation
    if (sender === 'user') {
      // Clear previous conversation and start with this message
      localStorage.setItem(CURRENT_CONVERSATION_KEY, JSON.stringify([newMessage]));
      console.log('💾 Started new conversation with message:', newMessage);
    } else {
      // For assistant messages, add to current conversation
      const currentConversation = getCurrentConversation();
      const updatedConversation = [...currentConversation, newMessage];
      localStorage.setItem(CURRENT_CONVERSATION_KEY, JSON.stringify(updatedConversation));
      console.log('💾 Added to current conversation:', newMessage);
    }
  } catch (error) {
    console.warn('Failed to save chat message:', error);
  }
}

/**
 * Get the current conversation (last user message + any assistant responses)
 */
export function getCurrentConversation(): PersistedChatMessage[] {
  try {
    const stored = localStorage.getItem(CURRENT_CONVERSATION_KEY);
    if (!stored) return [];
    
    const messages = JSON.parse(stored) as PersistedChatMessage[];
    return Array.isArray(messages) ? messages : [];
  } catch (error) {
    console.warn('Failed to load current conversation:', error);
    return [];
  }
}

/**
 * Get all persisted chat messages (only if coming from embed view)
 */
export function getChatMessages(): PersistedChatMessage[] {
  // Only return messages if user is coming from embed view to canvas view
  if (isEmbedToCanvasTransition()) {
    const messages = getCurrentConversation();
    // Loading persisted messages from embed view
    return messages;
  } else {
    // No persisted messages (not from embed view)
    return [];
  }
}

/**
 * Get the most recent chat message
 */
export function getLastChatMessage(): PersistedChatMessage | null {
  const messages = getCurrentConversation();
  return messages.length > 0 ? messages[messages.length - 1] : null;
}

/**
 * Clear all persisted chat messages and embed-to-canvas flag
 */
export function clearChatMessages(): void {
  try {
    localStorage.removeItem(CURRENT_CONVERSATION_KEY);
    localStorage.removeItem(CHAT_STORAGE_KEY); // Clear legacy storage too
    localStorage.removeItem(EMBED_TO_CANVAS_FLAG_KEY); // Clear embed-to-canvas flag
    console.log('🗑️ Chat messages and embed-to-canvas flag cleared');
  } catch (error) {
    console.warn('Failed to clear chat messages:', error);
  }
}

/**
 * Save the current chatbox input text (for when user is typing but hasn't submitted)
 */
export function saveChatboxInput(input: string): void {
  try {
    if (input.trim()) {
      localStorage.setItem('atelier_chatbox_input', input.trim());
    } else {
      localStorage.removeItem('atelier_chatbox_input');
    }
  } catch (error) {
    console.warn('Failed to save chatbox input:', error);
  }
}

/**
 * Get the saved chatbox input text
 */
export function getChatboxInput(): string {
  try {
    return localStorage.getItem('atelier_chatbox_input') || '';
  } catch (error) {
    console.warn('Failed to load chatbox input:', error);
    return '';
  }
}

/**
 * Clear the saved chatbox input
 */
export function clearChatboxInput(): void {
  try {
    localStorage.removeItem('atelier_chatbox_input');
  } catch (error) {
    console.warn('Failed to clear chatbox input:', error);
  }
}

/**
 * Start a new conversation (clears current conversation)
 */
export function startNewConversation(): void {
  try {
    localStorage.removeItem(CURRENT_CONVERSATION_KEY);
    console.log('🆕 Started new conversation');
  } catch (error) {
    console.warn('Failed to start new conversation:', error);
  }
}
