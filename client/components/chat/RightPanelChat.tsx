"use client"

import React, { useState, useEffect, useRef } from "react"
import { Input } from "../ui/input"
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Cpu
} from "lucide-react"
import { cn } from "../../lib/utils"
import ReactMarkdown from "react-markdown"

interface RightPanelChatProps {
  className?: string
  isCollapsed: boolean
  onToggleCollapse?: () => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

const RightPanelChat: React.FC<RightPanelChatProps> = ({
  className,
  isCollapsed,
  onToggleCollapse
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDiagramGenerating, setIsDiagramGenerating] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    console.log('🔄 Messages changed, attempting to scroll. Messages count:', messages.length, 'isMinimized:', isMinimized)
    if (messagesEndRef.current && !isMinimized) {
      console.log('📜 Scrolling to bottom...')
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    } else {
      console.log('❌ Cannot scroll - messagesEndRef:', !!messagesEndRef.current, 'isMinimized:', isMinimized)
    }
  }, [messages, isMinimized])

  // Auto-focus input when component mounts
  useEffect(() => {
    if (inputRef.current && !isMinimized) {
      inputRef.current.focus({ preventScroll: true })
    }
  }, [isMinimized])

  const callOpenAI = async (userMessage: string) => {
    console.log('🚀 Starting OpenAI call with message:', userMessage)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: userMessage }
          ]
        }),
      })

      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ HTTP error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      console.log('📖 Starting to read stream...')
      const decoder = new TextDecoder()
      let assistantMessage = ''

      // Create streaming message
      const streamingMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      }

      setMessages(prev => [...prev, streamingMessage])
      console.log('💬 Added streaming message to chat')

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('✅ Stream completed')
          break
        }

        const chunk = decoder.decode(value)
        console.log('📦 Received chunk:', chunk)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            console.log('📊 Processing data:', data)
            
            if (data === '[DONE]') {
              console.log('🏁 Stream marked as done')
              // Mark streaming as complete
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === streamingMessage.id 
                    ? { ...msg, isStreaming: false }
                    : msg
                )
              )
              return
            }

            try {
              const parsed = JSON.parse(data)
              console.log('🔍 Parsed data:', parsed)
              console.log('🔍 Parsed data type:', parsed.type)
              
              // Handle special diagram creation messages
              if (parsed.type === 'diagram_creation') {
                console.log('🏗️ Diagram creation message received:', parsed.message)
                assistantMessage += `\n\n${parsed.message}`
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === streamingMessage.id 
                      ? { ...msg, content: assistantMessage }
                      : msg
                  )
                )
                continue // Continue processing other messages in the same chunk
              }
              
              // Handle diagram trigger
              if (parsed.type === 'trigger_diagram') {
                console.log('🚀 Triggering diagram creation with:', parsed.requirements)
                console.log('🔍 Full trigger_diagram object:', parsed)
                
                // Set loading state for diagram generation
                setIsDiagramGenerating(true)
                console.log('🔄 Set diagram generation loading state to true')
                
                // Set global state (needed for naming and other functions)
                ;(window as any).originalChatTextInput = parsed.requirements
                ;(window as any).chatTextInput = parsed.requirements
                ;(window as any).selectedImages = []
                console.log('✅ Set global state for diagram generation')
                
                // Use the SAME PATH as regular architecture generation
                // Call handleChatSubmit directly since process_user_requirements is disabled
                console.log('📞 Using unified architecture generation path via handleChatSubmit...')
                try {
                  const handleChatSubmit = (window as any).handleChatSubmit
                  if (handleChatSubmit && typeof handleChatSubmit === 'function') {
                    console.log('✅ Found handleChatSubmit function, calling it...')
                    await handleChatSubmit(parsed.requirements)
                    console.log('✅ handleChatSubmit completed successfully')
                  } else {
                    console.error('❌ handleChatSubmit function not found on window object')
                    throw new Error('handleChatSubmit function not available')
                  }
                } catch (error) {
                  console.error('❌ Architecture generation failed:', error)
                } finally {
                  // Clear loading state after completion
                  setIsDiagramGenerating(false)
                  console.log('✅ Set diagram generation loading state to false')
                }
                continue // Continue processing other messages in the same chunk
              }
              
              // Handle error messages
              if (parsed.type === 'error') {
                console.log('❌ Error message received:', parsed.message)
                assistantMessage += `\n\nError: ${parsed.message}`
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === streamingMessage.id 
                      ? { ...msg, content: assistantMessage }
                      : msg
                  )
                )
                continue // Continue processing other messages in the same chunk
              }
              
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content
                assistantMessage += content
                console.log('📝 Adding content:', content, 'Total:', assistantMessage)
                
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === streamingMessage.id 
                      ? { ...msg, content: assistantMessage }
                      : msg
                  )
                )
              }
            } catch (e) {
              console.log('⚠️ Failed to parse chunk:', data, 'Error:', e)
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error calling OpenAI:', error)
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('📝 HandleSendMessage called with input:', inputValue)
    
    if (!inputValue.trim() || isLoading) {
      console.log('❌ Cannot send message - empty input or loading:', { inputValue, isLoading })
      return
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    console.log('💬 Adding user message:', userMessage)
    setMessages(prev => [...prev, userMessage])
    const messageText = inputValue.trim()
    setInputValue("")
    setIsLoading(true)

    console.log('🚀 Calling OpenAI with message:', messageText)
    try {
      await callOpenAI(messageText)
    } finally {
      console.log('🏁 OpenAI call completed')
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e as any)
    }
  }

  const getMessageIcon = (role: ChatMessage['role']) => {
    switch (role) {
      case 'user':
        return <User className="w-4 h-4" />
      case 'assistant':
        return <Bot className="w-4 h-4" />
      default:
        return <MessageSquare className="w-4 h-4" />
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={cn(`
      relative h-full bg-gray-50 text-gray-700 border-l border-gray-200 transition-all duration-300 ease-in-out
      ${isCollapsed ? 'w-18' : 'w-96'}
    `, className)}>
      
      {/* Agent Icon - Always visible at top-right, never moves, with hover overlay for both states */}
      <div className="absolute top-4 right-4 z-50">
        <div className="relative group" data-testid="agent-icon">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg shadow-lg border bg-white text-gray-700 border-gray-200">
            <Cpu className="w-4 h-4" />
          </div>
          {/* Hover overlay - show expand icon when collapsed, collapse icon when expanded */}
          <button 
            onClick={onToggleCollapse}
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 shadow-lg"
            title={isCollapsed ? "Open Chat Panel" : "Close Chat Panel"}
          >
            {isCollapsed ? (
              <PanelRightOpen className="w-4 h-4" />
            ) : (
              <PanelRightClose className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Icon Layout - Always Visible */}
      <div className="flex flex-col h-full pt-16">
        {/* Divider */}
        {!isCollapsed && (
          <div className="mx-4 my-4 border-t border-gray-300"></div>
        )}

        {/* Chat Content - Only when expanded */}
        {!isCollapsed && (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 mt-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Cpu className="w-8 h-8 text-gray-300" />
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role !== 'user' && (
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                          {getMessageIcon(message.role)}
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "max-w-3/4 rounded-lg px-3 py-2 shadow-sm",
                          message.role === 'user'
                            ? "bg-gray-900 text-white"
                            : "bg-white border border-gray-200 text-gray-900"
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <div className="text-sm prose prose-sm max-w-none prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-gray-500">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                        )}
                        {message.isStreaming && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        )}
                        <p className={cn(
                          "text-xs mt-1",
                          message.role === 'user' ? "text-gray-300" : "text-gray-500"
                        )}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>

                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                          {getMessageIcon(message.role)}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-gray-500">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {isDiagramGenerating && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          <span className="text-sm text-gray-500">Generating architecture...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="mx-4 mt-4 border-t border-gray-300 pt-4 pb-4">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-white rounded-lg border border-gray-300 shadow-sm p-3 hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-gray-400 focus-within:border-gray-400">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  data-testid="chat-input"
                  placeholder="Ask me to create an architecture..."
                  disabled={isLoading || isDiagramGenerating}
                  className="flex-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading || isDiagramGenerating}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all duration-200 ${
                    !inputValue.trim() || isLoading || isDiagramGenerating
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow-md'
                  }`}
                  data-testid="send-button"
                  title={isLoading ? "Sending..." : isDiagramGenerating ? "Generating architecture..." : "Send message"}
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default RightPanelChat