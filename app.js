const CLIENT_ID = '1013571264807-3k2pvpcldetqatqil8i42onm8aphknvj.apps.googleusercontent.com';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';

let authorizeButton = document.getElementById('authorize_button');
let signoutButton = document.getElementById('signout_button');
let contentDiv = document.getElementById('content');

let tokenClient;

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
        listFiles('root', contentDiv, true);
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
