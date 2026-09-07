const crypto = require('node:crypto');
const { schedule } = require('@netlify/functions');
const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const AZURACAST_NOW_PLAYING_URL = 'https://radio.cast.click/api/nowplaying/radioapex';
const HISTORY_COLLECTION = 'recentTracks';
const STATE_COLLECTION = 'metadata';
const STATE_DOCUMENT = 'recentTracksState';
const MAX_HISTORY_ITEMS = 50;

function normalizeTrackText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
}

function getAdminDb() {
  if (getApps().length === 0) {
    const serviceAccount = parseServiceAccount();

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error(
        'Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
      );
    }

    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  return getFirestore();
}

function parseCurrentTrack(payload) {
  const song = payload?.now_playing?.song || {};
  const text = normalizeTrackText(song.text);
  const [fallbackArtist = '', ...fallbackTitleParts] = text.split(' - ');
  const fallbackTitle = fallbackTitleParts.join(' - ');
  const title = normalizeTrackText(song.title || fallbackTitle || text);
  const artist = normalizeTrackText(song.artist || fallbackArtist || 'Radio Apex');

  if (!title || title.toLowerCase() === 'unknown') {
    return null;
  }

  return {
    artist,
    coverArt: typeof song.art === 'string' ? song.art : null,
    playedAt:
      typeof payload?.now_playing?.played_at === 'number'
        ? payload.now_playing.played_at
        : Math.floor(Date.now() / 1000),
    title,
  };
}

function getTrackSignature(track) {
  return `${track.artist.toLowerCase()}::${track.title.toLowerCase()}`;
}

function createHistoryId(track) {
  const hash = crypto
    .createHash('sha1')
    .update(`${track.playedAt}:${getTrackSignature(track)}`)
    .digest('hex')
    .slice(0, 12);

  return `${track.playedAt}-${hash}`;
}

async function pruneHistory(db) {
  const snapshot = await db
    .collection(HISTORY_COLLECTION)
    .orderBy('playedAt', 'desc')
    .limit(MAX_HISTORY_ITEMS + 25)
    .get();

  const batch = db.batch();
  snapshot.docs.slice(MAX_HISTORY_ITEMS).forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

async function updateTrackHistory() {
  const response = await fetch(AZURACAST_NOW_PLAYING_URL);

  if (!response.ok) {
    throw new Error(`Now playing request failed: ${response.status}`);
  }

  const currentTrack = parseCurrentTrack(await response.json());

  if (!currentTrack) {
    return { skipped: true, reason: 'No valid current track' };
  }

  const db = getAdminDb();
  const stateRef = db.collection(STATE_COLLECTION).doc(STATE_DOCUMENT);
  const stateSnapshot = await stateRef.get();
  const signature = getTrackSignature(currentTrack);

  if (stateSnapshot.exists && stateSnapshot.data()?.lastSignature === signature) {
    return { skipped: true, reason: 'Track has not changed' };
  }

  const historyRef = db.collection(HISTORY_COLLECTION).doc(createHistoryId(currentTrack));
  const batch = db.batch();

  batch.set(historyRef, {
    ...currentTrack,
    signature,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    stateRef,
    {
      lastSignature: signature,
      lastTrack: currentTrack,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
  await pruneHistory(db);

  return { skipped: false, track: `${currentTrack.artist} - ${currentTrack.title}` };
}

exports.handler = schedule('* * * * *', async () => {
  try {
    const result = await updateTrackHistory();

    return {
      body: JSON.stringify(result),
      statusCode: 200,
    };
  } catch (error) {
    console.error('Failed to update track history.', error);

    return {
      body: JSON.stringify({ error: error.message }),
      statusCode: 500,
    };
  }
});
