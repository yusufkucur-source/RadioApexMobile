import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import {
  Antonio_400Regular,
  Antonio_700Bold,
} from '@expo-google-fonts/antonio';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  collection,
  getFirestore,
  onSnapshot,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Linking,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import AplexLogoRed from './assets/AplexLogoRed.svg';
import TurntableLoop from './assets/turntable-loop.svg';

const STREAM_URL = 'https://radio.cast.click/radio/8000/radio.mp3';
const NOW_PLAYING_URL = 'https://radio.cast.click/api/nowplaying/radioapex';
const DEFAULT_ARTWORK_URL = 'https://radioapex.com.tr/android-chrome-512x512.png';
const MENU_ANIMATION_DURATION = 340;

type SongHistoryItem = {
  title: string;
  artist: string;
};

type NowPlaying = {
  title: string;
  artist: string;
  isLive: boolean;
  listeners: number;
  coverArt: string | null;
  songHistory: SongHistoryItem[];
};

type AzuraCastSong = {
  text?: string;
  artist?: string;
  title?: string;
  art?: string;
};

type AzuraCastResponse = {
  now_playing?: {
    song?: AzuraCastSong;
  };
  listeners?: number | { total?: number; current?: number };
  live?: {
    is_live?: boolean;
  };
  song_history?: Array<{
    song?: AzuraCastSong;
  }>;
};

type DJProfile = {
  id: string;
  nickname: string;
  fullName: string;
  city: string;
  photoUrl: string;
  description?: string;
  socials?: {
    instagram?: string;
    soundcloud?: string;
    mixcloud?: string;
  };
};

type LineupSlot = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  genre: string;
  title: string;
  djId?: string;
};

type AppScreen = 'home' | 'djs' | 'lineup' | 'about' | 'contact';

const defaultNowPlaying: NowPlaying = {
  title: 'Radio Apex Live',
  artist: 'RADIO APEX',
  isLive: true,
  listeners: 0,
  coverArt: null,
  songHistory: [],
};

const soundwaveBars = [
  { delay: 0, duration: 650 },
  { delay: 100, duration: 780 },
  { delay: 180, duration: 560 },
  { delay: 260, duration: 860 },
  { delay: 340, duration: 690 },
  { delay: 140, duration: 730 },
  { delay: 240, duration: 610 },
];

const particles = [
  { left: 12, top: 18, size: 3, color: '#fd1d35', delay: 0 },
  { left: 78, top: 16, size: 2, color: '#ffffff', delay: 180 },
  { left: 88, top: 36, size: 3, color: '#fd1d35', delay: 320 },
  { left: 9, top: 49, size: 2, color: '#ffffff', delay: 440 },
  { left: 24, top: 78, size: 3, color: '#fd1d35', delay: 560 },
  { left: 74, top: 73, size: 2, color: '#ffffff', delay: 680 },
  { left: 53, top: 23, size: 2, color: '#ffffff', delay: 820 },
  { left: 42, top: 86, size: 3, color: '#fd1d35', delay: 960 },
];

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/radioapextr',
    icon: InstagramIcon,
  },
  {
    label: 'Twitter',
    href: 'https://x.com/radioapextr',
    icon: XIcon,
  },
  {
    label: 'SoundCloud',
    href: 'https://soundcloud.com/yunusozyavuz',
    icon: MusicIcon,
  },
];

const menuItems = ['Home', 'DJs', 'LINE UP', 'About', 'Contact'];

function getScreenForMenuItem(item: string): AppScreen | null {
  switch (item) {
    case 'Home':
      return 'home';
    case 'DJs':
      return 'djs';
    case 'LINE UP':
      return 'lineup';
    case 'About':
      return 'about';
    case 'Contact':
      return 'contact';
    default:
      return null;
  }
}

const fallbackDjs: DJProfile[] = [
  {
    id: 'sample-aurora',
    nickname: 'Aurora',
    fullName: 'Apex Resident',
    city: 'Istanbul',
    photoUrl: '',
    description:
      'Organic house and analog synth textures shaped for late-night Radio Apex sessions.',
  },
  {
    id: 'sample-orbit',
    nickname: 'Orbit',
    fullName: 'Apex Resident',
    city: 'Izmir',
    photoUrl: '',
    description:
      'Minimal techno and broken rhythms built around a clean, forward club sound.',
  },
  {
    id: 'sample-lumen',
    nickname: 'Lumen',
    fullName: 'Apex Resident',
    city: 'Berlin',
    photoUrl: '',
    description:
      'Dark disco, synth wave details, and atmospheric transitions for deeper hours.',
  },
];

const fallbackLineup: LineupSlot[] = [
  {
    id: 'slot-01',
    day: 'Monday',
    startTime: '20:00',
    endTime: '22:00',
    genre: 'Organic House',
    title: 'Moonlit Frequencies',
    djId: 'sample-aurora',
  },
  {
    id: 'slot-02',
    day: 'Wednesday',
    startTime: '22:00',
    endTime: '00:00',
    genre: 'Minimal Techno',
    title: 'Orbital Sequences',
    djId: 'sample-orbit',
  },
  {
    id: 'slot-03',
    day: 'Friday',
    startTime: '23:00',
    endTime: '01:00',
    genre: 'Dark Disco',
    title: 'Neon Echoes',
    djId: 'sample-lumen',
  },
];

const aboutParagraphs = [
  'Radio Apex is an independent and innovative sonic platform crafted for deep listeners, curious minds, and nocturnal dreamers. Exploring the outer edges of sound and emotion, Radio Apex broadcasts 24/7, blending the evolving textures of deep house, tech house, and techno into a continuously developing experience.',
  "More than a conventional radio station, Apex is a living field of experimentation where the boundaries between genres, moods, and frequencies delightfully blur. Every DJ set, DJ mix, and live transmission is a journey: sometimes meditative, sometimes energetic, but always spirited and full of discovery.",
  'This is not just a broadcast; it is a living space for deep listeners, curious minds, and nocturnal dreamers.',
];

const aboutHighlights = [
  { label: 'Signal', value: '24/7' },
  { label: 'Focus', value: 'Deep sound' },
  { label: 'Flow', value: 'Night driven' },
];

const contactActions = [
  {
    eyebrow: 'E-MAIL ADDRESS',
    title: 'organizasyon@melankolia.com.tr',
    description: 'For collaborations, events, and broadcast support, reach the Radio Apex team by e-mail.',
    href: 'mailto:organizasyon@melankolia.com.tr',
  },
  {
    eyebrow: 'INSTAGRAM',
    title: '@radioapextr',
    description: 'Reach the station through Instagram for quick announcements and social updates.',
    href: 'https://instagram.com/radioapextr',
  },
  {
    eyebrow: 'SOUNDCLOUD',
    title: 'Radio Apex',
    description: 'Follow mixes, sets, and curated sound through the Radio Apex SoundCloud channel.',
    href: 'https://soundcloud.com/yunusozyavuz',
  },
];

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

function getFirestoreInstance(): Firestore | null {
  if (firestoreDb) {
    return firestoreDb;
  }

  if (!hasFirebaseConfig()) {
    return null;
  }

  firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  firestoreDb = getFirestore(firebaseApp);
  return firestoreDb;
}

function normalizeSong(song?: AzuraCastSong): SongHistoryItem {
  const text = song?.text || [song?.artist, song?.title].filter(Boolean).join(' - ');
  const [fallbackArtist = '', fallbackTitle = ''] = text.split(' - ');

  return {
    title: (song?.title || fallbackTitle || text || 'Radio Apex Live').trim(),
    artist: (song?.artist || fallbackArtist || 'Radio Apex').trim(),
  };
}

function parseNowPlaying(data: AzuraCastResponse): NowPlaying {
  const current = normalizeSong(data.now_playing?.song);
  const listeners = data.listeners;
  const listenerCount =
    typeof listeners === 'number'
      ? listeners
      : listeners?.total ?? listeners?.current ?? 0;

  return {
    title: current.title,
    artist: current.artist,
    isLive: Boolean(data.live?.is_live),
    listeners: listenerCount,
    coverArt: data.now_playing?.song?.art || null,
    songHistory:
      data.song_history?.slice(0, 4).map((item) => normalizeSong(item.song)) ?? [],
  };
}

async function fetchNowPlaying(): Promise<NowPlaying> {
  try {
    const response = await fetch(NOW_PLAYING_URL);

    if (!response.ok) {
      throw new Error(`Now playing request failed: ${response.status}`);
    }

    return parseNowPlaying((await response.json()) as AzuraCastResponse);
  } catch (error) {
    console.warn('Now playing data could not be loaded.', error);
    return defaultNowPlaying;
  }
}

