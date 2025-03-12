// context_menu.js
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed. Updating context menu...");
    updateContextMenu();
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.prompts) {
        console.log("Prompts changed in storage. Updating context menu...");
        updateContextMenu();
    }
});

function updateContextMenu() {
    chrome.contextMenus.removeAll(() => {
        // 親メニューを作成
        chrome.contextMenus.create({
            id: "promptInserterParent",
            title: "Prompt Inserter",
            contexts: ["editable"]
        });

        chrome.storage.sync.get({ prompts: [] }, (data) => {
            if (chrome.runtime.lastError) {
                console.error("Error getting prompts from storage:", chrome.runtime.lastError);
                return;
            }
            const prompts = data.prompts;
            console.log("Loaded prompts:", prompts);

            if (prompts && prompts.length > 0) {
                // プロンプトがある場合は、それぞれを子メニューとして追加
                prompts.forEach((prompt) => {
                    chrome.contextMenus.create({
                        id: prompt.promptId,
                        title: prompt.title,
                        parentId: "promptInserterParent",
                        contexts: ["editable"]
                    }, () => {
                        if (chrome.runtime.lastError) {
                            console.error("Error creating context menu item:", chrome.runtime.lastError);
                        }
                    });
                });
            }

            // 「プロンプトを追加する」メニュー項目を *最後* に作成
            chrome.contextMenus.create({
                id: "addPrompt",
                title: "プロンプトを追加する",
                parentId: "promptInserterParent",
                contexts: ["editable"]
            });

            console.log("Context menu updated.");
        });
    });
}

// コンテキストメニューがクリックされたときの処理 (変更なし)
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log("Context menu item clicked:", info.menuItemId);
    if (info.menuItemId === "addPrompt") {
        // 「プロンプトを追加する」がクリックされたら、オプションページを開く
        chrome.runtime.openOptionsPage();
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: checkAndInsert,
        args: [info.menuItemId]
    }, (results) => {
        if (chrome.runtime.lastError) {
            console.error("Error executing script:", chrome.runtime.lastError);
            return;
        }
    });
});

function checkAndInsert(promptId) {
    let activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        chrome.storage.sync.get({ prompts: [] }, (data) => {
            const prompts = data.prompts;
            const selectedPrompt = prompts.find(p => p.promptId === promptId);

            if(selectedPrompt) {
                let startPos = activeElement.selectionStart;
                let endPos = activeElement.selectionEnd;
                activeElement.value = activeElement.value.substring(0, startPos) + selectedPrompt.content + activeElement.value.substring(endPos);
                activeElement.selectionStart = activeElement.selectionEnd = startPos + selectedPrompt.content.length;
                activeElement.focus();
            }
        });

    } else if (activeElement && activeElement.isContentEditable) {
        // contenteditable の場合の処理
        chrome.storage.sync.get({ prompts: [] }, (data) => {
            const prompts = data.prompts;
            const selectedPrompt = prompts.find(p => p.promptId === promptId);
            if(selectedPrompt){
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    const textNode = document.createTextNode(selectedPrompt.content);
                    range.insertNode(textNode);
                    range.setStartAfter(textNode);
                    range.setEndAfter(textNode);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                activeElement.focus();
            }
        });
    } else {
        console.log("Clicked element is not editable.");
    }
}