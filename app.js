const CLIENT_ID = '1013571264807-3k2pvpcldetqatqil8i42onm8aphknvj.apps.googleusercontent.com'; // ★★★ Google Cloud Consoleで取得したクライアントIDに置き換える ★★★
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';

let authorizeButton = document.getElementById('authorize_button');
let signoutButton = document.getElementById('signout_button');
let contentDiv = document.getElementById('content');

function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

function initClient() {
    gapi.client.init({
        discoveryDocs: DISCOVERY_DOCS,
        clientId: CLIENT_ID,
        scope: SCOPES
    }).then(function () {
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        authorizeButton.onclick = handleAuthClick;
        signoutButton.onclick = handleSignoutClick;
    }).catch(function(error) {
        console.error("Error initializing Google API client:", error);
        contentDiv.innerHTML = `<p style="color:red;">Error initializing Google API client: ${error.details || error.message || JSON.stringify(error)}</p>`;
    });
}

function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        authorizeButton.style.display = 'none';
        signoutButton.style.display = 'block';
        contentDiv.innerHTML = '';
        listFiles('root', contentDiv, true); // Start with root, true indicates it's the initial call
    } else {
        authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';
        contentDiv.innerHTML = '<p>Please authorize to see your Drive files.</p>';
    }
}

function handleAuthClick(event) {
    gapi.auth2.getAuthInstance().signIn();
}

function handleSignoutClick(event) {
    gapi.auth2.getAuthInstance().signOut();
}

function listFiles(parentId, parentElement, isInitialCall = false) {
    // フォルダを開くときに「読み込み中...」を表示
    if (!isInitialCall && parentElement.classList.contains('folder-content')) {
        parentElement.innerHTML = '<p style="font-style:italic; color:gray; margin-left:5px;">Loading...</p>';
    }

    gapi.client.drive.files.list({
        'pageSize': 200, // 表示件数を増やす (最大1000まで、パフォーマンスに注意)
        'q': `'${parentId}' in parents and trashed=false`,
        'fields': "nextPageToken, files(id, name, mimeType, iconLink, webViewLink, modifiedTime, size, shortcutDetails)", // shortcutDetailsを追加
        'orderBy': 'folder,name'
    }).then(function(response) {
        if (!isInitialCall && parentElement.classList.contains('folder-content')) {
             parentElement.innerHTML = ''; // ローディング表示をクリア
        }

        const files = response.result.files;
        if (files && files.length > 0) {
            files.forEach(file => {
                if (file.mimeType === 'application/vnd.google-apps.folder' || (file.shortcutDetails && file.shortcutDetails.targetMimeType === 'application/vnd.google-apps.folder')) {
                    createFolderElement(file, parentElement);
                } else {
                    createFileElement(file, parentElement);
                }
            });
        } else {
            if (parentElement !== contentDiv || (parentElement === contentDiv && isInitialCall)) {
                const p = document.createElement('p');
                p.textContent = '(empty)';
                p.style.fontStyle = 'italic';
                p.style.color = 'gray';
                p.style.marginLeft = parentElement.classList.contains('folder-content') ? '5px' : '20px';
                parentElement.appendChild(p);
            }
        }
    }).catch(function(err) {
        console.error("Error listing files:", err);
        if (parentElement.classList.contains('folder-content')) parentElement.innerHTML = ''; // Clear loading if error
        const errorP = document.createElement('p');
        errorP.style.color = 'red';
        errorP.textContent = `Error listing files: ${err.result.error.message || JSON.stringify(err)}`;
        parentElement.appendChild(errorP);
    });
}

function createFolderElement(folder, parentDomElement) {
    const details = document.createElement('details');
    details.className = 'folder';
    details.id = `folder-${folder.id}`;

    const summary = document.createElement('summary');

    const iconImg = document.createElement('img');
    iconImg.className = 'icon';
    iconImg.src = folder.iconLink || 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png';
    iconImg.alt = 'folder';
    summary.appendChild(iconImg);

    summary.appendChild(document.createTextNode(folder.name));
    if (folder.shortcutDetails && folder.shortcutDetails.targetId) {
        summary.appendChild(document.createTextNode(' (Shortcut)'));
    }
    details.appendChild(summary);

    const folderContentDiv = document.createElement('div');
    folderContentDiv.className = 'folder-content';
    details.appendChild(folderContentDiv);

    details.addEventListener('toggle', function(event) {
        if (details.open && folderContentDiv.innerHTML === '') {
            const targetId = folder.shortcutDetails ? folder.shortcutDetails.targetId : folder.id;
            listFiles(targetId, folderContentDiv);
        }
    });
    parentDomElement.appendChild(details);
}

function createFileElement(file, parentDomElement) {
    const div = document.createElement('div');
    div.className = 'file';

    const iconImg = document.createElement('img');
    iconImg.className = 'icon';
    iconImg.src = file.iconLink || 'https://ssl.gstatic.com/images/branding/product/1x/document_32dp.png'; // Generic file icon
    iconImg.alt = 'file';
    div.appendChild(iconImg);

    const a = document.createElement('a');
    a.href = file.webViewLink;
    a.target = '_blank';
    a.textContent = file.name;
    if (file.shortcutDetails && file.shortcutDetails.targetId) {
        a.appendChild(document.createTextNode(' (Shortcut)'));
    }
    div.appendChild(a);

    const metaSpan = document.createElement('span');
    metaSpan.className = 'file-meta';
    let metaInfo = [];
    if (file.size) { // sizeはフォルダやGoogleドキュメント系には通常ない
        metaInfo.push(`${(file.size / 1024 / 1024).toFixed(2)} MB`);
    }
    if (file.modifiedTime) {
        metaInfo.push(`Modified: ${new Date(file.modifiedTime).toLocaleDateString()}`);
    }
    metaSpan.textContent = metaInfo.join(' - ');
    div.appendChild(metaSpan);

    parentDomElement.appendChild(div);
}