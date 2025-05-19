import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROGRESS_DATA_KEY = 'progressData';
const START_DATE_KEY = 'chatStartDate';
const VOCABULARY_STORAGE_KEY = 'userVocabulary';
const TODAY_CHAT_TIME_KEY_PREFIX = 'todayChatTime_';


interface DailyStudyTime {
  date: string;
  minutes: number;
}

interface ProgressData {
  points: number;
  streak: number;
  wordCount: number;
  startDate: number | null;
  weeklyStudyTime: DailyStudyTime[];
}

const defaultProgressData: ProgressData = {
  points: 0,
  streak: 0,
  wordCount: 0,
  startDate: null,
  weeklyStudyTime: [],
};

interface UseProgressDataReturn {
    progress: ProgressData;
    updateProgress: (newData: Partial<ProgressData>) => void;
    loadProgress: () => Promise<void>;
}

export const useProgressData = (): UseProgressDataReturn => {
  const [progress, setProgress] = useState<ProgressData>(defaultProgressData);

  const calculateDaysSinceLaunch = useCallback((startDate: number | null): number => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

    const loadProgress = useCallback(async () => {
        try {
            const storedData = await AsyncStorage.getItem(PROGRESS_DATA_KEY);
            const storedStartDate = await AsyncStorage.getItem(START_DATE_KEY);
            const storedVocabulary = await AsyncStorage.getItem(VOCABULARY_STORAGE_KEY);

            let initialData: Partial<ProgressData> = {};
            if (storedData) {
                try {
                    initialData = JSON.parse(storedData);
                } catch (parseError) {
                    console.error('Failed to parse stored progress data', parseError);
                }
            }

            let startDate = initialData.startDate;
            if (!startDate && storedStartDate) {
                 startDate = parseInt(storedStartDate, 10);
            } else if (!startDate) {
                startDate = Date.now();
                await AsyncStorage.setItem(START_DATE_KEY, startDate.toString());
            }

            const currentStreak = calculateDaysSinceLaunch(startDate);
            const currentPoints = currentStreak * 10;

            let vocabularyCount = 0;
            if (storedVocabulary) {
                try {
                    const parsedVocabulary = JSON.parse(storedVocabulary);
                    vocabularyCount = Array.isArray(parsedVocabulary) ? parsedVocabulary.length : 0;
                } catch (vocabParseError) {
                     console.error('Failed to parse stored vocabulary data', vocabParseError);
                }
            }

            const allKeys = await AsyncStorage.getAllKeys();
            const dailyTimeKeys = allKeys.filter(key => key.startsWith(TODAY_CHAT_TIME_KEY_PREFIX));

            const dailyTimeData: DailyStudyTime[] = [];
            const now = new Date();
            const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

            const keyValues = await AsyncStorage.multiGet(dailyTimeKeys);

            keyValues.forEach(kv => {
              const key = kv[0];
              const value = kv[1];

              if (key && value) {
                 const dateString = key.replace(TODAY_CHAT_TIME_KEY_PREFIX, '');
                 const savedDate = new Date(dateString);

                 if (!isNaN(savedDate.getTime())) {
                     savedDate.setHours(0, 0, 0, 0);
                     const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

                     if (savedDate >= sevenDaysAgo && savedDate <= todayMidnight) {
                        const totalMilliseconds = parseInt(value, 10);
                        const totalMinutes = Math.round(totalMilliseconds / 60000);

                        dailyTimeData.push({ date: dateString, minutes: totalMinutes });
                     }
                 }
              }
            });

            dailyTimeData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

             const last7Days: DailyStudyTime[] = [];
             for (let i = 6; i >= 0; i--) {
                 const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
                 const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

                 const existingData = dailyTimeData.find(d => d.date === dateString);
                 last7Days.push({
                     date: dateString,
                     minutes: existingData ? existingData.minutes : 0,
                 });
             }


            setProgress({
                ...defaultProgressData,
                ...initialData,
                startDate,
                streak: currentStreak,
                points: currentPoints,
                wordCount: vocabularyCount,
                weeklyStudyTime: last7Days,
            });

        } catch (error) {
            console.error('Failed to load progress data', error);
             setProgress(defaultProgressData);
        }
    }, [calculateDaysSinceLaunch]);

    const updateProgress = useCallback((newData: Partial<ProgressData>) => {
        setProgress((prev) => ({ ...prev, ...newData }));
    }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    const saveProgress = async () => {
      try {
        const dataToSave = {
            points: progress.points,
            streak: progress.streak,
            wordCount: progress.wordCount,
            startDate: progress.startDate,
        };
        await AsyncStorage.setItem(
          PROGRESS_DATA_KEY,
          JSON.stringify(dataToSave)
        );
         if (progress.startDate) {
           await AsyncStorage.setItem(START_DATE_KEY, progress.startDate.toString());
         }

        // console.log('Saved main progress:', dataToSave);
      } catch (error) {
        console.error('Failed to save main progress data', error);
      }
    };

    saveProgress();
  }, [progress.points, progress.streak, progress.wordCount, progress.startDate]);


    useEffect(() => {
       const currentStreak = calculateDaysSinceLaunch(progress.startDate);
        const currentPoints = currentStreak * 10;
        setProgress(prev => {
            if (prev.streak !== currentStreak || prev.points !== currentPoints) {
                 return { ...prev, streak: currentStreak, points: currentPoints };
            }
            return prev;
        });

         const intervalId = setInterval(() => {
             const latestStreak = calculateDaysSinceLaunch(progress.startDate);
             const latestPoints = latestStreak * 10;
              setProgress(prev => {
                if (prev.streak !== latestStreak || prev.points !== latestPoints) {
                     console.log(`Updating streak/points: ${latestStreak}/${latestPoints}`);
                     return { ...prev, streak: latestStreak, points: latestPoints };
                }
                return prev;
            });
            console.log("Interval tick: Streak/Points updated.");
         }, 60000);


        return () => clearInterval(intervalId);

    }, [progress.startDate, calculateDaysSinceLaunch]);


  return { progress, updateProgress, loadProgress };
};