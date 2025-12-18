"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "./button"
import { Send, Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"
import { process_user_requirements } from "../graph/userRequirements"
import type { ChatBoxProps } from "../../types/chat"
import { saveChatMessage, saveChatboxInput, getChatboxInput, clearChatboxInput } from "../../utils/chatPersistence"

const ChatBox: React.FC<ChatBoxProps> = ({ onSubmit, isDisabled = false, onProcessStart }) => {
  const [textInput, setTextInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Example use cases
  const exampleUseCases = [
    "GCP microservices with Kubernetes",
    "AWS serverless web application", 
    "Multi-cloud data pipeline"
  ];

  // Load saved chatbox input on mount
  useEffect(() => {
    const savedInput = getChatboxInput();
    if (savedInput) {
      setTextInput(savedInput);
      console.log('📥 Restored chatbox input:', savedInput);
    }
  }, []);

  // Auto-focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      // Prevent the page from scrolling down to the input on initial load
      inputRef.current.focus({ preventScroll: true });
    }
  }, []);

  // Save input text as user types
  useEffect(() => {
    saveChatboxInput(textInput);
  }, [textInput]);

  const handleExampleClick = async (example: string) => {
    if (isProcessing || isDisabled) return; // Prevent clicks during processing or when disabled
    
    setTextInput(example);
    setIsProcessing(true);
    
    try {
      // Save the example message to persistence
      saveChatMessage(example, 'user');
      
      // Notify parent that processing is starting
      if (onProcessStart) {
        onProcessStart();
      }
      
      // Store text input globally for reasoning agent
      (window as any).originalChatTextInput = example; // Keep original for chat naming
      (window as any).chatTextInput = example;
      (window as any).selectedImages = [];
      
      console.log('🚀 Chatbox: Processing example:', example);
      console.log('🌍 Global state set:', {
        originalChatTextInput: (window as any).originalChatTextInput,
        chatTextInput: (window as any).chatTextInput,
        selectedImages: (window as any).selectedImages
      });
      
      // Call process_user_requirements to trigger the architecture generation
      process_user_requirements();
      console.log('✅ Chatbox: process_user_requirements called');
      
      // Clear the input after processing starts
      setTextInput("");
      // Clear the saved input since message was submitted
      clearChatboxInput();
      
      // DO NOT call onSubmit here - process_user_requirements already calls handleChatSubmit internally
      // Calling onSubmit here would cause duplicate architecture generation
      
    } catch (error) {
      console.error('Failed to process example:', error);
    } finally {
      // Reset processing state after a short delay
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (textInput.trim() && !isProcessing && !isDisabled) {
      const messageText = textInput.trim();
      setIsProcessing(true);
      
      try {
        // Save the message to persistence before processing
        saveChatMessage(messageText, 'user');
        
        // Notify parent that processing is starting
        if (onProcessStart) {
          onProcessStart();
        }
        
        // Store text input globally for reasoning agent
        (window as any).originalChatTextInput = messageText; // Keep original for chat naming
        (window as any).chatTextInput = messageText;
        (window as any).selectedImages = [];
        
        console.log('🚀 Chatbox: Processing user input:', messageText);
        console.log('🌍 Global state set:', {
          originalChatTextInput: (window as any).originalChatTextInput,
          chatTextInput: (window as any).chatTextInput,
          selectedImages: (window as any).selectedImages
        });
        
        // Call process_user_requirements to trigger the architecture generation
        // NOTE: process_user_requirements internally calls handleChatSubmit, so we should NOT
        // also call onSubmit here, as that would cause duplicate architecture generation
        process_user_requirements();
        console.log('✅ Chatbox: process_user_requirements called');
        
        // Clear the input after processing starts
        setTextInput("");
        // Clear the saved input since message was submitted
        clearChatboxInput();
        
        // DO NOT call onSubmit here - process_user_requirements already calls handleChatSubmit internally
        // Calling onSubmit here would cause duplicate architecture generation
        
      } catch (error) {
        console.error('Failed to process input:', error);
      } finally {
        // Reset processing state after a short delay
        setTimeout(() => {
          setIsProcessing(false);
        }, 1000);
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter alone submits, Shift+Enter creates new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
    // Shift+Enter is allowed to pass through naturally for new lines
  }

  // Auto-resize textarea based on content
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`; // Max height ~6 lines
    }
  }, [textInput]);

  // Stop event propagation to prevent ReactFlow from processing chatbox clicks
  const handleChatboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Also stop on the native event to catch all cases
    if (e.nativeEvent) {
      e.nativeEvent.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  return (
    <div className="w-full p-4" data-chatbox="true" onClick={handleChatboxClick} onMouseDown={handleChatboxClick}>
      {/* Example use cases pills - above the input */}
      <div className="mb-3 flex flex-wrap gap-2 justify-center">
        {exampleUseCases.map((example, index) => (
          <button
            key={index}
            onClick={() => handleExampleClick(example)}
            disabled={isProcessing || isDisabled}
            className="text-xs px-4 py-2 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 text-gray-700 hover:text-blue-700 border border-gray-200 hover:border-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transform hover:scale-105 flex items-center"
          >
            {example}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="w-full" onClick={handleChatboxClick} onMouseDown={handleChatboxClick}>
        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm p-3 hover:shadow-md transition-shadow" onClick={handleChatboxClick} onMouseDown={handleChatboxClick}>
          {/* Input field */}
          <textarea
            ref={inputRef}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your architecture requirements"
            disabled={isProcessing || isDisabled}
            rows={1}
            className={cn(
              "flex-grow border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none bg-transparent text-base placeholder:text-gray-400",
              "resize-none overflow-hidden min-h-[2rem] max-h-[7.5rem] px-3 py-2 leading-6"
            )}
            style={{ 
              height: 'auto',
              maxHeight: '120px',
              overflowY: 'auto'
            }}
            data-chat-input="true"
          />
          
          {/* Clear button (when there's text) */}
          {textInput.trim() && !isProcessing && (
            <button
              type="button"
              onClick={() => setTextInput('')}
              className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              Clear
            </button>
          )}
          
          {/* Submit button - Always enabled, black color */}
          <Button
            type="submit"
            className="h-10 w-10 rounded-lg flex-shrink-0 flex items-center justify-center p-0 bg-gray-900 hover:bg-gray-800 text-white transition-all"
            disabled={isProcessing || isDisabled}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ChatBox

