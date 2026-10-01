import rawWordsData from './words.json';

// 品詞の日本語変換マッピング
export const POS_MAP = {
  verb: '動詞',
  noun: '名詞',
  adjective: '形容詞',
  adverb: '副詞',
  preposition: '前置詞',
  conjunction: '接続詞',
  pronoun: '代名詞',
  phrase: '熟語・イディオム',
  other: 'その他',
};

// カテゴリー定義（高校生向けにバランス調整: 各レベル1,100〜1,400語）
export const WORD_CATEGORIES = [
  { id: 'all', name: '全単語 (8,114語)', icon: 'Sparkles', color: '#6366f1', level: 'ALL', desc: '全範囲からランダムスピード出題' },
  { id: 'lv1', name: 'Lv.1: 高校基礎・中学復習', icon: 'Coffee', color: '#10b981', level: '基礎', desc: '高校英語の土台となる最重要基礎' },
  { id: 'lv2', name: 'Lv.2: 共通テスト・基本', icon: 'BookOpen', color: '#06b6d4', level: '共テ基本', desc: '共通テスト突破に必須の単語' },
  { id: 'lv3', name: 'Lv.3: 共通テスト・中堅私大', icon: 'Briefcase', color: '#3b82f6', level: '中堅私大', desc: '産近甲龍・日東駒専・共テ7割' },
  { id: 'lv4', name: 'Lv.4: 難関大・国公立・GMARCH', icon: 'TrendingUp', color: '#8b5cf6', level: '難関大', desc: 'MARCH・関関同立・地方国公立' },
  { id: 'lv5', name: 'Lv.5: 最難関大・早慶・難単語', icon: 'GraduationCap', color: '#ec4899', level: '最難関', desc: '東大・京大・早慶・難関資格' },
  { id: 'lv6', name: 'Lv.6: 入試頻出 英熟語・連語', icon: 'Flame', color: '#f59e0b', level: '熟語', desc: '差がつく重要イディオム・句動詞' },
];

// 4択選択肢の自動生成関数
export function generateOptionsForWord(targetWord, pool = rawWordsData) {
  const correctMeaning = targetWord.meaning;
  
  // 同じ品詞の単語からダミーを優先抽出
  const samePosWords = pool.filter(w => w.id !== targetWord.id && w.partOfSpeech === targetWord.partOfSpeech);
  const candidatePool = samePosWords.length >= 10 ? samePosWords : pool.filter(w => w.id !== targetWord.id);
  
  // シャッフルして3つ選択
  const dummyMeanings = [];
  const shuffledCandidates = [...candidatePool].sort(() => Math.random() - 0.5);

  for (const c of shuffledCandidates) {
    if (c.meaning !== correctMeaning && !dummyMeanings.includes(c.meaning)) {
      dummyMeanings.push(c.meaning);
      if (dummyMeanings.length === 3) break;
    }
  }

  // 4択をシャッフル
  const options = [correctMeaning, ...dummyMeanings].sort(() => Math.random() - 0.5);
  return options;
}

// 熟語・単語の判定および均等リバランス（各レベル約1,100〜1,400語に平準化）
const nonPhraseWords = [];
const phraseWords = [];

rawWordsData.forEach((w) => {
  const isPhrase = w.partOfSpeech === 'phrase' || w.partOfSpeech === 'idiom' || (w.english && w.english.trim().includes(' '));
  if (w.difficulty === 6 || isPhrase) {
    phraseWords.push(w);
  } else {
    nonPhraseWords.push(w);
  }
});

// 単語のスコアリング（cefrLevel + difficulty + id）でソートし、5等分して平準化
const cefrScore = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
nonPhraseWords.sort((a, b) => {
  const scoreA = (cefrScore[a.cefrLevel] || a.difficulty || 3) * 10000 + a.id;
  const scoreB = (cefrScore[b.cefrLevel] || b.difficulty || 3) * 10000 + b.id;
  return scoreA - scoreB;
});

const totalNonPhrase = nonPhraseWords.length;
const bucketSize = Math.ceil(totalNonPhrase / 5);

const wordLevelMap = new Map();

nonPhraseWords.forEach((w, index) => {
  const bucketIndex = Math.min(4, Math.floor(index / bucketSize)); // 0: lv1, 1: lv2, 2: lv3, 3: lv4, 4: lv5
  const lvKey = `lv${bucketIndex + 1}`;
  const levelLabels = ['高校基礎', '共テ基本', '中堅私大', '難関大', '最難関'];
  wordLevelMap.set(w.id, {
    category: lvKey,
    level: levelLabels[bucketIndex],
    difficulty: bucketIndex + 1,
  });
});

phraseWords.forEach((w) => {
  wordLevelMap.set(w.id, {
    category: 'lv6',
    level: '熟語',
    difficulty: 6,
  });
});

// 統一フォーマットに正規化した単語データ
export const WORDS_DATABASE = rawWordsData.map((w) => {
  const assigned = wordLevelMap.get(w.id) || { category: 'lv3', level: '中堅私大', difficulty: 3 };

  return {
    id: w.id,
    word: w.english,
    phonetic: w.phonetic || '',
    partOfSpeech: POS_MAP[w.partOfSpeech] || w.partOfSpeech || '単語',
    rawPos: w.partOfSpeech,
    meaning: w.meaning,
    category: assigned.category,
    level: assigned.level,
    difficulty: assigned.difficulty,
    exampleEn: w.exampleSentence || `The phrase "${w.english}" is essential for exams.`,
    exampleJa: w.exampleSentenceMeaning || `「${w.english}」は入試・テスト頻出の重要表現です。`,
    tip: `Lv.${assigned.difficulty} (${assigned.level}) / ${POS_MAP[w.partOfSpeech] || w.partOfSpeech || ''}`,
  };
});