function transformDjDoc(doc: DocumentData): DJProfile {
  return {
    id: doc.id,
    nickname: doc.nickname ?? 'Yeni DJ',
    fullName: doc.fullName ?? '',
    city: doc.city ?? '',
    photoUrl: doc.photoUrl ?? '',
    description: doc.description ?? '',
    socials: doc.socials ?? {},
  };
}

function transformLineupDoc(doc: DocumentData): LineupSlot {
  return {
    id: doc.id,
    day: doc.day ?? '',
    startTime: doc.startTime ?? '',
    endTime: doc.endTime ?? '',
    genre: doc.genre ?? '',
    title: doc.title ?? '',
    djId: doc.djId ?? '',
  };
}

function sortDjsAlphabetically(djs: DJProfile[]) {
  return [...djs].sort((a, b) =>
    (a.nickname || a.fullName).localeCompare(b.nickname || b.fullName, 'tr', {
      sensitivity: 'base',
    })
  );
}

const dayOrder: Record<string, number> = {
  monday: 1,
  pazartesi: 1,
  tuesday: 2,
  sali: 2,
  salı: 2,
  wednesday: 3,
  carsamba: 3,
  çarşamba: 3,
  thursday: 4,
  persembe: 4,
  perşembe: 4,
  friday: 5,
  cuma: 5,
  saturday: 6,
  cumartesi: 6,
  sunday: 7,
  pazar: 7,
};

function getDayOrder(day: string) {
  return dayOrder[day.trim().toLowerCase()] ?? 999;
}

function timeToSortMinutes(time: string) {
  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 9999;
  }

  const total = hours * 60 + minutes;
  return hours < 6 ? total + 24 * 60 : total;
}

function sortLineupByDayAndTime(lineup: LineupSlot[]) {
  return [...lineup].sort((a, b) => {
    const dayDiff = getDayOrder(a.day) - getDayOrder(b.day);
    if (dayDiff !== 0) {
      return dayDiff;
    }

    return timeToSortMinutes(a.startTime) - timeToSortMinutes(b.startTime);
  });
}

