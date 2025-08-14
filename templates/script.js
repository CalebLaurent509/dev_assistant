// Add these declarations at the top level, outside any function
let htmlPreviewContent = '';
let lastSentPosition = 0;
const CONTENT_CHUNK_SIZE = 80; // Send 80 characters at a time

function extractHtmlSections(rawValue) {
    const htmlStart = rawValue.indexOf('<html');
    const htmlEnd = rawValue.indexOf('</html>');
    
    if (htmlStart !== -1 && htmlEnd !== -1) {
        let intro = rawValue.slice(0, htmlStart).trim();
        let html = rawValue.slice(htmlStart, htmlEnd + '</html>'.length).trim();
        let outro = rawValue.slice(htmlEnd + '</html>'.length).trim();
        intro = intro.replace(/```html\s*/i, '').replace(/```/, '').trim();
        intro = intro.replace(/<!DOCTYPE html>/i, '').trim();
        outro = outro.replace(/```/g, '').trim();
        return { intro, html, outro };
    }
    let intro = rawValue.trim();
    intro = intro.replace(/```html\s*/i, '').replace(/```/, '').trim();
    return { intro, html: '', outro: '' };
}

function formatMarkdown(text) {
    const lines = text.split('\n');
    let formatted = '';
    let foundStep = false;

    const hasSteps = lines.some(line =>
        /^(\d+\.)/.test(line.trim()) || /^[-*]/.test(line.trim())
    );

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (hasSteps && i === 0 && line !== '') {
            formatted += `<strong>${line}</strong>`;
            continue;
        }

        if (/^(\d+\.)/.test(line) || /^[-*]/.test(line)) {
            foundStep = true;
            line = line.replace(/^(\d+\.)/, '<strong>$1</strong>');
            line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formatted += '<br>' + line;
        } else if (line !== '') {
            formatted += (i === 0 ? '' : '<br>') + line;
        }
    }
    return formatted.replace(/^<br>/, '');
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const messageText = input.value.trim();
    
    if (messageText) {
        const messageHistory = document.querySelector('.message-history');
        const inputArea = document.querySelector('.input-area');
        const iframe = document.querySelector('.iframe-section iframe');
        
        // Reset the HTML preview buffer for a new message
        htmlPreviewContent = '';
        lastSentPosition = 0;
        inputArea.classList.add('loading');
        
        // Add the user's message to the chat history
        const newMessage = document.createElement('div');
        newMessage.className = 'message user-message';
        newMessage.textContent = messageText;
        messageHistory.appendChild(newMessage);
        
        // Clear the input field after sending
        input.value = '';
        
        // Create a placeholder for the AI's response
        const aiResponse = document.createElement('div');
        aiResponse.className = 'message ai-message';
        
        // Create the container for the AI response content
        const responseContent = document.createElement('div');
        responseContent.className = 'ai-response-content';
        responseContent.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        aiResponse.appendChild(responseContent);
        
        // Create status indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'ai-message-status';
        statusIndicator.innerHTML = 'Processing...';
        aiResponse.appendChild(statusIndicator);
        
        // Create workflow details section (collapsed by default)
        const workflowDetails = document.createElement('div');
        workflowDetails.className = 'workflow-details';
        workflowDetails.innerHTML = 'View Processing Details';
        
        // Create workflow content container
        const workflowContent = document.createElement('div');
        workflowContent.className = 'workflow-details-content';
        workflowDetails.appendChild(workflowContent);
        
        // Add click handler to toggle workflow details
        workflowDetails.addEventListener('click', function() {
            this.classList.toggle('expanded');
            if (this.classList.contains('expanded')) {
                this.childNodes[0].textContent = 'Hide Processing Details';
            } else {
                this.childNodes[0].textContent = 'Show Processing Details';
            }
        });
        
        aiResponse.appendChild(workflowDetails);
        messageHistory.appendChild(aiResponse);
        
        // Track active nodes and processed steps
        const processedNodes = new Map();
        let activeStep = '';
        
        let shouldAutoScroll = true;

        // Add event listener to detect manual scrolling
        messageHistory.addEventListener('scroll', function() {
            // Check if user is near bottom (within 50px)
            const isNearBottom = messageHistory.scrollHeight - messageHistory.scrollTop - messageHistory.clientHeight < 50;
            shouldAutoScroll = isNearBottom;
        });
        
        try {
            // Set up fetch for streaming
            const response = await fetch('http://localhost:8000/chat-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: messageText })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Set up the reader for the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            // Process the stream
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }
                
                // Decode the chunk and add to buffer
                buffer += decoder.decode(value, { stream: true });
                
                // Process complete lines in the buffer
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
                
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    try {
                        const data = JSON.parse(line);
                        
                        if (data.type === 'start') {
                            //console.log('Thinking...', data.request_id);
                            statusIndicator.innerHTML = 'Thinking...';
                        } 
                        else if (data.type === 'update') {
                            // Format the node name for display
                            const nodeName = data.node.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')
                                .replace(/^\w/, c => c.toUpperCase());
                            
                            // Check if this is a message chunk update (streaming tokens)
                            if (data.node === 'messages') {
                                // Try to extract the message content from the AIMessageChunk
                                const messageChunkMatch = data.value.match(/AIMessageChunk\(content='([^']*)'/);
                                if (messageChunkMatch) {
                                    // Even if the content is empty, we get the match object
                                    const chunkContent = messageChunkMatch[1] ? messageChunkMatch[1].replace(/\\n/g, '\n') : '';
                                    
                                    // Get the langgraph_node info to know which node is generating this content
                                    const nodeInfoMatch = data.value.match(/'langgraph_node':\s*'([^']+)'/);
                                    const currentNode = nodeInfoMatch ? nodeInfoMatch[1] : null;
                                    
                                    // If we still have the typing indicator, remove it first
                                    if (responseContent.querySelector('.typing-indicator')) {
                                        responseContent.innerHTML = '';
                                    }
                                    
                                    // Append the new content to the response area
                                    responseContent.innerHTML += chunkContent;
                                    
                                    // Update status to show current node
                                    if (currentNode) {
                                        statusIndicator.innerHTML = `
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                            </svg>
                                            ${formatNodeName(currentNode)} is responding...
                                        `;
                                    }
                                    
                                    // Scroll to the bottom of the message history
                                    messageHistory.scrollTop = messageHistory.scrollHeight;
                                    return; // Skip the rest of the processing for this node
                                }
                            }
                            
                            // Update status to show current step
                            statusIndicator.innerHTML = `Thinking.. ${nodeName}...`;
                            activeStep = data.node;
                            
                            // Create or update the node in workflow details
                            if (!processedNodes.has(data.node)) {
                                //console.log('Adding new node:', data.node);
                                const nodeEl = document.createElement('div');
                                nodeEl.className = 'workflow-node';
                                nodeEl.innerHTML = `<div class="node-title">${nodeName}</div><div class="node-content"></div>`;
                                workflowContent.appendChild(nodeEl);
                                processedNodes.set(data.node, nodeEl);
                            }
                            
                            // Update node content by appending rather than replacing
                            const nodeEl = processedNodes.get(data.node);
                            const nodeContent = nodeEl.querySelector('.node-content');
                            
                            // We'll store the full content in a data attribute to avoid truncation issues when appending
                            if (!nodeContent.hasAttribute('data-full-content')) {
                                nodeContent.setAttribute('data-full-content', '');
                            }
                            
                            // Append the new value to our stored full content
                            const currentFullContent = nodeContent.getAttribute('data-full-content');
                            const newFullContent = currentFullContent + data.value;
                            // console.log('Received data from stream:', data.value);
                            //console.log('Got data from stream:', data);
                            nodeContent.setAttribute('data-full-content', newFullContent);
                            
                            // Update the displayed content (show full content, not truncated)
                            if (data.node === 'write_html_code') {
                                // Extraire la section HTML
                                const { html } = extractHtmlSections(newFullContent);
                                nodeContent.textContent = escapeHtml(html);
                            } else {
                                nodeContent.textContent = newFullContent;
                            }
                            
                            // If this is respond_naturally, update the main response content
                            let naturalResponseBuffer = '';
                            if (data.node === 'respond_naturally') {
                                // Remove typing indicator if present
                                if (responseContent.querySelector('.typing-indicator')) {
                                    responseContent.innerHTML = '';
                                }
                                // Ajoute le chunk au buffer
                                naturalResponseBuffer += data.value;
                                // Affiche le buffer (remplace tout le contenu à chaque chunk)
                                responseContent.innerHTML = naturalResponseBuffer.replace(/\n/g, '<br>');
                            }
                            
                            // Check if this is a write_html_code node
                            if (data.node === 'write_html_code') {
                                const { intro, html, outro } = extractHtmlSections(data.value);
                                // If we don't already have a code display, create one
                                let codeDisplay = responseContent.querySelector('pre.code-display');
                                if (!codeDisplay) {
                                    // Create formatted code display
                                    if (responseContent.querySelector('.typing-indicator')) {
                                        responseContent.innerHTML = '';
                                    }
                                    responseContent.innerHTML += `
                                        <div class="code-display-description" style="margin-bottom: 2.5px;"></div>
                                        <pre class="code-display" style="border-radius: 4px; padding: 12px; margin-top: 8px; max-height: 500px; font-family: monospace; font-size: 0.85rem; white-space: pre-wrap; counter-reset: line; border: 1px solid rgba(255, 255, 255, 0.1);"><code class="language-html"></code></pre>
                                    `;
                                    codeDisplay = responseContent.querySelector('pre.code-display');
                                }
                                let codeDesc = responseContent.querySelector('.code-display-description');
                                if (intro) {
                                    // Concatène l'intro (pour chunks successifs)
                                    codeDesc.innerHTML = formatMarkdown(intro);
                                }
                                // Get the code element
                                const codeElement = codeDisplay.querySelector('code');
                                codeElement.textContent += html;
                                if (window.Prism) {
                                    Prism.highlightElement(codeElement);
                                }
                                
                                if (outro) {
                                    // To avoid duplicating the outro, check if it's already present
                                    if (!responseContent.querySelector('.outro-text')) {
                                        responseContent.innerHTML += `<div class="outro-text" style="margin-top: 8px;">${outro}</div>`;
                                    }
                                }

                                // Add received chunk to the HTML preview buffer
                                htmlPreviewContent += data.value;

                                // Start or continue processing the HTML preview content
                                if (!window.processingPreview) {
                                    window.processingPreview = true;
                                    // console.log('Starting preview processing');
                                    processPreviewContent();
                                }
                                
                                // Scroll the code block to the bottom for better UX
                                codeDisplay.scrollTop = codeDisplay.scrollHeight;
                                
                                // Update status to indicate HTML code is being written
                                statusIndicator.innerHTML = `
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="16 18 22 12 16 6"></polyline>
                                        <polyline points="8 6 2 12 8 18"></polyline>
                                    </svg>
                                    Writing HTML code...
                                `;
                            }
                            
                            // Always scroll to the bottom of the message history
                            if (shouldAutoScroll) {
                                messageHistory.scrollTop = messageHistory.scrollHeight;
                            }
                        } 
                        else if (data.type === 'final') {
                            // Update status to show completion
                            statusIndicator.innerHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Complete
                            `;
                            
                            // Display the final message content
                            if (data.messages && data.messages.length > 0) {
                                const lastMessage = data.messages[data.messages.length - 1];
                                
                                // Remove typing indicator if present
                                if (responseContent.querySelector('.typing-indicator')) {
                                    responseContent.innerHTML = '';
                                }
                                
                                responseContent.innerHTML = lastMessage.content.replace(/\n/g, '<br>');
                            }
                            
                            // Refresh the iframe if HTML was updated
                            setTimeout(() => {
                                iframe.src = iframe.src;
                            }, 100);
                            //console.log('Stream ended:', data.request_id);
                            
                            // Update status to show completion with check mark
                            statusIndicator.innerHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Complete
                            `;
                            
                            // Make sure the message content is visible and not just a typing indicator
                            if (responseContent.querySelector('.typing-indicator')) {
                                const { intro, html, outro } = extractHtmlSections(data.value);
                                // If we somehow reached the end without receiving a final message content,
                                // replace the typing indicator with a completed message
                                if (intro) {
                                    // Pour éviter de dupliquer l'outro, vérifie si elle est déjà là
                                    if (!responseContent.querySelector('.intro-text')) {
                                        responseContent.innerHTML += `<div class="intro-text" style="margin-top: 8px;">${intro}</div>`;
                                    }
                                }
                            }
                            
                            // Reset HTML preview content
                            htmlPreviewContent = '';
                            lastSentPosition = 0;
                            window.processingPreview = false;
                            
                            // Refresh the iframe to show any HTML changes
                            setTimeout(() => {
                                iframe.src = iframe.src;
                            }, 100);
                        }
                        else if (data.type === 'error') {
                            statusIndicator.innerHTML = `Error: ${data.error}`;
                            statusIndicator.style.color = '#ff6b6b';
                        }
                    } catch (e) {
                        //console.error('Error parsing stream data:', e, line);
                    }
                }
            }
            
        } catch (error) {
            statusIndicator.innerHTML = `Error: ${error.message}`;
            statusIndicator.style.color = '#ff6b6b';
        } finally {
            inputArea.classList.remove('loading');
            messageHistory.scrollTop = messageHistory.scrollHeight;
        }
    }
}

// Allow Enter key to send message
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Ajoute un bouton de préférence pour minimiser/maximiser le panneau de prévisualisation

function updateLivePreview(codeSnippet) {
    let previewOverlay = document.getElementById('livePreviewOverlay');
    let previewContainer, titleOverlay, previewFrame, preferenceBtn, closeBtn;
    // On stocke isMinimized sur l'élément pour le garder entre les appels
    if (previewOverlay) {
        previewContainer = document.getElementById('livePreviewContainer');
        titleOverlay = document.getElementById('livePreviewTitle');
        previewFrame = document.getElementById('previewFrame');
        preferenceBtn = document.getElementById('previewPrefBtn');
        closeBtn = document.getElementById('previewCloseBtn');
    } else {
        // Overlay principal
        previewOverlay = document.createElement('div');
        previewOverlay.id = 'livePreviewOverlay';
        previewOverlay.className = 'livePreviewOverlay';
        // Panneau de preview
        previewContainer = document.createElement('div');
        previewContainer.id = 'livePreviewContainer';
        previewContainer.className = 'livePreviewContainer';
        // Titre overlay
        titleOverlay = document.createElement('div');
        titleOverlay.id = 'livePreviewTitle';
        titleOverlay.className = 'livePreviewTitle';
        titleOverlay.innerText = 'Live Playground Viewer';
        // Iframe de preview
        previewFrame = document.createElement('iframe');
        previewFrame.id = 'previewFrame';
        // Bouton préférence (min/max)
        preferenceBtn = document.createElement('button');
        preferenceBtn.id = 'previewPrefBtn';
        preferenceBtn.className = 'btn-preference';
        preferenceBtn.title = 'Minimize';
        preferenceBtn.innerText = '🗕';
        // Bouton fermer
        closeBtn = document.createElement('button');
        closeBtn.id = 'previewCloseBtn';
        closeBtn.className = 'btn-preference-icon';
        closeBtn.title = 'Close';
        closeBtn.innerHTML = '&#10006;'; // Set close button X symbol
        
        // Add buttons and iframe to container
        previewContainer.appendChild(preferenceBtn);
        previewContainer.appendChild(closeBtn);
        previewContainer.appendChild(previewFrame);
        previewOverlay.appendChild(titleOverlay);
        previewOverlay.appendChild(previewContainer);
        document.body.appendChild(previewOverlay);
        
        // Store minimized state on overlay
        previewOverlay.isMinimized = false;
        
        // Handle minimize/maximize button click
        preferenceBtn.onclick = function() {
            previewOverlay.isMinimized = !previewOverlay.isMinimized;
            previewOverlay.classList.toggle('minimized', previewOverlay.isMinimized);
            previewContainer.classList.toggle('minimized', previewOverlay.isMinimized);
            titleOverlay.classList.toggle('minimized', previewOverlay.isMinimized);
            preferenceBtn.classList.toggle('minimized', previewOverlay.isMinimized);
            closeBtn.classList.toggle('minimized', previewOverlay.isMinimized);
            // Update button icon and title based on state
            preferenceBtn.innerText = previewOverlay.isMinimized ? '▢' : '🗕';
            preferenceBtn.title = previewOverlay.isMinimized ? 'Unminimize' : 'Minimize';
        };
        
        // Handle close button click
        closeBtn.onclick = function() {
            previewOverlay.style.display = 'none';
        };
    }

    // Always show overlay when updating preview
    previewOverlay.style.display = 'flex';
    
    // Process code snippet if it's a valid string
    if (typeof codeSnippet === 'string') {
        if (codeSnippet.includes('<html')) {
            previewOverlay.htmlContent = '';
            previewOverlay.previewFinished = false;
        }
        if (!previewOverlay.htmlContent) previewOverlay.htmlContent = '';
        previewOverlay.htmlContent += codeSnippet;
        console.log('==> [INFO] snippet:', codeSnippet);

        // Cherche le début de la balise <html
        const htmlStart = previewOverlay.htmlContent.indexOf('<html');
        // Cherche la fin du document HTML
        const htmlEnd = previewOverlay.htmlContent.indexOf('</html>', htmlStart);

        // VRAI LIVE : on affiche tout à partir de <html, même si </html> n'est pas encore là
        if (htmlStart !== -1) {
            let htmlToDisplay;
            if (htmlEnd !== -1) {
                // Si on a la fin, on affiche que le HTML complet
                htmlToDisplay = previewOverlay.htmlContent.slice(htmlStart, htmlEnd + 7);
            } else {
                // Sinon, on affiche tout ce qu'on a reçu depuis <html (progression live)
                htmlToDisplay = previewOverlay.htmlContent.slice(htmlStart);
            }

            try {
                const frameDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
                frameDoc.open();
                frameDoc.write(htmlToDisplay);
                frameDoc.close();
            } catch (e) {
                console.log('Error updating live preview:', e);
            }
        }

        // Optionnel : flag pour ne plus actualiser après la fin
        if (htmlEnd !== -1) {
            previewOverlay.previewFinished = true;
            console.log('Preview HTML terminé !');
        }
    } else {
        console.error('Invalid content type:', codeSnippet);
    }
}

// Replace processHtmlBuffer with this
function processPreviewContent() {
    //console.log('Processing content, position:', lastSentPosition, 'of', htmlPreviewContent.length);
    if (htmlPreviewContent.length > lastSentPosition) {
        
        const chunk = htmlPreviewContent.substring(lastSentPosition, lastSentPosition + CONTENT_CHUNK_SIZE);
        lastSentPosition += chunk.length;
        //console.log('Sending chunk of length:', chunk.length);
       // console.log("===> htmlPreviewContent:", htmlPreviewContent);
        updateLivePreview(chunk);
        
        // If there's more to process, schedule the next chunk
        if (htmlPreviewContent.length > lastSentPosition) {
            setTimeout(processPreviewContent, 60); // Process every 60ms for a smooth effect
        } else {
            window.processingPreview = false;
            //console.log('Content processing complete');
        }
    } else {
        window.processingPreview = false;
        console.log('No more content to process');
    }
}

// Replace hideFragmentModal with this
function hideLivePreview() {
    const previewOverlay = document.getElementById('livePreviewOverlay');
    if (previewOverlay) {
        previewOverlay.style.display = 'none';
    }
}