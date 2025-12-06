import { addReasoningMessage, addFunctionCallingMessage, updateStreamingMessage, addProcessCompleteMessage, makeChatVisible } from "../../utils/chatUtils";

export async function process_user_requirements() {
    console.log('🚀 process_user_requirements: FUNCTION CALLED!');
    
    // Signal that processing has started for the status icon
    window.dispatchEvent(new CustomEvent('userRequirementsStart'));
    
    console.log('📤 Dispatched userRequirementsStart event');
    addReasoningMessage("⚡ Processing your request...");
    console.log('💬 Added reasoning message');
    makeChatVisible();
    console.log('👁️ Made chat visible');
  
  // START PERFORMANCE TIMING
  const processStart = performance.now();

  

  
  try {
    // Get the current text input
    const currentTextInput = (window as any).chatTextInput || '';
    console.log('📝 Current text input from global state:', currentTextInput);
    
    // Handle empty input
    if (!currentTextInput.trim()) {
      console.warn('⚠️ No text input provided');
      return;
    }
    
    console.log('✅ Text input validation passed, proceeding with:', currentTextInput.trim());
    
    // Clear any previous conversation data to start fresh
    (window as any).chatConversationData = "";
    
    // Store current input globally for processing
    (window as any).chatTextInput = currentTextInput;
    
    const dataCollectionTime = performance.now();
    console.log('⏱️ Data collection time recorded:', dataCollectionTime);

    
    // Update the reasoning message to show progress
    console.log('📝 Calling updateStreamingMessage...');
    updateStreamingMessage(
      null, // messageId will be found automatically
      "🔍 Analyzing your requirements...", 
      true, // isStreaming
      null // currentFunction
    );
    console.log('✅ updateStreamingMessage called successfully');
    
    // Get images from global state
    const storedImages = (window as any).selectedImages || [];
    console.log('🖼️ Retrieved stored images:', storedImages.length, 'images');
    console.log('🖼️ Image data:', storedImages);
    
    // DEBUG: Check if images are being used
    if (storedImages.length > 0) {
      console.log('📸 DEBUG: Images found in process_user_requirements - will be included in architecture generation');
    } else {
      console.log('📸 DEBUG: No images found in process_user_requirements');
    }

          
    // Build conversationData as formatted string
    const conversationData = `USER: ${currentTextInput}

${currentTextInput}`;
    console.log('💬 Built conversation data:', conversationData.length, 'characters');
    
    const conversationPrepTime = performance.now();

    
    // Store globally for processing
    (window as any).chatConversationData = conversationData;
    console.log('💾 Stored conversation data globally');

    
    // Notify that we're moving to architecture generation
    console.log('🏗️ Updating message to "Generating architecture..."');
    updateStreamingMessage(
      null, // messageId will be found automatically
      "🏗️ Generating architecture...", 
      true, // isStreaming  
      null // currentFunction
    );
    
    const setupCompleteTime = performance.now();
    console.log('⏱️ Setup complete time:', setupCompleteTime);

    
         // Get current graph state
     const currentGraph = (window as any).getCurrentGraph?.() || { id: "root", children: [] };

    
     // Reasoning message tracking
     let reasoningMessageId: string | null = null;
     let reasoningContent = "";
 
     // Function call message tracking  
     const functionCallMessages = new Map<string, { messageId: string; content: string }>();
     
    const executorSetupTime = performance.now();

    // Call the unified handleChatSubmit which handles the full AI generation flow
    const handleChatSubmit = (window as any).handleChatSubmit;
    if (handleChatSubmit && typeof handleChatSubmit === 'function') {
      console.log('📞 Calling unified handleChatSubmit for architecture generation...');
      await handleChatSubmit(currentTextInput.trim());
      console.log('✅ handleChatSubmit completed');
    } else {
      console.error('❌ handleChatSubmit not available on window - InteractiveCanvas may not be mounted');
      throw new Error('handleChatSubmit not available - canvas not ready');
    }
    
  } catch (error) {
    console.error('❌ Error in process_user_requirements:', error);
    updateStreamingMessage(
      null,
      `❌ Error: ${error}`,
      false,
      null
    );
  }
  
  const processEnd = performance.now();

} 