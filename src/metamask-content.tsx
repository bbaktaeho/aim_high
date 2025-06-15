// MetaMask-specific content script
// This script handles only MetaMask-related functionality
// Export to make this file a module (required for global declarations)
export { };

let isMetaMaskContentInitialized = false;

// Initialize MetaMask content script
const initializeMetaMaskContent = () => {
  console.log('🦊 Initializing MetaMask content script...');
  
  // Inject page script for MetaMask communication
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('page-script.js');
  script.onload = () => {
    console.log('🦊 MetaMask page script loaded');
    script.remove();
    isMetaMaskContentInitialized = true;
  };
  script.onerror = (error) => {
    console.error('❌ Failed to load MetaMask page script:', error);
  };
  (document.head || document.documentElement).appendChild(script);
};

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

// Listen for messages from popup and background (MetaMask-specific only)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🦊 MetaMask content script received message:', message, 'from:', sender);

  // Only handle MetaMask-related messages
  if (message.type === 'METAMASK_PING') {
    console.log('🦊 METAMASK_PING received, sending PONG');
    sendResponse({ type: 'METAMASK_PONG', initialized: isMetaMaskContentInitialized });
    return true;
  }

  if (message.type === 'GET_METAMASK_INFO') {
    console.log('🦊 GET_METAMASK_INFO received');
    
    sendMessageToPage('GET_METAMASK_INFO')
      .then(ethereumInfo => {
        console.log('🦊 Received basic ethereum info:', ethereumInfo);
        sendResponse({
          type: 'METAMASK_INFO',
          data: ethereumInfo
        });
      })
      .catch(error => {
        console.error('❌ Error getting MetaMask info:', error);
        sendResponse({
          type: 'METAMASK_INFO',
          data: null
        });
      });
    
    return true; // Will respond asynchronously
  }

  if (message.type === 'GET_METAMASK_INFO_WITH_ACCOUNTS') {
    console.log('🦊 GET_METAMASK_INFO_WITH_ACCOUNTS received');
    
    sendMessageToPage('GET_METAMASK_INFO_WITH_ACCOUNTS')
      .then(ethereumInfo => {
        console.log('🦊 Received full ethereum info with accounts:', ethereumInfo);
        sendResponse({
          type: 'METAMASK_INFO',
          data: ethereumInfo
        });
      })
      .catch(error => {
        console.error('❌ Error getting MetaMask info with accounts:', error);
        sendResponse({
          type: 'METAMASK_INFO',
          data: null
        });
      });
    
    return true; // Will respond asynchronously
  }

  if (message.type === 'REQUEST_ACCOUNTS') {
    console.log('🦊 REQUEST_ACCOUNTS received');
    
    sendMessageToPage('REQUEST_ACCOUNTS')
      .then(accounts => {
        console.log('🦊 Accounts received:', accounts);
        sendResponse({
          type: 'ACCOUNTS_RESULT',
          data: accounts
        });
      })
      .catch(error => {
        console.error('❌ Error requesting accounts:', error);
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
    console.log('🦊 DISCONNECT_WALLET received');
    
    sendMessageToPage('DISCONNECT_WALLET')
      .then(() => {
        console.log('🦊 Wallet disconnected');
        sendResponse({ type: 'DISCONNECTED' });
      })
      .catch(error => {
        console.error('❌ Error disconnecting wallet:', error);
        sendResponse({ type: 'DISCONNECTED' }); // Still send success even if there's an error
      });
    
    return true; // Will respond asynchronously
  }

  // Ignore other message types (they will be handled by other content scripts)
  return false;
});

// Initialize immediately
initializeMetaMaskContent();

console.log('🦊 MetaMask content script loaded and ready'); 