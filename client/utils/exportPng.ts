/**
 * PNG Export utility for ReactFlow architectures
 * Extracted from InteractiveCanvas for better modularity
 */

export interface ExportOptions {
  scale?: number;
  backgroundColor?: string;
  imageTimeout?: number;
  showNotification?: (type: string, title: string, message: string) => void;
}

/**
 * Export the current ReactFlow architecture as a PNG image
 */
export async function exportArchitectureAsPNG(
  nodes: any[],
  options: ExportOptions = {}
): Promise<void> {
  const {
    scale = 2,
    backgroundColor = '#ffffff',
    imageTimeout = 30000,
    showNotification
  } = options;

  if (!nodes.length) {
    console.warn('⚠️ No architecture to export');
    return;
  }

  try {
    console.log('📸 Starting PNG export...');
    
    // Temporarily hide sidebar during export to avoid interference
    const sidebar = document.querySelector('[class*="w-80"]') || document.querySelector('[class*="w-18"]');
    const originalSidebarDisplay = sidebar ? sidebar.style.display : '';
    if (sidebar) {
      sidebar.style.display = 'none';
      console.log('🔧 Temporarily hiding sidebar for export');
    }
    
    // Small delay to ensure sidebar is hidden
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get the main ReactFlow container (not viewport)
    const reactFlowContainer = document.querySelector('.react-flow');
    if (!reactFlowContainer) {
      throw new Error('ReactFlow container not found');
    }

    console.log('📐 Capturing entire ReactFlow container');
    console.log('📐 Container dimensions:', {
      width: reactFlowContainer.clientWidth,
      height: reactFlowContainer.clientHeight,
      scrollWidth: reactFlowContainer.scrollWidth,
      scrollHeight: reactFlowContainer.scrollHeight
    });
    
    // Debug: Check what's in the original ReactFlow container
    const originalNodes = reactFlowContainer.querySelectorAll('.react-flow__node');
    const originalEdges = reactFlowContainer.querySelectorAll('.react-flow__edge');
    const originalImages = reactFlowContainer.querySelectorAll('img');
    
    console.log(`🔍 Original container contents:`, {
      nodes: originalNodes.length,
      edges: originalEdges.length,
      images: originalImages.length,
      totalElements: reactFlowContainer.querySelectorAll('*').length
    });
    
    // Debug nodes in detail
    originalNodes.forEach((node, index) => {
      const nodeElement = node as HTMLElement;
      const nodeText = nodeElement.textContent || nodeElement.innerText || '';
      const nodeImages = nodeElement.querySelectorAll('img');
      console.log(`🔍 Original Node ${index + 1}:`, {
        id: nodeElement.getAttribute('data-id') || 'no-id',
        text: nodeText.substring(0, 50) + (nodeText.length > 50 ? '...' : ''),
        classes: nodeElement.className,
        visible: nodeElement.offsetWidth > 0 && nodeElement.offsetHeight > 0,
        images: nodeImages.length,
        imagesSrc: Array.from(nodeImages).map(img => img.src.substring(0, 100)),
        position: {
          left: nodeElement.style.left,
          top: nodeElement.style.top,
          transform: nodeElement.style.transform
        },
        styles: {
          display: nodeElement.style.display,
          visibility: nodeElement.style.visibility,
          opacity: nodeElement.style.opacity
        }
      });
    });
    
    // Debug edges in detail
    originalEdges.forEach((edge, index) => {
      const edgeElement = edge as HTMLElement;
      console.log(`🔍 Original Edge ${index + 1}:`, {
        id: edgeElement.getAttribute('data-id') || 'no-id',
        classes: edgeElement.className,
        visible: edgeElement.offsetWidth > 0 && edgeElement.offsetHeight > 0,
        pathElements: edgeElement.querySelectorAll('path').length,
        styles: {
          display: edgeElement.style.display,
          visibility: edgeElement.style.visibility,
          opacity: edgeElement.style.opacity
        }
      });
    });
    
    // Debug images in detail
    originalImages.forEach((img, index) => {
      console.log(`🔍 Original Image ${index + 1}:`, {
        src: img.src.substring(0, 100) + (img.src.length > 100 ? '...' : ''),
        alt: img.alt,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        width: img.width,
        height: img.height,
        visible: img.offsetWidth > 0 && img.offsetHeight > 0,
        styles: {
          display: img.style.display,
          visibility: img.style.visibility,
          opacity: img.style.opacity
        }
      });
    });

    // Import html2canvas
    const html2canvas = (await import('html2canvas')).default;
    
    // Simple approach: capture the entire ReactFlow container
    const captureCanvas = await html2canvas(reactFlowContainer as HTMLElement, {
      backgroundColor,
      scale, // 2x resolution for HD quality
      useCORS: true,
      allowTaint: true,
      logging: false, // Disable logging to reduce noise
      foreignObjectRendering: true, // Support for SVG text
      imageTimeout, // 30 second timeout for images to load
      removeContainer: false, // Keep container structure
      ignoreElements: (element): boolean => {
        // Only exclude UI controls and overlays, keep all content
        return element.classList.contains('react-flow__controls') ||
               element.classList.contains('react-flow__minimap') ||
               element.classList.contains('react-flow__attribution') ||
               element.classList.contains('react-flow__panel') ||
               (element.tagName === 'BUTTON' && element.closest('.react-flow__controls') !== null) ||
               (element.classList.contains('absolute') && (
                 element.classList.contains('top-4') || 
                 element.classList.contains('bottom-4') ||
                 element.textContent?.includes('Share') ||
                 element.textContent?.includes('Export') ||
                 element.textContent?.includes('Save')
               ));
      },
      onclone: async (clonedDoc) => {
        console.log('🔧 Processing cloned document for export...');
        
        // Debug: Check what ReactFlow elements exist in the cloned document
        const clonedContainer = clonedDoc.querySelector('.react-flow');
        const clonedNodes = clonedDoc.querySelectorAll('.react-flow__node');
        const clonedEdges = clonedDoc.querySelectorAll('.react-flow__edge');
        const clonedImages = clonedDoc.querySelectorAll('img');
        
        console.log(`🔍 Cloned document contents:`, {
          hasContainer: !!clonedContainer,
          nodes: clonedNodes.length,
          edges: clonedEdges.length,
          images: clonedImages.length,
          totalElements: clonedDoc.querySelectorAll('*').length
        });
        
        // Debug cloned nodes in detail
        clonedNodes.forEach((node, index) => {
          const nodeElement = node as HTMLElement;
          const nodeText = nodeElement.textContent || nodeElement.innerText || '';
          const nodeImages = nodeElement.querySelectorAll('img');
          console.log(`🔍 Cloned Node ${index + 1}:`, {
            id: nodeElement.getAttribute('data-id') || 'no-id',
            classes: nodeElement.className,
            text: nodeText.substring(0, 50) + (nodeText.length > 50 ? '...' : ''),
            images: nodeImages.length,
            imagesSrc: Array.from(nodeImages).map(img => img.src.substring(0, 100)),
            visible: nodeElement.offsetWidth > 0 && nodeElement.offsetHeight > 0,
            position: {
              left: nodeElement.style.left,
              top: nodeElement.style.top,
              transform: nodeElement.style.transform
            },
            innerHTML: nodeElement.innerHTML.substring(0, 200) + (nodeElement.innerHTML.length > 200 ? '...' : '')
          });
        });
        
        // Debug cloned edges in detail
        clonedEdges.forEach((edge, index) => {
          const edgeElement = edge as HTMLElement;
          console.log(`🔍 Cloned Edge ${index + 1}:`, {
            id: edgeElement.getAttribute('data-id') || 'no-id',
            classes: edgeElement.className,
            visible: edgeElement.offsetWidth > 0 && edgeElement.offsetHeight > 0,
            pathElements: edgeElement.querySelectorAll('path').length,
            innerHTML: edgeElement.innerHTML.substring(0, 200) + (edgeElement.innerHTML.length > 200 ? '...' : '')
          });
        });
        
        // Debug cloned images in detail
        clonedImages.forEach((img, index) => {
          console.log(`🔍 Cloned Image ${index + 1}:`, {
            src: img.src.substring(0, 100) + (img.src.length > 100 ? '...' : ''),
            alt: img.alt,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            width: img.width,
            height: img.height,
            visible: img.offsetWidth > 0 && img.offsetHeight > 0
          });
        });
    
        // Wait a moment for images to load in cloned document
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force all images to be visible and loaded
        const images = clonedDoc.querySelectorAll('img');
        console.log(`🖼️ Found ${images.length} images to process`);
        
        images.forEach((img, index) => {
          console.log(`🔧 Processing image ${index + 1} BEFORE:`, {
            src: img.src.substring(0, 100),
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            display: img.style.display,
            visibility: img.style.visibility,
            opacity: img.style.opacity
          });
          
          // Force image visibility
          img.style.display = 'block';
          img.style.visibility = 'visible';
          img.style.opacity = '1';
          img.style.maxWidth = 'none';
          img.style.maxHeight = 'none';
          
          // If image has no src or failed to load, try to fix it
          if (!img.src || img.src.includes('data:') || !img.complete) {
            console.log(`🔄 Fixing image ${index + 1}:`, img.src);
            
            // Try to get the original src from data attributes or parent
            const originalSrc = img.getAttribute('data-src') || 
                              img.getAttribute('data-original') ||
                              img.src;
            
            if (originalSrc && !originalSrc.includes('data:')) {
              img.src = originalSrc;
              img.crossOrigin = 'anonymous';
            }
          }
          
          console.log(`🔧 Processing image ${index + 1} AFTER:`, {
            src: img.src.substring(0, 100),
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            display: img.style.display,
            visibility: img.style.visibility,
            opacity: img.style.opacity
          });
        });
    
        // Ensure all text is visible and properly styled
        const textElements = clonedDoc.querySelectorAll('text, span, div, p, h1, h2, h3, h4, h5, h6, label');
        console.log(`📝 Found ${textElements.length} text elements to process`);
        
        textElements.forEach((textEl, index) => {
          const htmlEl = textEl as HTMLElement;
          const originalText = htmlEl.textContent || htmlEl.innerText || '';
          const originalStyles = {
            visibility: htmlEl.style.visibility,
            opacity: htmlEl.style.opacity,
            color: htmlEl.style.color,
            fontSize: htmlEl.style.fontSize,
            display: htmlEl.style.display,
            position: htmlEl.style.position,
            transform: htmlEl.style.transform
          };
          
          console.log(`📝 Text element ${index + 1}:`, {
            tagName: htmlEl.tagName,
            text: originalText.substring(0, 50) + (originalText.length > 50 ? '...' : ''),
            className: htmlEl.className,
            originalStyles,
            computedStyles: window.getComputedStyle ? {
              visibility: window.getComputedStyle(htmlEl).visibility,
              opacity: window.getComputedStyle(htmlEl).opacity,
              color: window.getComputedStyle(htmlEl).color,
              fontSize: window.getComputedStyle(htmlEl).fontSize
            } : 'N/A'
          });
          
          if (htmlEl.style) {
            htmlEl.style.visibility = 'visible';
            htmlEl.style.opacity = '1';
            htmlEl.style.color = htmlEl.style.color || '#000000';
            htmlEl.style.fontSize = htmlEl.style.fontSize || '14px';
            htmlEl.style.display = htmlEl.style.display || 'block';
            
            // Force text to be on top
            if (htmlEl.style.position === 'absolute' || htmlEl.style.position === 'relative') {
              htmlEl.style.zIndex = '9999';
            }
          }
        });
        
        // Remove any loading spinners or placeholders
        const loadingElements = clonedDoc.querySelectorAll('.loading, .spinner, .placeholder');
        loadingElements.forEach(el => el.remove());
        
        // Final debug: Check the final state before html2canvas captures
        const finalNodes = clonedDoc.querySelectorAll('.react-flow__node');
        const finalEdges = clonedDoc.querySelectorAll('.react-flow__edge');
        const finalImages = clonedDoc.querySelectorAll('img');
        
        console.log('🏁 FINAL STATE before html2canvas:', {
          nodes: finalNodes.length,
          edges: finalEdges.length,
          images: finalImages.length,
          visibleNodes: Array.from(finalNodes).filter(n => (n as HTMLElement).offsetWidth > 0).length,
          visibleEdges: Array.from(finalEdges).filter(e => (e as HTMLElement).offsetWidth > 0).length,
          visibleImages: Array.from(finalImages).filter(i => (i as HTMLElement).offsetWidth > 0).length,
          loadedImages: Array.from(finalImages).filter(i => (i as HTMLImageElement).complete).length
        });
        
        console.log('✅ Cloned document processing complete');
      }
    });
    
    console.log('📊 Canvas capture completed:', {
      width: captureCanvas.width,
      height: captureCanvas.height,
      dataURL: captureCanvas.toDataURL().substring(0, 100) + '...'
    });
    
    // Convert to blob and download
    captureCanvas.toBlob((blob) => {
      if (!blob) {
        console.error('❌ Failed to create PNG blob');
        return;
      }
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `architecture-${new Date().toISOString().slice(0, 10)}.png`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
      console.log('✅ PNG export completed successfully');
      
      // Restore sidebar after successful export
      if (sidebar) {
        sidebar.style.display = originalSidebarDisplay;
        console.log('🔧 Restored sidebar after export');
      }
      
      // Show success notification if available
      if (showNotification) {
        showNotification('success', 'Export Complete', 'Architecture exported as PNG');
      }
    }, 'image/png', 1.0); // Max quality
    
  } catch (error) {
    console.error('❌ PNG export failed:', error);
    
    // Restore sidebar after failed export
    const sidebar = document.querySelector('[class*="w-80"]') || document.querySelector('[class*="w-18"]');
    if (sidebar) {
      sidebar.style.display = '';
      console.log('🔧 Restored sidebar after failed export');
    }
    
    // Show error notification if available
    if (showNotification) {
      showNotification('error', 'Export Failed', 'Failed to export PNG. Please try again.');
    }
    
    throw error;
  }
}
