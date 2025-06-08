let isEnabled = false;
let selectedText = '';
let selectionRange: Range | null = null;
let isInitialized = false;

// Declare global UI elements
let floatingButton: HTMLButtonElement;
let popupBox: HTMLDivElement;
let popupContent: HTMLDivElement;

// Common styles
const styles = {
  floatingButton: {
    position: 'fixed',
    display: 'none',
    padding: '10px 20px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    zIndex: 10000,
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
    transition: 'all 0.2s ease',
    transform: 'translate(-50%, 0)', // Center horizontally
    '&:hover': {
      backgroundColor: '#059669',
      boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)',
    },
  },
  popupBox: {
    position: 'fixed',
    display: 'none',
    padding: '16px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: 10001,
    maxWidth: '400px',
    minWidth: '120px',
    minHeight: '20px',
    fontSize: '14px',
    lineHeight: '1.5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: '#1A1A1A',
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    boxSizing: 'border-box',
    letterSpacing: '0.3px',
  },
  popupContent: {
    marginBottom: '16px',
  },
  analyzeButton: {
    width: '100%',
    padding: '8px 16px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#059669',
    },
  },
  popupContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
};

// Create floating button element
const createFloatingButton = () => {
  const button = document.createElement('button');
  Object.assign(button.style, styles.floatingButton);
  button.textContent = 'Show Selection';
  
  // Add hover effect
  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = '#059669';
    button.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.3)';
  });
  
  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = '#10B981';
    button.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
  });
  
  return button;
};

// Create popup box element
const createPopupBox = () => {
  const container = document.createElement('div');
  Object.assign(container.style, styles.popupBox);
  
  const contentDiv = document.createElement('div');
  Object.assign(contentDiv.style, styles.popupContent);
  container.appendChild(contentDiv);
  
  const button = document.createElement('button');
  Object.assign(button.style, styles.analyzeButton);
  button.textContent = 'Analyze';
  
  // Add hover effect
  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = '#059669';
  });
  
  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = '#10B981';
  });
  
  // Add click handler
  button.addEventListener('click', () => {
    const selectedText = contentDiv.textContent || '';
    if (selectedText) {
      const encodedText = encodeURIComponent(selectedText);
      const analyzeUrl = `https://nodit.io/analyze?text=${encodedText}`;
      window.open(analyzeUrl, '_blank');
    }
  });
  
  container.appendChild(button);
  return { container, contentDiv };
};

// Initialize content script
const initializeContentScript = () => {
  console.log('Initializing content script...');
  
  // Inject page script
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('page-script.js');
  script.onload = () => {
    console.log('Page script loaded');
    script.remove();
    isInitialized = true;
  };
  script.onerror = (error) => {
    console.error('Failed to load page script:', error);
  };
  (document.head || document.documentElement).appendChild(script);

  // Create and append UI elements
  floatingButton = createFloatingButton();
  const popupElements = createPopupBox();
  popupBox = popupElements.container;
  popupContent = popupElements.contentDiv;
  
  document.body.appendChild(floatingButton);
  document.body.appendChild(popupBox);

  // Set up event listeners
  setupEventListeners();

  // Notify that content script is ready
  console.log('Content script initialized, sending CONTENT_SCRIPT_READY');
  chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });
};

