// content_script.js

// バックグラウンドスクリプトからのメッセージを待ち受ける
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message);

    if (message.action === "insertPrompt") {
        const promptId = message.promptId;
        console.log("Received promptId:", promptId);
        checkAndInsert(promptId);
    }
    return true; // 非同期処理(chrome.storage.localを使う)場合はtrueを返却
});

function checkAndInsert(promptId) {
    let activeElement = document.activeElement;

    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
        chrome.storage.local.get({ prompts: [] }, (data) => {
            const prompts = data.prompts;
            const selectedPrompt = prompts.find(p => p.promptId === promptId);

            if (selectedPrompt) {
                const relatedPrompts = [];
                const searchText = selectedPrompt.title.trim();

                for (const p of prompts) {
                    if (p.promptId === promptId) {
                        continue;
                    }
                    if (p.title.toLowerCase().indexOf(searchText.toLowerCase()) !== -1) {
                        relatedPrompts.push(p);
                    }
                }

                let combinedPrompt = selectedPrompt.content;
                if(relatedPrompts.length > 0){
                    for (const p of relatedPrompts) {
                        combinedPrompt += "\n\n" + p.content;
                    }
                }

                try {
                    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
                        let startPos = activeElement.selectionStart;
                        let endPos = activeElement.selectionEnd;
                        activeElement.value = activeElement.value.substring(0, startPos) + combinedPrompt + activeElement.value.substring(endPos);
                        activeElement.selectionStart = activeElement.selectionEnd = startPos + combinedPrompt.length;
                        activeElement.focus();
                    } else { // contenteditable
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            range.deleteContents();
                            const textNode = document.createTextNode(combinedPrompt);
                            range.insertNode(textNode);
                            range.setStartAfter(textNode);
                            range.setEndAfter(textNode);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                        activeElement.focus();
                    }
                } catch (error) {
                    console.error("Error inserting text:", error);
                }
            } else {
                console.warn("Selected prompt not found in storage.");
            }
        });
    } else {
        console.log("Clicked element is not editable.");
    }
}