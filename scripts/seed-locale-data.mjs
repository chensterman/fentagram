import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const en = JSON.parse(readFileSync(join(root, '_locales/en/messages.json'), 'utf8'))
const outDir = join(root, 'scripts/locale-data')
mkdirSync(outDir, { recursive: true })

/** @type {Record<string, Record<string, string>>} */
const packs = {
  it: {
    appDescription: 'Scopri chi non ti segue e tieni la cronologia di follow e unfollow.',
    buttonSync: 'Sincronizza', buttonSyncAgain: 'Sincronizza di nuovo', buttonResume: 'Riprendi', buttonSyncing: 'Sincronizzazione…',
    statusIdle: 'Apri il tuo profilo Instagram e premi Sincronizza. Tieni la scheda in primo piano.',
    listFollowers: 'Follower', listFollowing: 'Seguiti', tabNotFollowingBack: 'Non ti seguono', tabUnfollowed: 'Unfollow', tabFollowed: 'Nuovi follower',
    syncNoTab: 'Apri instagram.com in una scheda e premi Sincronizza.', syncRefreshTab: 'Aggiorna la scheda Instagram e sincronizza di nuovo.',
  },
  ru: {
    appDescription: 'Узнайте, кто не подписан на вас, и ведите историю подписок.',
    buttonSync: 'Синхронизировать', buttonSyncAgain: 'Синхронизировать снова', buttonResume: 'Продолжить', buttonSyncing: 'Синхронизация…',
    listFollowers: 'Подписчики', listFollowing: 'Подписки', tabNotFollowingBack: 'Не подписаны на вас',
    syncNoTab: 'Откройте instagram.com и нажмите «Синхронизировать».',
  },
  ja: {
    appDescription: 'フォローバックしていない人を確認し、フォロー履歴を保存します。',
    buttonSync: '同期', buttonSyncAgain: '再同期', buttonResume: '再開', buttonSyncing: '同期中…',
    listFollowers: 'フォロワー', listFollowing: 'フォロー中', tabNotFollowingBack: 'フォローバックなし',
    syncNoTab: 'Instagramのタブを開いて「同期」を押してください。',
  },
  ko: {
    appDescription: '맞팔로우하지 않은 사람을 확인하고 팔로우 기록을 저장합니다.',
    buttonSync: '동기화', buttonSyncAgain: '다시 동기화', buttonResume: '재개', buttonSyncing: '동기화 중…',
    listFollowers: '팔로워', listFollowing: '팔로잉', tabNotFollowingBack: '맞팔로우 안 함',
    syncNoTab: 'instagram.com 탭을 연 뒤 동기화를 누르세요.',
  },
  zh_CN: {
    appDescription: '查看谁没有回关你，并保存关注与取关记录。',
    buttonSync: '同步', buttonSyncAgain: '再次同步', buttonResume: '继续', buttonSyncing: '正在同步…',
    listFollowers: '粉丝', listFollowing: '关注', tabNotFollowingBack: '未回关',
    syncNoTab: '请打开 instagram.com 标签页并点击同步。',
  },
  zh_TW: {
    appDescription: '查看誰沒有回追你，並保存追蹤與取消追蹤記錄。',
    buttonSync: '同步', buttonSyncAgain: '再次同步', buttonResume: '繼續', buttonSyncing: '正在同步…',
    listFollowers: '粉絲', listFollowing: '追蹤中', tabNotFollowingBack: '未回追',
    syncNoTab: '請開啟 instagram.com 分頁並點按同步。',
  },
  ar: {
    appDescription: 'اعرف من لا يتابعك بالمثل واحتفظ بسجل المتابعات.',
    buttonSync: 'مزامنة', buttonSyncAgain: 'مزامنة مجددًا', buttonResume: 'استئناف', buttonSyncing: 'جارٍ المزامنة…',
    listFollowers: 'المتابعون', listFollowing: 'يتابع', tabNotFollowingBack: 'لا يتابعونك',
    syncNoTab: 'افتح instagram.com في علامة تبويب واضغط مزامنة.',
  },
  hi: {
    appDescription: 'देखें कौन आपको फ़ॉलो नहीं करता और फ़ॉलो इतिहास सहेजें।',
    buttonSync: 'सिंक करें', buttonSyncAgain: 'फिर सिंक करें', buttonResume: 'जारी रखें', buttonSyncing: 'सिंक हो रहा है…',
    listFollowers: 'फ़ॉलोअर्स', listFollowing: 'फ़ॉलो किए जा रहे हैं', tabNotFollowingBack: 'फ़ॉलो बैक नहीं',
  },
  id: {
    appDescription: 'Lihat siapa yang tidak follow back dan simpan riwayat follow.',
    buttonSync: 'Sinkronkan', buttonSyncAgain: 'Sinkronkan lagi', buttonResume: 'Lanjutkan', buttonSyncing: 'Menyinkronkan…',
    listFollowers: 'Pengikut', listFollowing: 'Mengikuti', tabNotFollowingBack: 'Tidak follow back',
  },
  tr: {
    appDescription: 'Sizi geri takip etmeyenleri görün ve takip geçmişini saklayın.',
    buttonSync: 'Eşitle', buttonSyncAgain: 'Yeniden eşitle', buttonResume: 'Sürdür', buttonSyncing: 'Eşitleniyor…',
    listFollowers: 'Takipçiler', listFollowing: 'Takip', tabNotFollowingBack: 'Geri takip etmiyor',
  },
  vi: {
    appDescription: 'Xem ai không follow lại bạn và lưu lịch sử follow.',
    buttonSync: 'Đồng bộ', buttonSyncAgain: 'Đồng bộ lại', buttonResume: 'Tiếp tục', buttonSyncing: 'Đang đồng bộ…',
    listFollowers: 'Người theo dõi', listFollowing: 'Đang theo dõi', tabNotFollowingBack: 'Không follow lại',
  },
  th: {
    appDescription: 'ดูว่าใครไม่ได้ติดตามคุณกลับ และเก็บประวัติการติดตาม',
    buttonSync: 'ซิงค์', buttonSyncAgain: 'ซิงค์อีกครั้ง', buttonResume: 'ทำต่อ', buttonSyncing: 'กำลังซิงค์…',
    listFollowers: 'ผู้ติดตาม', listFollowing: 'กำลังติดตาม', tabNotFollowingBack: 'ไม่ได้ติดตามกลับ',
  },
  pl: {
    appDescription: 'Zobacz, kto nie obserwuje Cię z powrotem, i zapisuj historię obserwacji.',
    buttonSync: 'Synchronizuj', buttonSyncAgain: 'Synchronizuj ponownie', buttonResume: 'Wznów', buttonSyncing: 'Synchronizowanie…',
    listFollowers: 'Obserwujący', listFollowing: 'Obserwowani', tabNotFollowingBack: 'Bez obserwacji zwrotnej',
  },
  nl: {
    appDescription: 'Zie wie je niet terugvolgt en bewaar je follow-geschiedenis.',
    buttonSync: 'Synchroniseren', buttonSyncAgain: 'Opnieuw synchroniseren', buttonResume: 'Hervatten', buttonSyncing: 'Synchroniseren…',
    listFollowers: 'Volgers', listFollowing: 'Gevolgd', tabNotFollowingBack: 'Volgen niet terug',
  },
  sv: {
    appDescription: 'Se vem som inte följer tillbaka och spara följarhistorik.',
    buttonSync: 'Synka', buttonSyncAgain: 'Synka igen', buttonResume: 'Fortsätt', buttonSyncing: 'Synkar…',
    listFollowers: 'Följare', listFollowing: 'Följer', tabNotFollowingBack: 'Följer inte tillbaka',
  },
  da: {
    appDescription: 'Se hvem der ikke følger dig tilbage, og gem følgerhistorik.',
    buttonSync: 'Synkroniser', buttonSyncAgain: 'Synkroniser igen', buttonResume: 'Fortsæt', buttonSyncing: 'Synkroniserer…',
    listFollowers: 'Følgere', listFollowing: 'Følger', tabNotFollowingBack: 'Følger ikke tilbage',
  },
  nb: {
    appDescription: 'Se hvem som ikke følger deg tilbake, og lagre følgerhistorikk.',
    buttonSync: 'Synkroniser', buttonSyncAgain: 'Synkroniser igjen', buttonResume: 'Fortsett', buttonSyncing: 'Synkroniserer…',
    listFollowers: 'Følgere', listFollowing: 'Følger', tabNotFollowingBack: 'Følger ikke tilbake',
  },
  fi: {
    appDescription: 'Näe ketkä eivät seuraa takaisin ja tallenna seuraajahistoria.',
    buttonSync: 'Synkronoi', buttonSyncAgain: 'Synkronoi uudelleen', buttonResume: 'Jatka', buttonSyncing: 'Synkronoidaan…',
    listFollowers: 'Seuraajat', listFollowing: 'Seurattavat', tabNotFollowingBack: 'Ei seuraa takaisin',
  },
  cs: {
    appDescription: 'Zjistěte, kdo vás nesleduje zpět, a ukládejte historii sledování.',
    buttonSync: 'Synchronizovat', buttonSyncAgain: 'Synchronizovat znovu', buttonResume: 'Pokračovat', buttonSyncing: 'Synchronizace…',
    listFollowers: 'Sledující', listFollowing: 'Sledovaní', tabNotFollowingBack: 'Nesledují zpět',
  },
  ro: {
    appDescription: 'Vezi cine nu te urmărește la rândul lui și păstrează istoricul urmăririlor.',
    buttonSync: 'Sincronizează', buttonSyncAgain: 'Sincronizează din nou', buttonResume: 'Continuă', buttonSyncing: 'Se sincronizează…',
    listFollowers: 'Urmăritori', listFollowing: 'Urmăriți', tabNotFollowingBack: 'Nu te urmăresc înapoi',
  },
  hu: {
    appDescription: 'Nézd meg, ki nem követ vissza, és mentsd a követési előzményeket.',
    buttonSync: 'Szinkronizálás', buttonSyncAgain: 'Újra szinkronizálás', buttonResume: 'Folytatás', buttonSyncing: 'Szinkronizálás…',
    listFollowers: 'Követők', listFollowing: 'Követések', tabNotFollowingBack: 'Nem követ vissza',
  },
  uk: {
    appDescription: 'Дізнайтеся, хто не підписаний на вас у відповідь, і зберігайте історію.',
    buttonSync: 'Синхронізувати', buttonSyncAgain: 'Синхронізувати знову', buttonResume: 'Продовжити', buttonSyncing: 'Синхронізація…',
    listFollowers: 'Підписники', listFollowing: 'Підписки', tabNotFollowingBack: 'Не підписані на вас',
  },
  el: {
    appDescription: 'Δείτε ποιος δεν σας ακολουθεί πίσω και κρατήστε ιστορικό ακολούθων.',
    buttonSync: 'Συγχρονισμός', buttonSyncAgain: 'Συγχρονισμός ξανά', buttonResume: 'Συνέχεια', buttonSyncing: 'Συγχρονισμός…',
    listFollowers: 'Ακόλουθοι', listFollowing: 'Ακολουθεί', tabNotFollowingBack: 'Δεν ακολουθούν πίσω',
  },
  he: {
    appDescription: 'ראו מי לא עוקב בחזרה ושמרו היסטוריית מעקב.',
    buttonSync: 'סנכרון', buttonSyncAgain: 'סנכרון שוב', buttonResume: 'המשך', buttonSyncing: 'מסנכרן…',
    listFollowers: 'עוקבים', listFollowing: 'במעקב', tabNotFollowingBack: 'לא עוקבים בחזרה',
  },
  ms: {
    appDescription: 'Lihat siapa yang tidak follow back dan simpan sejarah follow.',
    buttonSync: 'Segerak', buttonSyncAgain: 'Segerak semula', buttonResume: 'Sambung', buttonSyncing: 'Menyegerak…',
    listFollowers: 'Pengikut', listFollowing: 'Mengikuti', tabNotFollowingBack: 'Tidak follow back',
  },
  fil: {
    appDescription: 'Tingnan kung sino ang hindi nagfo-follow back at itago ang history.',
    buttonSync: 'I-sync', buttonSyncAgain: 'I-sync muli', buttonResume: 'Ipagpatuloy', buttonSyncing: 'Nagsi-sync…',
    listFollowers: 'Mga follower', listFollowing: 'Sinusundan', tabNotFollowingBack: 'Hindi nagfo-follow back',
  },
  pt_PT: {
    appDescription: 'Veja quem não segue de volta e mantenha o historial de seguidores.',
    buttonSync: 'Sincronizar', buttonSyncAgain: 'Sincronizar novamente', buttonResume: 'Retomar', buttonSyncing: 'A sincronizar…',
    listFollowers: 'Seguidores', listFollowing: 'A seguir', tabNotFollowingBack: 'Não seguem de volta',
    syncNoTab: 'Abra instagram.com num separador e prima Sincronizar.',
  },
}

function mergePack(partial) {
  const merged = {}
  for (const [key, entry] of Object.entries(en)) {
    merged[key] = partial[key] ?? entry.message
  }
  return merged
}

for (const [code, partial] of Object.entries(packs)) {
  writeFileSync(join(outDir, `${code}.json`), `${JSON.stringify(mergePack(partial), null, 2)}\n`)
}

// Keep full hand translations if present
for (const file of ['es.json', 'de.json', 'fr.json', 'pt_BR.json', 'es_419.json']) {
  const path = join(outDir, file)
  try {
    readFileSync(path)
  } catch {
    /* seeded separately */
  }
}

console.log(`Updated ${Object.keys(packs).length} locale packs in scripts/locale-data/`)