// Set up event listeners
const setupEventListeners = () => {
  // Handle text selection
  document.addEventListener('mouseup', (e) => {
    if (!isEnabled) return;

    const selection = window.getSelection();
    selectedText = selection?.toString() || '';
    selectionRange = selection?.rangeCount ? selection.getRangeAt(0) : null;

    if (selectedText && selectionRange) {
      const rect = selectionRange.getBoundingClientRect();
      
      // Position button below the selection
      const buttonX = rect.left + (rect.width / 2);
      const buttonY = rect.bottom + window.scrollY + 10;
      
      floatingButton.style.display = 'block';
      floatingButton.style.left = `${buttonX}px`;
      floatingButton.style.top = `${buttonY}px`;
    } else {
      floatingButton.style.display = 'none';
      popupBox.style.display = 'none';
    }
  });

  // Handle floating button click
  floatingButton.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (!selectedText) return;
    
    popupContent.textContent = selectedText;
    
    const buttonRect = floatingButton.getBoundingClientRect();
    popupBox.style.display = 'block';
    
    const popupRect = popupBox.getBoundingClientRect();
    
    let left = buttonRect.left - (popupRect.width / 2);
    let top = buttonRect.bottom + 10;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (left < 10) {
      left = 10;
    } else if (left + popupRect.width > viewportWidth - 10) {
      left = viewportWidth - popupRect.width - 10;
    }
    
    if (top + popupRect.height > viewportHeight + window.scrollY - 10) {
      top = buttonRect.top - popupRect.height - 10;
    }
    
    popupBox.style.left = `${left}px`;
    popupBox.style.top = `${top}px`;
  });

  // Close popup when clicking outside
  document.addEventListener('click', (e) => {
    if (!popupBox.contains(e.target as Node) && e.target !== floatingButton) {
      popupBox.style.display = 'none';
    }
  });

  // Hide popup and button when scrolling
  document.addEventListener('scroll', () => {
    floatingButton.style.display = 'none';
    popupBox.style.display = 'none';
  });
};

// Initialize immediately
initializeContentScript();

// Helper function to send message to page script
const sendMessageToPage = (action: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const messageId = Date.now().toString();
      
      // Set up message listener
      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === 'FROM_PAGE' && event.data.messageId === messageId) {
          window.removeEventListener('message', messageHandler);
          
          if (event.data.success) {
            resolve(event.data.data);
          } else {
            reject(new Error(event.data.error.message));
          }
        }
      };
      
      // Add timeout
      const timeout = setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        reject(new Error('Message timeout'));
      }, 10000); // 10 second timeout
      
      window.addEventListener('message', messageHandler);
      
      // Send message to page
      window.postMessage({
        type: 'FROM_CONTENT_SCRIPT',
        messageId,
        action
      }, '*');
      
    } catch (error) {
      reject(error);
    }
  });
};

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message, 'from:', sender);

  if (message.type === 'PING') {
    console.log('PING received, sending PONG');
    sendResponse({ type: 'PONG', initialized: isInitialized });
    return true;
  }
  
  if (message.type === 'TOGGLE_EXTENSION') {
    console.log('TOGGLE_EXTENSION received:', message.isEnabled);
    isEnabled = message.isEnabled;
    if (!isEnabled && floatingButton && popupBox) {
      floatingButton.style.display = 'none';
      popupBox.style.display = 'none';
    }
  }

  if (message.type === 'GET_METAMASK_INFO') {
    console.log('GET_METAMASK_INFO received');
    
    sendMessageToPage('GET_METAMASK_INFO')
      .then(ethereumInfo => {
        console.log('Received ethereum info:', ethereumInfo);
        sendResponse({
          type: 'METAMASK_INFO',
          data: ethereumInfo
        });
      })
      .catch(error => {
        console.error('Error getting MetaMask info:', error);
        sendResponse({
          type: 'METAMASK_INFO',
          data: null
        });
      });
    
    return true; // Will respond asynchronously
  }

  if (message.type === 'REQUEST_ACCOUNTS') {
    console.log('REQUEST_ACCOUNTS received');
    
    sendMessageToPage('REQUEST_ACCOUNTS')
      .then(accounts => {
        console.log('Accounts received:', accounts);
        sendResponse({
          type: 'ACCOUNTS_RESULT',
          data: accounts
        });
      })
      .catch(error => {
        console.error('Error requesting accounts:', error);
        sendResponse({
          type: 'ACCOUNTS_ERROR',
          error: {
            code: error.code,
            message: error.message
          }
        });
      });
    
    return true; // Will respond asynchronously
  }

  if (message.type === 'DISCONNECT_WALLET') {
    console.log('DISCONNECT_WALLET received');
    
    sendMessageToPage('DISCONNECT_WALLET')
      .then(() => {
        console.log('Wallet disconnected');
        sendResponse({ type: 'DISCONNECTED' });
      })
      .catch(error => {
        console.error('Error disconnecting wallet:', error);
        sendResponse({ type: 'DISCONNECTED' }); // Still send success even if there's an error
      });
    
    return true; // Will respond asynchronously
  }
}); 