function useDjs() {
  const [djs, setDjs] = useState(sortDjsAlphabetically(fallbackDjs));
  const [isDjsLoading, setIsDjsLoading] = useState(true);

  useEffect(() => {
    const db = getFirestoreInstance();

    if (!db) {
      setIsDjsLoading(false);
      return;
    }

    const fallbackTimer = setTimeout(() => {
      setDjs(sortDjsAlphabetically(fallbackDjs));
      setIsDjsLoading(false);
    }, 6000);

    const unsubscribe = onSnapshot(
      collection(db, 'djs'),
      (snapshot) => {
        clearTimeout(fallbackTimer);
        if (snapshot.docs.length === 0) {
          setDjs(sortDjsAlphabetically(fallbackDjs));
          setIsDjsLoading(false);
          return;
        }

        setDjs(
          sortDjsAlphabetically(
            snapshot.docs.map((item) => transformDjDoc({ id: item.id, ...item.data() }))
          )
        );
        setIsDjsLoading(false);
      },
      (error) => {
        clearTimeout(fallbackTimer);
        console.warn('Failed to load DJs.', error);
        setDjs(sortDjsAlphabetically(fallbackDjs));
        setIsDjsLoading(false);
      }
    );

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  return { djs, isDjsLoading };
}

function useLineup() {
  const [lineup, setLineup] = useState(sortLineupByDayAndTime(fallbackLineup));
  const [isLineupLoading, setIsLineupLoading] = useState(true);

  useEffect(() => {
    const db = getFirestoreInstance();

    if (!db) {
      setIsLineupLoading(false);
      return;
    }

    const fallbackTimer = setTimeout(() => {
      setLineup(sortLineupByDayAndTime(fallbackLineup));
      setIsLineupLoading(false);
    }, 6000);

    const unsubscribe = onSnapshot(
      collection(db, 'lineup'),
      (snapshot) => {
        clearTimeout(fallbackTimer);
        if (snapshot.docs.length === 0) {
          setLineup(sortLineupByDayAndTime(fallbackLineup));
          setIsLineupLoading(false);
          return;
        }

        setLineup(
          sortLineupByDayAndTime(
            snapshot.docs.map((item) =>
              transformLineupDoc({ id: item.id, ...item.data() })
            )
          )
        );
        setIsLineupLoading(false);
      },
      (error) => {
        clearTimeout(fallbackTimer);
        console.warn('Failed to load lineup.', error);
        setLineup(sortLineupByDayAndTime(fallbackLineup));
        setIsLineupLoading(false);
      }
    );

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  return { lineup, isLineupLoading };
}

export default function App() {
  const player = useAudioPlayer(STREAM_URL, {
    updateInterval: 500,
    preferredForwardBufferDuration: 20,
  });
  const playerStatus = useAudioPlayerStatus(player);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    Antonio_400Regular,
    Antonio_700Bold,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });
  const [nowPlaying, setNowPlaying] = useState(defaultNowPlaying);
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [activeScreen, setActiveScreen] = useState<AppScreen>('home');
  const { djs, isDjsLoading } = useDjs();
  const { lineup, isLineupLoading } = useLineup();

  const pulseRing = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const turntableRotation = useRef(new Animated.Value(0)).current;
  const menuProgress = useRef(new Animated.Value(0)).current;
  const screenProgress = useRef(new Animated.Value(1)).current;
  const menuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particleAnimations = useRef(particles.map(() => new Animated.Value(0))).current;
  const waveAnimations = useRef(soundwaveBars.map(() => new Animated.Value(0))).current;

  const isPlaying = playerStatus.playing;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const previousHtmlOverflowX = document.documentElement.style.overflowX;
    const previousBodyOverflowX = document.body.style.overflowX;

    const resetHorizontalScroll = () => {
      window.scrollTo(0, window.scrollY);
      document.querySelectorAll('*').forEach((element) => {
        if (element instanceof HTMLElement && element.scrollLeft !== 0) {
          element.scrollLeft = 0;
        }
      });
    };

    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    resetHorizontalScroll();
    document.addEventListener('scroll', resetHorizontalScroll, true);

    return () => {
      document.removeEventListener('scroll', resetHorizontalScroll, true);
      document.documentElement.style.overflowX = previousHtmlOverflowX;
      document.body.style.overflowX = previousBodyOverflowX;
    };
  }, []);

  const refreshNowPlaying = useCallback(async () => {
    const payload = await fetchNowPlaying();
    setNowPlaying(payload);
    setIsMetadataLoading(false);
  }, []);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    });
  }, []);

  useEffect(() => {
    void refreshNowPlaying();
    const timer = setInterval(() => {
      void refreshNowPlaying();
    }, 15000);

    return () => {
      clearInterval(timer);
    };
  }, [refreshNowPlaying]);

  useEffect(() => {
    const metadata = {
      title: nowPlaying.title || 'Radio Apex Live',
      artist: nowPlaying.artist || 'RADIO APEX',
      albumTitle: 'Radio Apex',
      artworkUrl:
        nowPlaying.coverArt && !nowPlaying.coverArt.includes('generic_song')
          ? nowPlaying.coverArt
          : DEFAULT_ARTWORK_URL,
    };

    if (isPlaying) {
      player.setActiveForLockScreen(true, metadata, {
        isLiveStream: true,
        showSeekBackward: false,
        showSeekForward: false,
      });
    } else {
      player.clearLockScreenControls();
    }
  }, [isPlaying, nowPlaying.artist, nowPlaying.coverArt, nowPlaying.title, player]);

  useEffect(() => {
    pulseRing.stopAnimation();
    pulseRing.setValue(0);

    if (activeScreen !== 'home') {
      return;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRing, {
          toValue: 1,
          duration: 2500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseRing, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [activeScreen, pulseRing]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(turntableRotation, {
        toValue: 1,
        duration: 48000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    particleAnimations.forEach((value, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(particles[index].delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 4200 + index * 280,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 4200 + index * 280,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, [glowPulse, particleAnimations, turntableRotation]);

  useEffect(() => {
    if (!isPlaying) {
      waveAnimations.forEach((value) => value.setValue(0));
      return;
    }

    const animations = waveAnimations.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(soundwaveBars[index].delay),
          Animated.timing(value, {
            toValue: 1,
            duration: soundwaveBars[index].duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: soundwaveBars[index].duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ])
      )
    );

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [isPlaying, waveAnimations]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      player.pause();
      return;
    }

    player.play();
  }, [isPlaying, player]);

  const openExternalUrl = useCallback((url: string) => {
    void Linking.openURL(url);
  }, []);

  const openMenu = useCallback(() => {
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current);
      menuCloseTimer.current = null;
    }

    setIsMenuVisible(true);
    menuProgress.stopAnimation();
    requestAnimationFrame(() => {
      Animated.timing(menuProgress, {
        toValue: 1,
        duration: MENU_ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [menuProgress]);

  const closeMenu = useCallback(() => {
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current);
    }

    menuProgress.stopAnimation();
    Animated.timing(menuProgress, {
      toValue: 0,
      duration: MENU_ANIMATION_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();

    menuCloseTimer.current = setTimeout(() => {
      setIsMenuVisible(false);
      menuCloseTimer.current = null;
    }, MENU_ANIMATION_DURATION + 20);
  }, [menuProgress]);

  useEffect(
    () => () => {
      if (menuCloseTimer.current) {
        clearTimeout(menuCloseTimer.current);
      }
    },
    []
  );

  const handleMenuItemPress = useCallback(
    (item: string) => {
      const nextScreen = getScreenForMenuItem(item);

      closeMenu();

      if (!nextScreen || nextScreen === activeScreen) {
        return;
      }

      setActiveScreen(nextScreen);
      screenProgress.stopAnimation();
      screenProgress.setValue(0);
      Animated.timing(screenProgress, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [activeScreen, closeMenu, screenProgress]
  );

  const pulseScale = pulseRing.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.38],
  });
  const pulseOpacity = pulseRing.interpolate({
    inputRange: [0, 0.42, 1],
    outputRange: [0.9, 0.52, 0.08],
  });
  const glowScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.14],
  });
  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.34, 0.78],
  });
  const turntableSpin = turntableRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const liveFontSize = viewportWidth < 390 ? 9 : 10;
  const titleFontSize = viewportWidth < 390 ? 16 : viewportWidth < 600 ? 21 : 28;
  const artistFontSize = viewportWidth < 390 ? 12 : viewportWidth < 600 ? 14 : 16;
  const turntableHeight = Math.max(viewportHeight, viewportWidth) * 1.2;
  const turntableWidth = turntableHeight * (2532.53 / 2194.45);
  const drawerWidth = Math.min(304, viewportWidth * 0.78);
  const menuOpacity = menuProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const menuTranslateX = menuProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [drawerWidth, 0],
  });
  const screenTranslateY = screenProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });
  const screenScale = screenProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#fd1d35" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ImageBackground
        source={require('./assets/radioapex-background.png')}
        resizeMode="cover"
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
      <LinearGradient
        colors={['rgba(5,5,9,0.58)', 'rgba(5,5,9,0.42)', 'rgba(5,5,9,0.92)']}
        style={styles.overlay}
      >
        <View pointerEvents="none" style={styles.particles}>
          {particles.map((particle, index) => {
            const movement = particleAnimations[index];
            const translateX = movement.interpolate({
              inputRange: [0, 1],
              outputRange: [0, index % 2 === 0 ? 18 : -18],
            });
            const translateY = movement.interpolate({
              inputRange: [0, 1],
              outputRange: [0, index % 3 === 0 ? -24 : 22],
            });
            const opacity = movement.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.25, 0.95, 0.32],
            });

            return (
              <Animated.View
                key={`${particle.left}-${particle.top}`}
                style={[
                  styles.particle,
                  {
                    backgroundColor: particle.color,
                    height: particle.size,
                    left: `${particle.left}%` as `${number}%`,
                    opacity,
                    top: `${particle.top}%` as `${number}%`,
                    transform: [{ translateX }, { translateY }],
                    width: particle.size,
                  },
                ]}
              />
            );
          })}
        </View>

        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="light" />
          <View style={styles.content}>
            <LinearGradient
              pointerEvents="none"
              colors={[
                'rgba(5,5,9,0.94)',
                'rgba(5,5,9,0.78)',
                'rgba(5,5,9,0.28)',
                'rgba(5,5,9,0)',
              ]}
              locations={[0, 0.48, 0.78, 1]}
              style={styles.headerGlass}
            />

            <View style={styles.header}>
              <AplexLogoRed width={126} height={54} />
            </View>

            <Pressable
              accessibilityLabel="Menuyu ac"
              accessibilityRole="button"
              onPress={openMenu}
              style={({ pressed }) => [
                styles.menuButton,
                pressed && styles.menuButtonPressed,
              ]}
            >
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </Pressable>

            <Animated.View
              style={[
                styles.screenStage,
                {
                  opacity: screenProgress,
                  transform: [{ translateY: screenTranslateY }, { scale: screenScale }],
                },
              ]}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.fullscreenTurntable,
                  {
                    height: turntableHeight,
                    marginLeft: -turntableWidth / 2,
                    marginTop: -turntableHeight / 2,
                    transform: [{ rotate: turntableSpin }],
                    width: turntableWidth,
                  },
                ]}
              >
                <TurntableLoop height={turntableHeight} width={turntableWidth} />
              </Animated.View>

              {activeScreen === 'home' ? (
                <HomeScreen
                  artistFontSize={artistFontSize}
                  glowOpacity={glowOpacity}
                  glowScale={glowScale}
                  isMetadataLoading={isMetadataLoading}
                  isPlaying={isPlaying}
                  liveFontSize={liveFontSize}
                  nowPlaying={nowPlaying}
                  playerStatus={playerStatus}
                  pulseOpacity={pulseOpacity}
                  pulseScale={pulseScale}
                  titleFontSize={titleFontSize}
                  togglePlayback={togglePlayback}
                  waveAnimations={waveAnimations}
                  openExternalUrl={openExternalUrl}
                />
              ) : activeScreen === 'djs' ? (
                <DjsScreen
                  djs={djs}
                  isLoading={isDjsLoading}
                  openExternalUrl={openExternalUrl}
                />
              ) : activeScreen === 'lineup' ? (
                <LineupScreen
                  djs={djs}
                  isLoading={isLineupLoading}
                  lineup={lineup}
                />
              ) : activeScreen === 'about' ? (
                <AboutScreen />
              ) : (
                <ContactScreen openExternalUrl={openExternalUrl} />
              )}
            </Animated.View>

            {isMenuVisible ? (
              <View style={styles.menuLayer}>
                <Animated.View style={[styles.menuScrim, { opacity: menuOpacity }]}>
                  <Pressable
                    accessibilityLabel="Menu disina dokunarak kapat"
                    onPress={closeMenu}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.menuDrawer,
                    {
                      transform: [{ translateX: menuTranslateX }],
                      width: drawerWidth,
                    },
                  ]}
                >
                  <View style={styles.menuHeader}>
                    <Text style={styles.menuTitle}>MENU</Text>
                    <Pressable
                      accessibilityLabel="Menuyu kapat"
                      accessibilityRole="button"
                      onPress={closeMenu}
                      style={({ pressed }) => [
                        styles.menuCloseButton,
                        pressed && styles.menuCloseButtonPressed,
                      ]}
                    >
                      <CloseIcon color="rgba(255,255,255,0.72)" size={18} strokeWidth={2} />
                    </Pressable>
                  </View>

                  <View style={styles.menuList}>
                    {menuItems.map((item) => {
                      const isActive = getScreenForMenuItem(item) === activeScreen;

                      return (
                        <Pressable
                          key={item}
                          accessibilityLabel={item}
                          accessibilityRole="button"
                          onPress={() => handleMenuItemPress(item)}
                          style={({ pressed }) => [
                            styles.menuItem,
                            isActive && styles.menuItemActive,
                            pressed && styles.menuItemPressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.menuItemText,
                              isActive && styles.menuItemTextActive,
                            ]}
                          >
                            {item}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.menuFooter}>RADIO APEX</Text>
                </Animated.View>
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </LinearGradient>
      </ImageBackground>
    </SafeAreaProvider>
  );
}

type HomeScreenProps = {
  artistFontSize: number;
  glowOpacity: Animated.AnimatedInterpolation<number>;
  glowScale: Animated.AnimatedInterpolation<number>;
  isMetadataLoading: boolean;
  isPlaying: boolean;
  liveFontSize: number;
  nowPlaying: NowPlaying;
  openExternalUrl: (url: string) => void;
  playerStatus: ReturnType<typeof useAudioPlayerStatus>;
  pulseOpacity: Animated.AnimatedInterpolation<number>;
  pulseScale: Animated.AnimatedInterpolation<number>;
  titleFontSize: number;
  togglePlayback: () => void;
  waveAnimations: Animated.Value[];
};

function HomeScreen({
  artistFontSize,
  glowOpacity,
  glowScale,
  isMetadataLoading,
  isPlaying,
  liveFontSize,
  nowPlaying,
  openExternalUrl,
  playerStatus,
  pulseOpacity,
  pulseScale,
  titleFontSize,
  togglePlayback,
  waveAnimations,
}: HomeScreenProps) {
  return (
    <>
      <View style={styles.playerSection}>
        <View style={styles.trackBlock}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text
              style={[
                styles.livePillText,
                {
                  fontSize: liveFontSize,
                  letterSpacing: liveFontSize * 0.45,
                },
              ]}
            >
              LIVE
            </Text>
          </View>
          <View style={styles.trackTitleGlowWrap}>
            <Text
              style={[
                styles.trackTitle,
                {
                  fontSize: titleFontSize,
                  letterSpacing: titleFontSize * 0.1,
                  lineHeight: titleFontSize * 1.2,
                },
              ]}
              numberOfLines={2}
            >
              {isMetadataLoading ? 'Yayin yukleniyor' : nowPlaying.title}
            </Text>
          </View>
          <Text
            style={[
              styles.artistName,
              {
                fontSize: artistFontSize,
                letterSpacing: artistFontSize * 0.1,
                lineHeight: artistFontSize * 1.2,
              },
            ]}
            numberOfLines={1}
          >
            {nowPlaying.artist || 'RADIO APEX'}
          </Text>
        </View>

        <View style={styles.playerWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glowLayer,
              {
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulseRing,
              {
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Yayini durdur' : 'Yayini baslat'}
            onPress={togglePlayback}
            style={({ pressed }) => [
              styles.playButton,
              pressed && styles.playButtonPressed,
            ]}
          >
            {playerStatus.isBuffering ? (
              <View style={styles.transparentButtonFace}>
                <ActivityIndicator color="#ef4444" />
              </View>
            ) : isPlaying ? (
              <View style={styles.soundwave}>
                {waveAnimations.map((value, index) => {
                  const height = value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [28, 116],
                  });

                  return <Animated.View key={index} style={[styles.waveBar, { height }]} />;
                })}
              </View>
            ) : (
              <OriginalPlayButton />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.socialRow}>
        {socialLinks.map((social) => {
          const Icon = social.icon;

          return (
            <Pressable
              key={social.label}
              accessibilityLabel={social.label}
              accessibilityRole="link"
              onPress={() => openExternalUrl(social.href)}
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.socialButtonPressed,
              ]}
            >
              {({ pressed }) => (
                <Icon
                  color={pressed ? '#fd1d35' : 'rgba(255,255,255,0.60)'}
                  size={17}
                  strokeWidth={2}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

type DjsScreenProps = {
  djs: DJProfile[];
  isLoading: boolean;
  openExternalUrl: (url: string) => void;
};

function DjsScreen({ djs, isLoading, openExternalUrl }: DjsScreenProps) {
  const skeletonPulse = useRef(new Animated.Value(0)).current;
  const cardLayouts = useRef<Record<string, number>>({});
  const scrollYRef = useRef(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [revealedDjIds, setRevealedDjIds] = useState<Set<string>>(() => new Set());
  const djIds = djs.map((dj) => dj.id).join('|');

  useEffect(() => {
    if (!isLoading) {
      skeletonPulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [isLoading, skeletonPulse]);

  const skeletonOpacity = skeletonPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.36, 0.72],
  });

  const revealVisibleCards = useCallback(
    (scrollY: number, visibleHeight = viewportHeight) => {
      if (isLoading) {
        return;
      }

      const effectiveViewportHeight = visibleHeight || 700;
      const revealEdge = scrollY + effectiveViewportHeight * 0.88;
      const visibleIds = djs
        .filter((dj) => {
          const layoutY = cardLayouts.current[dj.id];
          return typeof layoutY === 'number' && layoutY < revealEdge;
        })
        .map((dj) => dj.id);

      if (visibleIds.length === 0) {
        return;
      }

      setRevealedDjIds((current) => {
        let didChange = false;
        const next = new Set(current);

        visibleIds.forEach((id) => {
          if (!next.has(id)) {
            next.add(id);
            didChange = true;
          }
        });

        return didChange ? next : current;
      });
    },
    [djs, isLoading, viewportHeight]
  );

  useEffect(() => {
    cardLayouts.current = {};
    scrollYRef.current = 0;
  }, [djIds]);

  const handleScreenLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = event.nativeEvent.layout.height;
      setViewportHeight(nextHeight);
      revealVisibleCards(scrollYRef.current, nextHeight);
    },
    [revealVisibleCards]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextScrollY = event.nativeEvent.contentOffset.y;
      scrollYRef.current = nextScrollY;
      revealVisibleCards(nextScrollY);
    },
    [revealVisibleCards]
  );

  const handleCardLayout = useCallback(
    (id: string, event: LayoutChangeEvent) => {
      cardLayouts.current[id] = event.nativeEvent.layout.y;
      revealVisibleCards(scrollYRef.current);
    },
    [revealVisibleCards]
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.djsScreen}
      contentContainerStyle={styles.djsContent}
      onLayout={handleScreenLayout}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionEyebrow}>DJ LIST</Text>
        <Text style={styles.sectionTitle}>Meet the Artists Behind the Sound.</Text>
        <Text style={styles.sectionDescription}>
          The Radio Apex DJ List showcases the creative minds shaping our nightly flow.
        </Text>
      </View>

      {isLoading ? (
        <DjsSkeleton opacity={skeletonOpacity} />
      ) : (
        <View style={styles.djCards}>
          {djs.map((dj, index) => (
            <DjCard
              key={dj.id}
              dj={dj}
              isRevealed={revealedDjIds.has(dj.id)}
              openExternalUrl={openExternalUrl}
              revealIndex={index}
              onLayout={(event) => handleCardLayout(dj.id, event)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

type DjsSkeletonProps = {
  opacity: Animated.AnimatedInterpolation<number>;
};

function DjsSkeleton({ opacity }: DjsSkeletonProps) {
  return (
    <View style={styles.djCards}>
      {[0, 1].map((item) => (
        <View key={item} style={styles.djCard}>
          <Animated.View style={[styles.skeletonImage, { opacity }]} />
          <View style={styles.djBody}>
            <Animated.View style={[styles.skeletonName, { opacity }]} />
            <Animated.View style={[styles.skeletonTextWide, { opacity }]} />
            <Animated.View style={[styles.skeletonText, { opacity }]} />
            <View style={styles.djSocials}>
              <Animated.View style={[styles.skeletonChip, { opacity }]} />
              <Animated.View style={[styles.skeletonChip, { opacity }]} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

type DjCardProps = {
  dj: DJProfile;
  isRevealed: boolean;
  openExternalUrl: (url: string) => void;
  revealIndex: number;
  onLayout: (event: LayoutChangeEvent) => void;
};

function DjCard({ dj, isRevealed, openExternalUrl, revealIndex, onLayout }: DjCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fullDescriptionHeight, setFullDescriptionHeight] = useState(0);
  const revealProgress = useRef(new Animated.Value(isRevealed ? 1 : 0)).current;
  const descriptionProgress = useRef(new Animated.Value(0)).current;
  const socialEntries = Object.entries(dj.socials ?? {}).filter(([, href]) =>
    Boolean(href)
  );
  const initials = toInitials(dj.nickname || dj.fullName);
  const description =
    dj.description ||
    'Ses frekanslarini Apex estetikleriyle birlestiren ozel performans.';
  const shouldShowReadMore = description.length > 180;
  const collapsedDescriptionHeight = 110;
  const expandedDescriptionHeight = Math.max(
    collapsedDescriptionHeight,
    fullDescriptionHeight
  );

  useEffect(() => {
    if (!isRevealed) {
      return;
    }

    Animated.timing(revealProgress, {
      toValue: 1,
      duration: 520,
      delay: Math.min(revealIndex * 65, 220),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isRevealed, revealIndex, revealProgress]);

  const translateY = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });

  const scale = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
  });

  const descriptionHeight = descriptionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedDescriptionHeight, expandedDescriptionHeight],
  });

  const handleReadMorePress = useCallback(() => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);

    Animated.timing(descriptionProgress, {
      toValue: nextExpanded ? 1 : 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [descriptionProgress, isExpanded]);

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.djCard,
        {
          opacity: revealProgress,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={styles.djImageWrap}>
        {dj.photoUrl ? (
          <Image source={{ uri: dj.photoUrl }} resizeMode="cover" style={styles.djImage} />
        ) : (
          <View style={styles.djInitialsWrap}>
            <Text style={styles.djInitials}>{initials}</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']}
          style={styles.djImageOverlay}
        />
        <View style={styles.djCityPill}>
          <View style={styles.liveDot} />
          <Text style={styles.djCityText}>{dj.city || 'Konum bilinmiyor'}</Text>
        </View>
      </View>

      <View style={styles.djBody}>
        <View>
          <Text style={styles.djName}>{dj.nickname}</Text>
          {dj.fullName ? <Text style={styles.djFullName}>{dj.fullName}</Text> : null}
        </View>

        {shouldShowReadMore ? (
          <View style={styles.djDescriptionArea}>
            <Text
              style={[styles.djDescription, styles.djDescriptionMeasure]}
              onLayout={(event) => {
                const nextHeight = Math.ceil(event.nativeEvent.layout.height);
                if (nextHeight > 0 && nextHeight !== fullDescriptionHeight) {
                  setFullDescriptionHeight(nextHeight);
                }
              }}
            >
              {description}
            </Text>
            <Animated.View style={[styles.djDescriptionClip, { height: descriptionHeight }]}>
              <Text style={styles.djDescription}>{description}</Text>
            </Animated.View>
          </View>
        ) : (
          <Text style={styles.djDescription}>{description}</Text>
        )}

        {shouldShowReadMore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isExpanded ? 'Aciklamayi kisalt' : 'Aciklamanin devamini oku'}
            onPress={handleReadMorePress}
            style={({ pressed }) => [
              styles.readMoreButton,
              pressed && styles.readMoreButtonPressed,
            ]}
          >
            <Text style={styles.readMoreText}>
              {isExpanded ? 'Show less' : 'Read more'}
            </Text>
          </Pressable>
        ) : null}

        {socialEntries.length > 0 ? (
          <View style={styles.djSocials}>
            {socialEntries.map(([key, href]) => (
              <Pressable
                key={key}
                onPress={() => openExternalUrl(String(href))}
                style={({ pressed }) => [
                  styles.djSocialButton,
                  pressed && styles.djSocialButtonPressed,
                ]}
              >
                <Text style={styles.djSocialText}>{getSocialLabel(key)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

type LineupScreenProps = {
  djs: DJProfile[];
  isLoading: boolean;
  lineup: LineupSlot[];
};

function LineupScreen({ djs, isLoading, lineup }: LineupScreenProps) {
  const skeletonPulse = useRef(new Animated.Value(0)).current;
  const cardLayouts = useRef<Record<string, number>>({});
  const scrollYRef = useRef(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [revealedSlotIds, setRevealedSlotIds] = useState<Set<string>>(() => new Set());
  const lineupIds = lineup.map((slot) => slot.id).join('|');
  const djMap = new Map(djs.map((dj) => [dj.id, dj]));

  useEffect(() => {
    if (!isLoading) {
      skeletonPulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [isLoading, skeletonPulse]);

  const skeletonOpacity = skeletonPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.36, 0.72],
  });

  const revealVisibleCards = useCallback(
    (scrollY: number, visibleHeight = viewportHeight) => {
      if (isLoading) {
        return;
      }

      const effectiveViewportHeight = visibleHeight || 700;
      const revealEdge = scrollY + effectiveViewportHeight * 0.9;
      const visibleIds = lineup
        .filter((slot) => {
          const layoutY = cardLayouts.current[slot.id];
          return typeof layoutY === 'number' && layoutY < revealEdge;
        })
        .map((slot) => slot.id);

      if (visibleIds.length === 0) {
        return;
      }

      setRevealedSlotIds((current) => {
        let didChange = false;
        const next = new Set(current);

        visibleIds.forEach((id) => {
          if (!next.has(id)) {
            next.add(id);
            didChange = true;
          }
        });

        return didChange ? next : current;
      });
    },
    [isLoading, lineup, viewportHeight]
  );

  useEffect(() => {
    cardLayouts.current = {};
    scrollYRef.current = 0;
  }, [lineupIds]);

  const handleScreenLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = event.nativeEvent.layout.height;
      setViewportHeight(nextHeight);
      revealVisibleCards(scrollYRef.current, nextHeight);
    },
    [revealVisibleCards]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextScrollY = event.nativeEvent.contentOffset.y;
      scrollYRef.current = nextScrollY;
      revealVisibleCards(nextScrollY);
    },
    [revealVisibleCards]
  );

  const handleCardLayout = useCallback(
    (id: string, event: LayoutChangeEvent) => {
      cardLayouts.current[id] = event.nativeEvent.layout.y;
      revealVisibleCards(scrollYRef.current);
    },
    [revealVisibleCards]
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.djsScreen}
      contentContainerStyle={styles.lineupContent}
      onLayout={handleScreenLayout}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionEyebrow}>WEEKLY STREAM</Text>
        <Text style={styles.sectionTitle}>Apex weekly stream</Text>
        <Text style={styles.sectionDescription}>
          Radio Apex keeps the pulse of electronic music alive with a seamless flow of
          sound through every hour of the day. After 8 PM, the energy rises.
        </Text>
      </View>

      {isLoading ? (
        <LineupSkeleton opacity={skeletonOpacity} />
      ) : (
        <View style={styles.lineupCards}>
          {lineup.map((slot, index) => (
            <LineupCard
              key={slot.id}
              dj={slot.djId ? djMap.get(slot.djId) : undefined}
              isRevealed={revealedSlotIds.has(slot.id)}
              onLayout={(event) => handleCardLayout(slot.id, event)}
              revealIndex={index}
              slot={slot}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

type LineupSkeletonProps = {
  opacity: Animated.AnimatedInterpolation<number>;
};

function LineupSkeleton({ opacity }: LineupSkeletonProps) {
  return (
    <View style={styles.lineupCards}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.lineupCard}>
          <View style={styles.lineupCardTop}>
            <Animated.View style={[styles.skeletonLineupDay, { opacity }]} />
            <Animated.View style={[styles.skeletonLineupTime, { opacity }]} />
          </View>
          <Animated.View style={[styles.skeletonLineupTitle, { opacity }]} />
          <Animated.View style={[styles.skeletonText, { opacity }]} />
          <View style={styles.lineupDjRow}>
            <Animated.View style={[styles.skeletonLineupAvatar, { opacity }]} />
            <View style={styles.lineupDjTextBlock}>
              <Animated.View style={[styles.skeletonName, { opacity }]} />
              <Animated.View style={[styles.skeletonText, { opacity }]} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

type LineupCardProps = {
  dj?: DJProfile;
  isRevealed: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
  revealIndex: number;
  slot: LineupSlot;
};

function LineupCard({ dj, isRevealed, onLayout, revealIndex, slot }: LineupCardProps) {
  const revealProgress = useRef(new Animated.Value(isRevealed ? 1 : 0)).current;
  const initials = toInitials(dj?.nickname || dj?.fullName);
  const displayTitle = slot.title || (dj?.nickname ? `${dj.nickname} Session` : 'Radio Apex Session');

  useEffect(() => {
    if (!isRevealed) {
      return;
    }

    Animated.timing(revealProgress, {
      toValue: 1,
      duration: 520,
      delay: Math.min(revealIndex * 60, 220),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isRevealed, revealIndex, revealProgress]);

  const translateY = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [26, 0],
  });

  const scale = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.986, 1],
  });

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.lineupCard,
        {
          opacity: revealProgress,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={styles.lineupCardTop}>
        <View style={styles.lineupDayGroup}>
          <View style={styles.liveDot} />
          <Text style={styles.lineupDay}>{slot.day || 'TBA'}</Text>
        </View>
        <View style={styles.lineupTimePill}>
          <Text style={styles.lineupTimeText}>{slot.startTime || '--:--'}</Text>
          <View style={styles.timeDot} />
          <Text style={styles.lineupTimeText}>{slot.endTime || '--:--'}</Text>
        </View>
      </View>

      <View style={styles.lineupTitleBlock}>
        <Text style={styles.lineupTitle}>{displayTitle}</Text>
        <Text style={styles.lineupGenre}>{slot.genre || 'Radio Apex Session'}</Text>
      </View>

      <View style={styles.lineupDjRow}>
        <View style={styles.lineupAvatar}>
          {dj?.photoUrl ? (
            <Image source={{ uri: dj.photoUrl }} resizeMode="cover" style={styles.lineupAvatarImage} />
          ) : (
            <Text style={styles.lineupAvatarText}>{initials}</Text>
          )}
        </View>
        <View style={styles.lineupDjTextBlock}>
          <Text style={styles.lineupDjName}>{dj?.nickname || 'No DJ assigned'}</Text>
          <Text style={styles.lineupDjMeta}>
            {dj ? dj.city || dj.fullName || 'Radio Apex' : 'RADIO APEX'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function AboutScreen() {
  const cardLayouts = useRef<Record<string, number>>({});
  const scrollYRef = useRef(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());
  const aboutItems = [
    ...aboutParagraphs.map((_, index) => `paragraph-${index}`),
    ...aboutHighlights.map((_, index) => `highlight-${index}`),
  ];

  const revealVisibleCards = useCallback(
    (scrollY: number, visibleHeight = viewportHeight) => {
      const effectiveViewportHeight = visibleHeight || 700;
      const revealEdge = scrollY + effectiveViewportHeight * 0.9;
      const visibleIds = aboutItems.filter((id) => {
        const layoutY = cardLayouts.current[id];
        return typeof layoutY === 'number' && layoutY < revealEdge;
      });

      if (visibleIds.length === 0) {
        return;
      }

      setRevealedIds((current) => {
        let didChange = false;
        const next = new Set(current);

        visibleIds.forEach((id) => {
          if (!next.has(id)) {
            next.add(id);
            didChange = true;
          }
        });

        return didChange ? next : current;
      });
    },
    [aboutItems, viewportHeight]
  );

  const handleScreenLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = event.nativeEvent.layout.height;
      setViewportHeight(nextHeight);
      revealVisibleCards(scrollYRef.current, nextHeight);
    },
    [revealVisibleCards]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextScrollY = event.nativeEvent.contentOffset.y;
      scrollYRef.current = nextScrollY;
      revealVisibleCards(nextScrollY);
    },
    [revealVisibleCards]
  );

  const handleCardLayout = useCallback(
    (id: string, event: LayoutChangeEvent) => {
      cardLayouts.current[id] = event.nativeEvent.layout.y;
      revealVisibleCards(scrollYRef.current);
    },
    [revealVisibleCards]
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.djsScreen}
      contentContainerStyle={styles.aboutContent}
      onLayout={handleScreenLayout}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionEyebrow}>ABOUT US</Text>
        <Text style={styles.sectionTitle}>Radio Apex</Text>
        <Text style={styles.sectionDescription}>
          An independent sonic platform for deep listeners, curious minds, and
          nocturnal dreamers.
        </Text>
      </View>

      <View style={styles.aboutHeroCard}>
        <Text style={styles.aboutHeroKicker}>INDEPENDENT BROADCAST</Text>
        <Text style={styles.aboutHeroText}>
          A continuously developing experience shaped by deep house, tech house,
          techno, and late-night electronic culture.
        </Text>
      </View>

      <View style={styles.aboutHighlights}>
        {aboutHighlights.map((item, index) => {
          const id = `highlight-${index}`;
          return (
            <RevealBlock
              key={id}
              index={index}
              isRevealed={revealedIds.has(id)}
              onLayout={(event) => handleCardLayout(id, event)}
              style={styles.aboutHighlight}
            >
              <Text style={styles.aboutHighlightValue}>{item.value}</Text>
              <Text style={styles.aboutHighlightLabel}>{item.label}</Text>
            </RevealBlock>
          );
        })}
      </View>

      <View style={styles.aboutParagraphs}>
        {aboutParagraphs.map((text, index) => {
          const id = `paragraph-${index}`;
          return (
            <RevealBlock
              key={id}
              index={index + aboutHighlights.length}
              isRevealed={revealedIds.has(id)}
              onLayout={(event) => handleCardLayout(id, event)}
              style={styles.aboutParagraphCard}
            >
              <Text style={styles.aboutParagraphIndex}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={styles.aboutParagraphText}>{text}</Text>
            </RevealBlock>
          );
        })}
      </View>
    </ScrollView>
  );
}

type RevealBlockProps = {
  children: ReactNode;
  index: number;
  isRevealed: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
  style: StyleProp<ViewStyle>;
};

function RevealBlock({ children, index, isRevealed, onLayout, style }: RevealBlockProps) {
  const revealProgress = useRef(new Animated.Value(isRevealed ? 1 : 0)).current;

  useEffect(() => {
    if (!isRevealed) {
      return;
    }

    Animated.timing(revealProgress, {
      toValue: 1,
      duration: 520,
      delay: Math.min(index * 60, 220),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, isRevealed, revealProgress]);

  const translateY = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const scale = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.988, 1],
  });

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        style,
        {
          opacity: revealProgress,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

type ContactScreenProps = {
  openExternalUrl: (url: string) => void;
};

function ContactScreen({ openExternalUrl }: ContactScreenProps) {
  const cardLayouts = useRef<Record<string, number>>({});
  const scrollYRef = useRef(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());
  const contactIds = contactActions.map((_, index) => `contact-${index}`);

  const revealVisibleCards = useCallback(
    (scrollY: number, visibleHeight = viewportHeight) => {
      const effectiveViewportHeight = visibleHeight || 700;
      const revealEdge = scrollY + effectiveViewportHeight * 0.9;
      const visibleIds = contactIds.filter((id) => {
        const layoutY = cardLayouts.current[id];
        return typeof layoutY === 'number' && layoutY < revealEdge;
      });

      if (visibleIds.length === 0) {
        return;
      }

      setRevealedIds((current) => {
        let didChange = false;
        const next = new Set(current);

        visibleIds.forEach((id) => {
          if (!next.has(id)) {
            next.add(id);
            didChange = true;
          }
        });

        return didChange ? next : current;
      });
    },
    [contactIds, viewportHeight]
  );

  const handleScreenLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = event.nativeEvent.layout.height;
      setViewportHeight(nextHeight);
      revealVisibleCards(scrollYRef.current, nextHeight);
    },
    [revealVisibleCards]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextScrollY = event.nativeEvent.contentOffset.y;
      scrollYRef.current = nextScrollY;
      revealVisibleCards(nextScrollY);
    },
    [revealVisibleCards]
  );

  const handleCardLayout = useCallback(
    (id: string, event: LayoutChangeEvent) => {
      cardLayouts.current[id] = event.nativeEvent.layout.y;
      revealVisibleCards(scrollYRef.current);
    },
    [revealVisibleCards]
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.djsScreen}
      contentContainerStyle={styles.contactContent}
      onLayout={handleScreenLayout}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionEyebrow}>CONTACT</Text>
        <Text style={styles.sectionTitle}>Join the frequency</Text>
        <Text style={styles.sectionDescription}>
          Get in touch for event announcements, live broadcast support, or
          collaborations.
        </Text>
      </View>

      <View style={styles.contactIntroCard}>
        <Text style={styles.aboutHeroKicker}>RADIO APEX</Text>
        <Text style={styles.contactIntroText}>
          Choose the channel that fits your message and connect directly with the
          station.
        </Text>
      </View>

      <View style={styles.contactCards}>
        {contactActions.map((action, index) => {
          const id = `contact-${index}`;
          return (
            <RevealBlock
              key={id}
              index={index}
              isRevealed={revealedIds.has(id)}
              onLayout={(event) => handleCardLayout(id, event)}
              style={styles.contactCard}
            >
              <Pressable
                accessibilityLabel={action.title}
                accessibilityRole="button"
                onPress={() => openExternalUrl(action.href)}
                style={({ pressed }) => [
                  styles.contactCardPressable,
                  pressed && styles.contactCardPressed,
                ]}
              >
                <View style={styles.contactCardTop}>
                  <View style={styles.contactAccentDot} />
                  <Text style={styles.contactEyebrow}>{action.eyebrow}</Text>
                </View>
                <Text
                  style={[
                    styles.contactTitle,
                    action.eyebrow === 'E-MAIL ADDRESS' && styles.contactEmailTitle,
                  ]}
                >
                  {action.title}
                </Text>
                <Text style={styles.contactDescription}>{action.description}</Text>
                <Text style={styles.contactActionText}>OPEN</Text>
              </Pressable>
            </RevealBlock>
          );
        })}
      </View>
    </ScrollView>
  );
}

function toInitials(value?: string) {
  if (!value) {
    return 'DJ';
  }

  const segments = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '');

  return segments.join('') || value.slice(0, 2).toUpperCase() || 'DJ';
}

function getSocialLabel(key: string) {
  const labels: Record<string, string> = {
    instagram: 'Instagram',
    soundcloud: 'SoundCloud',
    mixcloud: 'Mixcloud',
  };

  return labels[key] ?? key;
}

function OriginalPlayButton() {
  return (
    <Svg width={211} height={211} viewBox="0 0 211 211" fill="none">
      <Path
        d="M105.5 193.417C154.055 193.417 193.416 154.055 193.416 105.5C193.416 56.945 154.055 17.5834 105.5 17.5834C56.9446 17.5834 17.583 56.945 17.583 105.5C17.583 154.055 56.9446 193.417 105.5 193.417Z"
        stroke="#FD1D35"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M87.9163 70.3334L140.666 105.5L87.9163 140.667V70.3334Z"
        stroke="#FD1D35"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type SocialIconProps = {
  color: string;
  size?: number;
  strokeWidth?: number;
};

function InstagramIcon({ color, size = 20, strokeWidth = 2 }: SocialIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={3}
        width={18}
        height={18}
        rx={5}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={17.2} cy={6.8} r={1.2} fill={color} />
    </Svg>
  );
}

function XIcon({ color, size = 20, strokeWidth = 2 }: SocialIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4L20 20M20 4L4 20"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CloseIcon({ color, size = 20, strokeWidth = 2 }: SocialIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6L18 18M18 6L6 18"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

function MusicIcon({ color, size = 20, strokeWidth = 2 }: SocialIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18V5l10-2v13"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={6} cy={18} r={3} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={16} cy={16} r={3} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: '#050509',
    flex: 1,
    justifyContent: 'center',
  },
  background: {
    flex: 1,
    backgroundColor: '#050509',
  },
  backgroundImage: {
    height: '100%',
    opacity: 0.95,
    width: '100%',
  },
  overlay: {
    flex: 1,
    overflow: 'hidden',
  },
  particles: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  particle: {
    borderRadius: 999,
    position: 'absolute',
    shadowColor: '#fd1d35',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  fullscreenTurntable: {
    alignItems: 'center',
    justifyContent: 'center',
    left: '50%',
    opacity: 0.1,
    position: 'absolute',
    top: '50%',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 18 : 0,
  },
  content: {
    flex: 1,
    position: 'relative',
    paddingBottom: 24,
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  headerGlass: {
    height: 130,
    left: -22,
    position: 'absolute',
    right: -22,
    top: -16,
    zIndex: 3,
  },
  screenStage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
  },
  header: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    left: 22,
    position: 'absolute',
    right: 86,
    top: 32,
    zIndex: 4,
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
    height: 42,
    justifyContent: 'center',
    position: 'absolute',
    right: 22,
    top: 36,
    width: 42,
    zIndex: 5,
  },
  menuButtonPressed: {
    backgroundColor: 'rgba(253,29,53,0.10)',
    borderColor: 'rgba(253,29,53,0.45)',
    transform: [{ scale: 0.96 }],
  },
  menuLine: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 999,
    height: 1.5,
    width: 17,
  },
  menuLayer: {
    bottom: -24,
    left: -22,
    position: 'absolute',
    right: -22,
    top: -16,
    zIndex: 20,
  },
  menuScrim: {
    backgroundColor: 'rgba(0,0,0,0.52)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  menuDrawer: {
    backgroundColor: 'rgba(8,8,14,0.96)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderLeftWidth: 1,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 52,
    position: 'absolute',
    right: 22,
    top: 0,
  },
  menuHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 34,
    width: '100%',
  },
  menuTitle: {
    color: 'rgba(255,255,255,0.48)',
    fontFamily: 'Antonio_400Regular',
    fontSize: 11,
    letterSpacing: 5,
  },
  menuCloseButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginRight: 0,
    width: 38,
  },
  menuCloseButtonPressed: {
    backgroundColor: 'rgba(253,29,53,0.10)',
    borderColor: 'rgba(253,29,53,0.45)',
  },
  menuList: {
    gap: 12,
  },
  menuItem: {
    borderBottomColor: 'rgba(255,255,255,0.09)',
    borderBottomWidth: 1,
    paddingVertical: 17,
  },
  menuItemActive: {
    borderBottomColor: 'rgba(253,29,53,0.55)',
  },
  menuItemPressed: {
    borderBottomColor: 'rgba(253,29,53,0.45)',
    transform: [{ translateX: 4 }],
  },
  menuItemText: {
    color: '#ffffff',
    fontFamily: 'Roboto_500Medium',
    fontSize: 15,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  menuItemTextActive: {
    color: '#fd1d35',
  },
  menuFooter: {
    bottom: 30,
    color: 'rgba(255,255,255,0.34)',
    fontFamily: 'Antonio_400Regular',
    fontSize: 10,
    left: 22,
    letterSpacing: 4,
    position: 'absolute',
    textTransform: 'uppercase',
  },
  livePill: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    marginBottom: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    backgroundColor: '#fd1d35',
    borderRadius: 999,
    height: 4,
    shadowColor: '#fd1d35',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    width: 4,
  },
  livePillText: {
    color: 'rgba(255,255,255,0.60)',
    fontFamily: 'Antonio_400Regular',
    textTransform: 'uppercase',
  },
  djsScreen: {
    flex: 1,
    zIndex: 2,
  },
  djsContent: {
    paddingBottom: 54,
    paddingHorizontal: 22,
    paddingTop: 168,
  },
  lineupContent: {
    paddingBottom: 54,
    paddingHorizontal: 22,
    paddingTop: 168,
  },
  aboutContent: {
    paddingBottom: 56,
    paddingHorizontal: 22,
    paddingTop: 168,
  },
  contactContent: {
    paddingBottom: 56,
    paddingHorizontal: 22,
    paddingTop: 168,
  },
  sectionHeading: {
    gap: 14,
    marginBottom: 34,
  },
  sectionEyebrow: {
    color: 'rgba(255,255,255,0.52)',
    fontFamily: 'Antonio_400Regular',
    fontSize: 11,
    letterSpacing: 4.5,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: '#fd1d35',
    fontFamily: 'Roboto_500Medium',
    fontSize: 28,
    letterSpacing: 0,
    lineHeight: 34,
    maxWidth: 330,
  },
  sectionDescription: {
    color: 'rgba(255,255,255,0.66)',
    fontFamily: 'Roboto_400Regular',
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 360,
  },
  djCards: {
    gap: 22,
  },
  lineupCards: {
    gap: 16,
  },
  aboutHeroCard: {
    backgroundColor: 'rgba(253,29,53,0.075)',
    borderColor: 'rgba(253,29,53,0.20)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    marginBottom: 16,
    padding: 22,
  },
  aboutHeroKicker: {
    color: 'rgba(255,255,255,0.54)',
    fontFamily: 'Antonio_400Regular',
    fontSize: 10,
    letterSpacing: 3.6,
    textTransform: 'uppercase',
  },
  aboutHeroText: {
    color: '#ffffff',
    fontFamily: 'Roboto_500Medium',
    fontSize: 19,
    lineHeight: 28,
  },
  aboutHighlights: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  aboutHighlight: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    minHeight: 86,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  aboutHighlightValue: {
    color: '#fd1d35',
    fontFamily: 'Roboto_500Medium',
    fontSize: 16,
    lineHeight: 20,
  },
  aboutHighlightLabel: {
    color: 'rgba(255,255,255,0.48)',
    fontFamily: 'Antonio_400Regular',
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  aboutParagraphs: {
    gap: 16,
  },
  aboutParagraphCard: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 20,
    shadowColor: '#050509',
    shadowOffset: { height: 22, width: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 34,
  },
  aboutParagraphIndex: {
    color: 'rgba(253,29,53,0.76)',
    fontFamily: 'Antonio_400Regular',
    fontSize: 11,
    letterSpacing: 3.6,
  },
  aboutParagraphText: {
    color: 'rgba(255,255,255,0.70)',
    fontFamily: 'Roboto_400Regular',
    fontSize: 14,
    lineHeight: 23,
  },
  contactIntroCard: {
    backgroundColor: 'rgba(253,29,53,0.075)',
    borderColor: 'rgba(253,29,53,0.20)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    marginBottom: 16,
    padding: 22,
  },
  contactIntroText: {
    color: '#ffffff',
    fontFamily: 'Roboto_500Medium',
    fontSize: 19,
    lineHeight: 28,
  },
  contactCards: {
    gap: 16,
  },
  contactCard: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#050509',
    shadowOffset: { height: 22, width: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 34,
  },
  contactCardPressable: {
    gap: 14,
    padding: 20,
  },
  contactCardPressed: {
    backgroundColor: 'rgba(253,29,53,0.08)',
  },
  contactCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  contactAccentDot: {
    backgroundColor: '#fd1d35',
    borderRadius: 999,
    height: 5,
    shadowColor: '#fd1d35',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    width: 5,
  },
  contactEyebrow: {
    color: 'rgba(255,255,255,0.48)',
    fontFamily: 'Antonio_400Regular',
    fontSize: 10,
    letterSpacing: 3.2,
    textTransform: 'uppercase',
  },
  contactTitle: {
    color: '#ffffff',
    fontFamily: 'Roboto_500Medium',
    fontSize: 22,
    lineHeight: 28,
  },
  contactEmailTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  contactDescription: {
    color: 'rgba(255,255,255,0.66)',
    fontFamily: 'Roboto_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  contactActionText: {
    alignSelf: 'flex-start',
    borderColor: 'rgba(253,29,53,0.45)',
    borderRadius: 999,
    borderWidth: 1,
    color: '#fd1d35',
    fontFamily: 'Antonio_400Regular',
    fontSize: 10,
    letterSpacing: 2.8,
    marginTop: 2,
    paddingHorizontal: 13,
    paddingVertical: 7,
    textTransform: 'uppercase',
  },
  lineupCard: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 20,
    shadowColor: '#050509',
    shadowOffset: { height: 24, width: 0 },
    shadowOpacity: 0.36,
    shadowRadius: 40,
  },
  lineupCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  lineupDayGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 9,
  },
  lineupDay: {
    color: 'rgba(255,255,255,0.58)',
    fontFamily: 'Antonio_400Regular',
    fontSize: 11,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
  },
  lineupTimePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lineupTimeText: {
    color: 'rgba(255,255,255,0.68)',
    fontFamily: 'Antonio_400Regular',
    fontSize: 11,
    letterSpacing: 2.8,
  },
  timeDot: {
    backgroundColor: 'rgba(255,255,255,0.30)',
    borderRadius: 999,
    height: 4,
    width: 4,
  },
  lineupTitleBlock: {
    gap: 9,
    marginTop: 26,
  },
  lineupTitle: {
    color: '#ffffff',
    fontFamily: 'Roboto_500Medium',
    fontSize: 23,
    lineHeight: 29,
  },
  lineupGenre: {
    color: 'rgba(253,29,53,0.82)',
    fontFamily: 'Antonio_400Regular',
    fontSize: 12,
    letterSpacing: 3.2,
    textTransform: 'uppercase',
  },
  lineupDjRow: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    padding: 10,
  },
  lineupAvatar: {
    alignItems: 'center',
    backgroundColor: 'rgba(253,29,53,0.10)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  lineupAvatarImage: {
    height: '100%',
    width: '100%',
  },
  lineupAvatarText: {
    color: 'rgba(255,255,255,0.54)',
    fontFamily: 'Roboto_700Bold',
    fontSize: 15,
    letterSpacing: 1.5,
  },
  lineupDjTextBlock: {
    flex: 1,
    gap: 4,
  },
  lineupDjName: {
    color: '#ffffff',
    fontFamily: 'Roboto_500Medium',
    fontSize: 15,
  },
  lineupDjMeta: {
    color: 'rgba(255,255,255,0.48)',
    fontFamily: 'Antonio_400Regular',
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  skeletonLineupDay: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    height: 14,
    width: 96,
  },
  skeletonLineupTime: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    height: 32,
    width: 128,
  },
  skeletonLineupTitle: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    height: 26,
    marginTop: 26,
    width: '72%',
  },
  skeletonLineupAvatar: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    height: 48,
    width: 48,
  },
  djCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 14,
    shadowColor: '#050509',
    shadowOffset: { height: 28, width: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 46,
  },
  djImageWrap: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    borderWidth: 1,
    height: 230,
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonImage: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    height: 230,
  },
  skeletonName: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    height: 24,
    width: '54%',
  },
  skeletonTextWide: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    height: 14,
    width: '92%',
  },
  skeletonText: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 999,
    height: 14,
    width: '70%',
  },
  skeletonChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    height: 28,
    width: 94,
  },
  djImage: {
    height: '100%',
    width: '100%',
  },
  djInitialsWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(253,29,53,0.12)',
    flex: 1,
    justifyContent: 'center',
  },
  djInitials: {
    color: 'rgba(255,255,255,0.42)',
    fontFamily: 'Roboto_700Bold',
    fontSize: 42,
    letterSpacing: 2,
  },
  djImageOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  djCityPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.60)',
    borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 999,
    borderWidth: 1,
    bottom: 14,
    flexDirection: 'row',
    gap: 8,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: 'absolute',
  },
  djCityText: {
    color: 'rgba(255,255,255,0.80)',
    fontFamily: 'Antonio_400Regular',
    fontSize: 10,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },
  djBody: {
    gap: 15,
    paddingHorizontal: 4,
    paddingTop: 20,
  },
  djName: {
    color: '#ffffff',
    fontFamily: 'Roboto_500Medium',
    fontSize: 24,
    lineHeight: 29,
  },
  djFullName: {
    color: 'rgba(255,255,255,0.58)',
    fontFamily: 'Roboto_400Regular',
    fontSize: 14,
    marginTop: 4,
  },
  djDescription: {
    color: 'rgba(255,255,255,0.68)',
    fontFamily: 'Roboto_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  djDescriptionArea: {
    position: 'relative',
  },
  djDescriptionClip: {
    overflow: 'hidden',
  },
  djDescriptionMeasure: {
    left: 0,
    opacity: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: -1,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    borderColor: 'rgba(253,29,53,0.45)',
    borderRadius: 999,
    borderWidth: 1,
    marginTop: -4,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  readMoreButtonPressed: {
    backgroundColor: 'rgba(253,29,53,0.10)',
    transform: [{ scale: 0.98 }],
  },
  readMoreText: {
    color: '#fd1d35',
    fontFamily: 'Antonio_400Regular',
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  djSocials: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 2,
  },
  djSocialButton: {
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  djSocialButtonPressed: {
    borderColor: 'rgba(253,29,53,0.80)',
    transform: [{ scale: 0.98 }],
  },
  djSocialText: {
    color: 'rgba(255,255,255,0.70)',
    fontFamily: 'Antonio_400Regular',
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  playerSection: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  trackBlock: {
    alignItems: 'center',
    bottom: '50%',
    marginBottom: 132,
    paddingHorizontal: 22,
    position: 'absolute',
    width: '100%',
  },
  trackTitleGlowWrap: {
    alignItems: 'center',
    marginVertical: -18,
    overflow: 'visible',
    paddingHorizontal: 36,
    paddingVertical: 18,
  },
  trackTitle: {
    color: '#fd1d35',
    fontFamily: 'Roboto_500Medium',
    maxWidth: 360,
    overflow: 'visible',
    textAlign: 'center',
    textShadowColor: 'rgba(253,29,53,0.85)',
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 22,
    textTransform: 'uppercase',
  },
  artistName: {
    color: '#ffffff',
    fontFamily: 'Roboto_400Regular',
    marginTop: 8,
    maxWidth: 280,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  playerWrap: {
    alignItems: 'center',
    height: 310,
    justifyContent: 'center',
    width: 310,
  },
  pulseRing: {
    borderColor: '#fd1d35',
    borderRadius: 999,
    borderWidth: 3,
    position: 'absolute',
    height: 236,
    width: 236,
    zIndex: 2,
  },
  glowLayer: {
    backgroundColor: 'rgba(253,29,53,0.30)',
    borderRadius: 999,
    height: 250,
    position: 'absolute',
    shadowColor: '#fd1d35',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 42,
    width: 250,
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 999,
    height: 212,
    justifyContent: 'center',
    width: 212,
    zIndex: 3,
  },
  playButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  transparentButtonFace: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: '#fd1d35',
    borderRadius: 999,
    borderWidth: 4,
    height: 178,
    justifyContent: 'center',
    shadowColor: '#fd1d35',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.82,
    shadowRadius: 22,
    width: 178,
  },
  soundwave: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 150,
    justifyContent: 'center',
    width: 190,
  },
  waveBar: {
    backgroundColor: '#fd1d35',
    borderRadius: 999,
    shadowColor: '#fd1d35',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.88,
    shadowRadius: 10,
    width: 8,
  },
  socialRow: {
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    left: 0,
    paddingBottom: 20,
    paddingHorizontal: 22,
    position: 'absolute',
    right: 0,
  },
  socialButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  socialButtonPressed: {
    backgroundColor: 'rgba(253,29,53,0.10)',
    borderColor: 'rgba(253,29,53,0.50)',
    transform: [{ scale: 1.08 }],
  },
});
