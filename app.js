const CLIENT_ID = '1013571264807-3k2pvpcldetqatqil8i42onm8aphknvj.apps.googleusercontent.com';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';

let authorizeButton = document.getElementById('authorize_button');
let signoutButton = document.getElementById('signout_button');
let contentDiv = document.getElementById('content');

let tokenClient;

// フォルダ展開状況を記憶（folderId => boolean）
const expandedFolders = {};

function handleClientLoad() {
    gapi.load('client', initClient);
}

function initClient() {
    gapi.client.init({
        discoveryDocs: DISCOVERY_DOCS
    }).then(() => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.error) {
                    console.error('Token error:', tokenResponse);
                    contentDiv.innerHTML = `<p style="color:red;">Token Error: ${tokenResponse.error}</p>`;
                    return;
                }
                gapi.client.setToken(tokenResponse);
                updateSigninStatus(true);
            },
        });

        updateSigninStatus(false);
        authorizeButton.onclick = handleAuthClick;
        signoutButton.onclick = handleSignoutClick;
    }).catch((error) => {
        console.error("Error initializing Google API client:", error);
        contentDiv.innerHTML = `<p style="color:red;">Error initializing Google API client: ${error.details || error.message || JSON.stringify(error)}</p>`;
    });
}

function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        authorizeButton.style.display = 'none';
        signoutButton.style.display = 'block';
        contentDiv.innerHTML = '';

        const urlParams = new URLSearchParams(window.location.search);
        const folderId = urlParams.get('folderId') || 'root';

        listFiles(folderId, contentDiv);
    } else {
        authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';
        contentDiv.innerHTML = '<p>Please authorize to see your Drive files.</p>';
    }
}

function handleAuthClick(event) {
    tokenClient.requestAccessToken();
}

function handleSignoutClick(event) {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken('');
            updateSigninStatus(false);
        });
    }
}

// Google Drive mimeTypeごとのアイコンURL例（必要に応じて増やしてください）
const ICONS = {
    'application/vnd.google-apps.folder': 'https://ssl.gstatic.com/docs/doclist/images/drive_folder_24.png',
    'application/pdf': 'https://ssl.gstatic.com/docs/doclist/images/icon_11_pdf_list.png',
    'application/vnd.google-apps.document': 'https://ssl.gstatic.com/docs/doclist/images/drive_icon_docs_24.png',
    'application/vnd.google-apps.spreadsheet': 'https://ssl.gstatic.com/docs/doclist/images/drive_icon_sheets_24.png',
    'application/vnd.google-apps.presentation': 'https://ssl.gstatic.com/docs/doclist/images/drive_icon_slides_24.png',
    'image/jpeg': 'https://ssl.gstatic.com/docs/doclist/images/icon_11_image_list.png',
    'image/png': 'https://ssl.gstatic.com/docs/doclist/images/icon_11_image_list.png',
    // それ以外はデフォルトのファイルアイコン
    'default': 'https://ssl.gstatic.com/docs/doclist/images/icon_11_generic_list.png'
};

// フォルダをクリックで展開/折り畳み
function toggleFolder(folderId, liElement) {
    const expanded = expandedFolders[folderId];
    if (expanded) {
        // 折り畳み
        const ul = liElement.querySelector('ul');
        if (ul) ul.style.display = 'none';
        expandedFolders[folderId] = false;
    } else {
        // 展開
        expandedFolders[folderId] = true;
        let ul = liElement.querySelector('ul');
        if (ul) {
            ul.style.display = 'block'; // 既にある場合は表示
        } else {
            ul = document.createElement('ul');
            liElement.appendChild(ul);
            listFiles(folderId, ul);
        }
    }
}

function listFiles(folderId, parentElement) {
    gapi.client.drive.files.list({
        'pageSize': 100,
        'fields': "files(id, name, mimeType)",
        'q': `'${folderId}' in parents and trashed = false`
    }).then(response => {
        const files = response.result.files;
        if (!files || files.length === 0) {
            const noFilesMsg = document.createElement('p');
            noFilesMsg.textContent = '(No files found)';
            parentElement.appendChild(noFilesMsg);
            return;
        }

        const ul = document.createElement('ul');
        parentElement.appendChild(ul);

        files.forEach(file => {
            const li = document.createElement('li');

            // アイコン取得（mimeTypeがなければdefault）
            const iconUrl = ICONS[file.mimeType] || ICONS['default'];
            const img = document.createElement('img');
            img.src = iconUrl;
            img.style.width = '16px';
            img.style.height = '16px';
            img.style.marginRight = '6px';
            img.style.verticalAlign = 'middle';

            // テキストスパン
            const span = document.createElement('span');
            span.textContent = file.name;

            li.appendChild(img);
            li.appendChild(span);
            ul.appendChild(li);

            // フォルダならクリックで展開/折り畳み可能に
            if (file.mimeType === 'application/vnd.google-apps.folder') {
                span.style.cursor = 'pointer';
                span.style.fontWeight = 'bold';
                span.onclick = () => toggleFolder(file.id, li);
            }
        });
    }).catch(err => {
        console.error('Error listing files:', err);
        parentElement.innerHTML = `<p style="color:red;">Error listing files: ${err.message}</p>`;
    });
}
