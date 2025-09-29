/**
 * Centralized copy-to-clipboard utility with fallback support
 * Handles both embedded and non-embedded contexts
 */

export interface CopyOptions {
  /**
   * Function to call on successful copy
   */
  onSuccess?: (method: 'clipboard' | 'execCommand') => void;
  
  /**
   * Function to call on copy failure
   */
  onError?: (error: unknown) => void;
  
  /**
   * Whether to show user feedback (default: true)
   */
  showFeedback?: boolean;
  
  /**
   * Custom feedback message for success
   */
  successMessage?: string;
  
  /**
   * Custom feedback message for failure
   */
  errorMessage?: string;
}

/**
 * Detect if we're in an embedded context (iframe or embed path)
 */
function isEmbedded(): boolean {
  return (
    window.location.hostname === 'archgen-ecru.vercel.app' ||
    window.location.pathname === '/embed' ||
    window.parent !== window
  );
}

/**
 * Copy text to clipboard with fallback support
 * Returns true if successful, false otherwise
 */
export async function copyToClipboard(
  text: string, 
  options: CopyOptions = {}
): Promise<boolean> {
  const {
    onSuccess,
    onError,
    showFeedback = true,
    successMessage = 'Copied to clipboard',
    errorMessage = 'Failed to copy'
  } = options;

  if (!text || text.trim().length === 0) {
    console.warn('⚠️ No text provided to copy');
    return false;
  }

  try {
    const embedded = isEmbedded();
    let success = false;
    let method: 'clipboard' | 'execCommand' = 'clipboard';

    console.log(`📋 Copying text (embedded: ${embedded}):`, text.substring(0, 50) + '...');

    if (embedded) {
      // For embedded contexts, use execCommand for reliability
      console.log('🔧 Using execCommand for embedded context');
      success = await copyWithExecCommand(text);
      method = 'execCommand';
    } else {
      // For non-embedded contexts, try modern clipboard API first
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          success = true;
          console.log('✅ Modern clipboard API succeeded');
        } else {
          throw new Error('Clipboard API not available');
        }
      } catch (clipboardError) {
        console.warn('⚠️ Modern clipboard API failed, trying fallback:', clipboardError);
        
        // Fallback to execCommand
        success = await copyWithExecCommand(text);
        method = 'execCommand';
      }
    }

    if (success) {
      console.log(`✅ Copy succeeded using ${method}`);
      if (showFeedback) {
        // Could integrate with notification system here
        console.log(`📋 ${successMessage}`);
      }
      onSuccess?.(method);
      return true;
    } else {
      console.warn('⚠️ All copy methods failed');
      if (showFeedback) {
        console.warn(`❌ ${errorMessage}`);
      }
      onError?.(new Error('All copy methods failed'));
      return false;
    }
  } catch (error) {
    console.error('❌ Copy operation failed:', error);
    if (showFeedback) {
      console.error(`❌ ${errorMessage}`);
    }
    onError?.(error);
    return false;
  }
}

/**
 * Fallback copy method using execCommand with invisible textarea
 */
async function copyWithExecCommand(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Style for invisibility
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      textArea.style.zIndex = '-1';
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      console.log(`✅ ExecCommand copy ${success ? 'succeeded' : 'failed'}`);
      resolve(success);
    } catch (error) {
      console.warn('⚠️ ExecCommand copy failed:', error);
      resolve(false);
    }
  });
}

/**
 * Hook for copy-to-clipboard with state management
 * Returns { copy, isCopying, copySuccess, copyError }
 */
export function useCopyToClipboard() {
  // This could be enhanced with React state if needed
  // For now, keeping it simple as a pure function
  
  const copyWithState = async (
    text: string, 
    options: CopyOptions = {}
  ): Promise<{ success: boolean; method?: 'clipboard' | 'execCommand'; error?: unknown }> => {
    try {
      const success = await copyToClipboard(text, options);
      return { 
        success, 
        method: success ? 'clipboard' : undefined,
        error: undefined 
      };
    } catch (error) {
      return { 
        success: false, 
        error 
      };
    }
  };

  return {
    copy: copyToClipboard,
    copyWithState
  };
}
