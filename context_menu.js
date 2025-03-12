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
    if (area === 'local' && changes.prompts) {
        console.log("Prompts changed in storage. Updating context menu...");
        updateContextMenu();
    }
});

function updateContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "promptInserterParent",
            title: "Prompt Inserter",
            contexts: ["editable"]
        });

        chrome.storage.local.get({ prompts: [] }, (data) => {
            if (chrome.runtime.lastError) {
                console.error("Error getting prompts from storage:", chrome.runtime.lastError);
                return;
            }
            const prompts = data.prompts;
            console.log("Loaded prompts:", prompts);

            if (prompts && prompts.length > 0) {
                prompts.forEach((prompt) => {
                    if (prompt.title.includes('-')) {
                        console.log("Skipping context menu item for:", prompt.title);
                        return;
                    }

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

chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log("Context menu item clicked:", info.menuItemId);
    if (info.menuItemId === "addPrompt") {
        chrome.runtime.openOptionsPage();
        return;
    }

    // content_script.js にメッセージを送信
    chrome.tabs.sendMessage(tab.id, {
        action: "insertPrompt",
        promptId: info.menuItemId
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError);
        } else {
            console.log("Response from content script:", response); // 応答をログ出力
        }
    });
});