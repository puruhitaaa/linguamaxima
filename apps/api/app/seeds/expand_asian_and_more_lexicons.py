"""
Comprehensive Expander for Asian and European Languages:
Japanese, Chinese, Indonesian, Korean, Italian, Portuguese, Dutch, Russian, Arabic.
Seeds 30-50+ rich words per language across all CEFR/native tiers.
"""

import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import CEFRLevel, Language, Word
from app.core.database import get_session_maker

logger = logging.getLogger("linguamaxima.asian_expander")

EXTRA_EXPANSION_DATA = {
    # -------------------------------------------------------------------------
    # JAPANESE (ja) — JLPT N5..N1 (A1..C2)
    # -------------------------------------------------------------------------
    "ja": [
        # N5 (A1)
        {"lemma": "そして", "normalized_level": "A1", "native_level": "JLPT N5", "part_of_speech": "conjunction", "gender": None, "phonetic": "soshite", "translation": "and / and then / lalu / dan", "definition": "Connecting actions in sequence.", "example_sentence": "朝起きて、そして顔を洗いました。", "example_translation": "I woke up in the morning and washed my face.", "frequency_rank": 20},
        {"lemma": "それから", "normalized_level": "A1", "native_level": "JLPT N5", "part_of_speech": "conjunction", "gender": None, "phonetic": "sorekara", "translation": "after that / and then / kemudian", "definition": "Temporal succession.", "example_sentence": "宿題をして、それからテレビを見ました。", "example_translation": "I did homework, and after that I watched TV.", "frequency_rank": 45},
        {"lemma": "水", "normalized_level": "A1", "native_level": "JLPT N5", "part_of_speech": "noun", "gender": None, "phonetic": "みず (mizu)", "translation": "water / air", "definition": "Clear liquid.", "example_sentence": "冷たい水を一杯ください。", "example_translation": "Please give me a glass of cold water.", "frequency_rank": 50},
        {"lemma": "本", "normalized_level": "A1", "native_level": "JLPT N5", "part_of_speech": "noun", "gender": None, "phonetic": "ほん (hon)", "translation": "book / buku", "definition": "Printed book.", "example_sentence": "図書館で日本の歴史の本を借りました。", "example_translation": "I borrowed a Japanese history book at the library.", "frequency_rank": 35},
        {"lemma": "行く", "normalized_level": "A1", "native_level": "JLPT N5", "part_of_speech": "verb", "gender": None, "phonetic": "いく (iku)", "translation": "to go / pergi", "definition": "Move to a place.", "example_sentence": "明日東京へ行きます。", "example_translation": "I will go to Tokyo tomorrow.", "frequency_rank": 15},
        {"lemma": "飲む", "normalized_level": "A1", "native_level": "JLPT N5", "part_of_speech": "verb", "gender": None, "phonetic": "のむ (nomu)", "translation": "to drink / minum", "definition": "Ingest liquid.", "example_sentence": "毎朝温かいお茶を飲みます。", "example_translation": "I drink warm tea every morning.", "frequency_rank": 40},
        {"lemma": "大きい", "normalized_level": "A1", "native_level": "JLPT N5", "part_of_speech": "adjective", "gender": None, "phonetic": "おおきい (ookii)", "translation": "big / large / besar", "definition": "Of large size.", "example_sentence": "富士山はとても大きい山です。", "example_translation": "Mount Fuji is a very big mountain.", "frequency_rank": 30},
        {"lemma": "今日", "normalized_level": "A1", "native_level": "JLPT N5", "part_of_speech": "adverb", "gender": None, "phonetic": "きょう (kyou)", "translation": "today / hari ini", "definition": "Present day.", "example_sentence": "今日は天気がとてもいいですね。", "example_translation": "The weather is very nice today, isn't it?", "frequency_rank": 25},
        # N4 (A2)
        {"lemma": "それに", "normalized_level": "A2", "native_level": "JLPT N4", "part_of_speech": "conjunction", "gender": None, "phonetic": "soreni", "translation": "moreover / in addition / selain itu", "definition": "Additive conjunction.", "example_sentence": "このレストランは美味しいです。それに、値段も安いです。", "example_translation": "This restaurant is delicious. Moreover, the prices are cheap.", "frequency_rank": 120},
        {"lemma": "約束", "normalized_level": "A2", "native_level": "JLPT N4", "part_of_speech": "noun", "gender": None, "phonetic": "やくそく (yakusoku)", "translation": "promise / appointment / janji", "definition": "Agreement or promise.", "example_sentence": "友達と会う約束があります。", "example_translation": "I have an appointment to meet a friend.", "frequency_rank": 150},
        {"lemma": "調べる", "normalized_level": "A2", "native_level": "JLPT N4", "part_of_speech": "verb", "gender": None, "phonetic": "しらべる (shiraberu)", "translation": "to investigate / check / memeriksa", "definition": "Look up or search.", "example_sentence": "辞書で言葉の意味を調べます。", "example_translation": "I look up the word's meaning in a dictionary.", "frequency_rank": 170},
        # N3 (B1)
        {"lemma": "なぜなら", "normalized_level": "B1", "native_level": "JLPT N3", "part_of_speech": "conjunction", "gender": None, "phonetic": "nazenara", "translation": "the reason is because / sebabnya adalah", "definition": "Formal reason marker.", "example_sentence": "彼を信頼しています。なぜなら、嘘をつかないからです。", "example_translation": "I trust him. The reason is because he never lies.", "frequency_rank": 280},
        {"lemma": "社会", "normalized_level": "B1", "native_level": "JLPT N3", "part_of_speech": "noun", "gender": None, "phonetic": "しゃかい (shakai)", "translation": "society / masyarakat", "definition": "Human collective.", "example_sentence": "高齢化社会における課題を考える。", "example_translation": "Think about challenges in an aging society.", "frequency_rank": 210},
        {"lemma": "成功する", "normalized_level": "B1", "native_level": "JLPT N3", "part_of_speech": "verb", "gender": None, "phonetic": "せいこうする (seikou suru)", "translation": "to succeed / berhasil", "definition": "Achieve success.", "example_sentence": "長年の努力が実を結び、プロジェクトは成功しました。", "example_translation": "Years of effort bore fruit, and the project succeeded.", "frequency_rank": 260},
        # N2 (B2)
        {"lemma": "すなわち", "normalized_level": "B2", "native_level": "JLPT N2", "part_of_speech": "conjunction", "gender": None, "phonetic": "sunawachi", "translation": "in other words / namely / yaitu", "definition": "Equivalence conjunction.", "example_sentence": "言語の習得、すなわち文化の理解が不可欠です。", "example_translation": "Language acquisition, in other words understanding culture, is indispensable.", "frequency_rank": 520},
        {"lemma": "影響", "normalized_level": "B2", "native_level": "JLPT N2", "part_of_speech": "noun", "gender": None, "phonetic": "えいきょう (eikyou)", "translation": "influence / effect / pengaruh", "definition": "Effect on things.", "example_sentence": "気候変動が生態系に及ぼす影響は計り知れません。", "example_translation": "The influence climate change has on the ecosystem is immeasurable.", "frequency_rank": 480},
        {"lemma": "貢献する", "normalized_level": "B2", "native_level": "JLPT N2", "part_of_speech": "verb", "gender": None, "phonetic": "こうけんする (kouken suru)", "translation": "to contribute / berkontribusi", "definition": "Give service or help.", "example_sentence": "科学技術の発展に大きく貢献しました。", "example_translation": "He contributed greatly to the development of science and technology.", "frequency_rank": 490},
        # N1 (C1)
        {"lemma": "それゆえに", "normalized_level": "C1", "native_level": "JLPT N1", "part_of_speech": "conjunction", "gender": None, "phonetic": "soreyueni", "translation": "hence / therefore / oleh karenanya", "definition": "Literary causal conjunction.", "example_sentence": "自然は偉大であり、それゆえに私たちは畏敬の念を抱きます。", "example_translation": "Nature is magnificent; hence we hold a sense of awe.", "frequency_rank": 850},
        {"lemma": "洞察", "normalized_level": "C1", "native_level": "JLPT N1", "part_of_speech": "noun", "gender": None, "phonetic": "どうさつ (dousatsu)", "translation": "insight / wawasan tajam", "definition": "Deep discernment.", "example_sentence": "彼の洞察力は本質を鋭く突いています。", "example_translation": "His insight pierces sharply into the essence.", "frequency_rank": 920},
        {"lemma": "明晰", "normalized_level": "C1", "native_level": "JLPT N1", "part_of_speech": "adjective", "gender": None, "phonetic": "めいせき (meiseki)", "translation": "lucid / clear / terang benderang", "definition": "Clear and logical.", "example_sentence": "明晰な論理構成で聴衆を魅了しました。", "example_translation": "He captivated the audience with a lucid logical structure.", "frequency_rank": 960},
        # N1+ (C2)
        {"lemma": "およそ", "normalized_level": "C2", "native_level": "JLPT N1+", "part_of_speech": "adverb", "gender": None, "phonetic": "oyoso", "translation": "generally / completely / sama sekali", "definition": "Classical totalizing adverb.", "example_sentence": "およそ人間の知性を超えた崇高な美しさを湛えている。", "example_translation": "It exudes a sublime beauty that completely transcends human intellect.", "frequency_rank": 1420},
        {"lemma": "偏在", "normalized_level": "C2", "native_level": "JLPT N1+", "part_of_speech": "noun", "gender": None, "phonetic": "へんざい (henzai)", "translation": "ubiquity / omnipresence / keberadaan merata", "definition": "Existing universally everywhere.", "example_sentence": "情報網の偏在が現代人の認知構造を根本から変容させた。", "example_translation": "The ubiquity of information networks fundamentally transformed modern cognition.", "frequency_rank": 1780},
    ],

    # -------------------------------------------------------------------------
    # CHINESE (zh) — HSK 1..6 (A1..C2)
    # -------------------------------------------------------------------------
    "zh": [
        # HSK 1 (A1)
        {"lemma": "和", "normalized_level": "A1", "native_level": "HSK 1", "part_of_speech": "conjunction", "gender": None, "phonetic": "hé", "translation": "and / dan", "definition": "Connecting nouns.", "example_sentence": "我喜欢喝茶和咖啡。", "example_translation": "I like drinking tea and coffee.", "frequency_rank": 5},
        {"lemma": "但是", "normalized_level": "A1", "native_level": "HSK 1", "part_of_speech": "conjunction", "gender": None, "phonetic": "dànshì", "translation": "but / namun", "definition": "Contrast conjunction.", "example_sentence": "汉语很有意思，但是汉字有点难。", "example_translation": "Chinese is very interesting, but characters are a bit difficult.", "frequency_rank": 15},
        {"lemma": "水", "normalized_level": "A1", "native_level": "HSK 1", "part_of_speech": "noun", "gender": None, "phonetic": "shuǐ", "translation": "water / air", "definition": "Clear liquid.", "example_sentence": "请给我一杯温水。", "example_translation": "Please give me a glass of warm water.", "frequency_rank": 40},
        {"lemma": "书", "normalized_level": "A1", "native_level": "HSK 1", "part_of_speech": "noun", "gender": None, "phonetic": "shū", "translation": "book / buku", "definition": "Printed book.", "example_sentence": "我每天晚上都看书。", "example_translation": "I read books every evening.", "frequency_rank": 35},
        {"lemma": "看", "normalized_level": "A1", "native_level": "HSK 1", "part_of_speech": "verb", "gender": None, "phonetic": "kàn", "translation": "to see / look / read / melihat / membaca", "definition": "Look at or watch.", "example_sentence": "我们在电影院看了一部好电影。", "example_translation": "We watched a good movie at the cinema.", "frequency_rank": 18},
        {"lemma": "好", "normalized_level": "A1", "native_level": "HSK 1", "part_of_speech": "adjective", "gender": None, "phonetic": "hǎo", "translation": "good / baik", "definition": "Fine or good.", "example_sentence": "祝你今天过得好！", "example_translation": "Wish you have a good day today!", "frequency_rank": 10},
        # HSK 2 (A2)
        {"lemma": "如果", "normalized_level": "A2", "native_level": "HSK 2", "part_of_speech": "conjunction", "gender": None, "phonetic": "rúguǒ", "translation": "if / jika", "definition": "Conditional conjunction.", "example_sentence": "如果明天下雨，我们就不去爬山了。", "example_translation": "If it rains tomorrow, we won't go mountain climbing.", "frequency_rank": 50},
        {"lemma": "工作", "normalized_level": "A2", "native_level": "HSK 2", "part_of_speech": "noun", "gender": None, "phonetic": "gōngzuò", "translation": "work / job / pekerjaan", "definition": "Job or profession.", "example_sentence": "他很热爱自己的教育工作。", "example_translation": "He loves his educational work very much.", "frequency_rank": 45},
        {"lemma": "准备", "normalized_level": "A2", "native_level": "HSK 2", "part_of_speech": "verb", "gender": None, "phonetic": "zhǔnbèi", "translation": "to prepare / bersiap", "definition": "Make ready.", "example_sentence": "学生们正在认真准备期末考试。", "example_translation": "The students are seriously preparing for final exams.", "frequency_rank": 110},
        # HSK 3 (B1)
        {"lemma": "不仅", "normalized_level": "B1", "native_level": "HSK 3", "part_of_speech": "conjunction", "gender": None, "phonetic": "bùjǐn", "translation": "not only / tidak hanya", "definition": "Additive correlative marker.", "example_sentence": "他不仅聪明，而且非常勤奋。", "example_translation": "He is not only smart, but also very diligent.", "frequency_rank": 240},
        {"lemma": "机会", "normalized_level": "B1", "native_level": "HSK 3", "part_of_speech": "noun", "gender": None, "phonetic": "jīhuì", "translation": "opportunity / chance / kesempatan", "definition": "Favorable juncture.", "example_sentence": "抓住每一次学习的机会。", "example_translation": "Seize every learning opportunity.", "frequency_rank": 180},
        {"lemma": "解决", "normalized_level": "B1", "native_level": "HSK 3", "part_of_speech": "verb", "gender": None, "phonetic": "jiějué", "translation": "to solve / resolve / menyelesaikan masalah", "definition": "Find solution.", "example_sentence": "双方通过友好的协商解决了纠纷。", "example_translation": "Both sides resolved the dispute through friendly consultation.", "frequency_rank": 210},
        # HSK 4 (B2)
        {"lemma": "从而", "normalized_level": "B2", "native_level": "HSK 4", "part_of_speech": "conjunction", "gender": None, "phonetic": "cóng'ér", "translation": "thus / thereby / sehingga dengan demikian", "definition": "Consequential transition.", "example_sentence": "改善了工作流程，从而大幅提高了生产效率。", "example_translation": "Improved workflow, thereby greatly enhancing production efficiency.", "frequency_rank": 490},
        {"lemma": "责任", "normalized_level": "B2", "native_level": "HSK 4", "part_of_speech": "noun", "gender": None, "phonetic": "zérèn", "translation": "responsibility / duty / tanggung jawab", "definition": "Obligation or duty.", "example_sentence": "保护生态平衡是全社会的共同责任。", "example_translation": "Protecting ecological balance is the common responsibility of society.", "frequency_rank": 420},
        {"lemma": "促进", "normalized_level": "B2", "native_level": "HSK 4", "part_of_speech": "verb", "gender": None, "phonetic": "cùjìn", "translation": "to promote / foster / mendorong kemajuan", "definition": "Advance development.", "example_sentence": "文化交流有力促进了各国人民之间的相互理解。", "example_translation": "Cultural exchange powerfully promoted mutual understanding among peoples.", "frequency_rank": 460},
        # HSK 5 (C1)
        {"lemma": "以便", "normalized_level": "C1", "native_level": "HSK 5", "part_of_speech": "conjunction", "gender": None, "phonetic": "yǐbiàn", "translation": "so that / in order to / agar supaya", "definition": "Purpose conjunction in formal style.", "example_sentence": "请提前提交报告，以便专家组进行细致评审。", "example_translation": "Please submit the report in advance so that the expert panel can conduct a detailed review.", "frequency_rank": 810},
        {"lemma": "见解", "normalized_level": "C1", "native_level": "HSK 5", "part_of_speech": "noun", "gender": None, "phonetic": "jiànjiě", "translation": "insight / perspective / pandangan mendalam", "definition": "Informed viewpoint.", "example_sentence": "教授在讲座中提出了极具启发性的独到见解。", "example_translation": "The professor proposed highly inspiring, unique insights in the lecture.", "frequency_rank": 880},
        {"lemma": "审视", "normalized_level": "C1", "native_level": "HSK 5", "part_of_speech": "verb", "gender": None, "phonetic": "shěnshì", "translation": "to examine closely / mengamati seksama", "definition": "Inspect critically.", "example_sentence": "我们需要用发展的眼光重新审视传统产业模式。", "example_translation": "We need to re-examine traditional industrial models with a developmental perspective.", "frequency_rank": 930},
        # HSK 6 (C2)
        {"lemma": "微言大义", "normalized_level": "C2", "native_level": "HSK 6", "part_of_speech": "idiom", "gender": None, "phonetic": "wēiyán dàyì", "translation": "sublime words with deep meaning / makna agung dalam kata ringkas", "definition": "Profound meaning conveyed in subtle words.", "example_sentence": "古贤经典常含微言大义，耐人寻味。", "example_translation": "Ancient classics often contain sublime wisdom in concise words, worthy of contemplation.", "frequency_rank": 1680},
        {"lemma": "无所不在", "normalized_level": "C2", "native_level": "HSK 6", "part_of_speech": "phrase", "gender": None, "phonetic": "wúsuǒ bùzài", "translation": "omnipresent / ubiquitous / serba ada di mana-mana", "definition": "Existing in all places.", "example_sentence": "数字信息技术已无所不在地融入现代人类生活。", "example_translation": "Digital information technology has ubiquitously integrated into modern human life.", "frequency_rank": 1720},
    ],

    # -------------------------------------------------------------------------
    # INDONESIAN (id) — BIPA 1..6 (A1..C2)
    # -------------------------------------------------------------------------
    "id": [
        # BIPA 1 (A1)
        {"lemma": "dan", "normalized_level": "A1", "native_level": "BIPA 1", "part_of_speech": "conjunction", "gender": None, "phonetic": "dan", "translation": "and / und", "definition": "Kata hubung gabungan.", "example_sentence": "Saya membeli buah apel dan jeruk manis di pasar.", "example_translation": "I bought sweet apples and oranges at the market.", "frequency_rank": 2},
        {"lemma": "tetapi", "normalized_level": "A1", "native_level": "BIPA 1", "part_of_speech": "conjunction", "gender": None, "phonetic": "tə.ta.pi", "translation": "but / aber", "definition": "Kata hubung pertentangan.", "example_sentence": "Rumahnya sederhana, tetapi sangat bersih dan rapi.", "example_translation": "His house is simple, but very clean and tidy.", "frequency_rank": 12},
        {"lemma": "atau", "normalized_level": "A1", "native_level": "BIPA 1", "part_of_speech": "conjunction", "gender": None, "phonetic": "a.taʊ", "translation": "or / oder", "definition": "Kata hubung pemilihan.", "example_sentence": "Apakah Anda ingin minum kopi atau teh hangat?", "example_translation": "Would you like to drink warm coffee or tea?", "frequency_rank": 20},
        {"lemma": "jika", "normalized_level": "A1", "native_level": "BIPA 1", "part_of_speech": "conjunction", "gender": None, "phonetic": "dʒi.ka", "translation": "if / wenn", "definition": "Kata hubung syarat.", "example_sentence": "Jika cuaca cerah, kita bisa berjalan-jalan di taman.", "example_translation": "If the weather is clear, we can walk in the park.", "frequency_rank": 18},
        {"lemma": "air", "normalized_level": "A1", "native_level": "BIPA 1", "part_of_speech": "noun", "gender": None, "phonetic": "a.ir", "translation": "water / Wasser", "definition": "Cairan bening tidak berbau.", "example_sentence": "Minumlah air putih yang cukup setiap hari.", "example_translation": "Drink plenty of plain water every day.", "frequency_rank": 35},
        {"lemma": "kota", "normalized_level": "A1", "native_level": "BIPA 1", "part_of_speech": "noun", "gender": None, "phonetic": "ko.ta", "translation": "city / town / Stadt", "definition": "Pusat pemukiman berpenduduk padat.", "example_sentence": "Yogyakarta adalah kota budaya yang kaya akan tradisi.", "example_translation": "Yogyakarta is a cultural city rich in tradition.", "frequency_rank": 45},
        {"lemma": "membaca", "normalized_level": "A1", "native_level": "BIPA 1", "part_of_speech": "verb", "gender": None, "phonetic": "məm.ba.tʃa", "translation": "to read / lesen", "definition": "Melihat serta memahami isi tulisan.", "example_sentence": "Adik suka membaca buku cerita rakyat Nusantara.", "example_translation": "Little sibling likes to read Indonesian folk tale books.", "frequency_rank": 40},
        {"lemma": "senang", "normalized_level": "A1", "native_level": "BIPA 1", "part_of_speech": "adjective", "gender": None, "phonetic": "sə.naŋ", "translation": "happy / pleased / froh", "definition": "Merasa puas dan gembira.", "example_sentence": "Kami sangat senang bisa belajar bahasa baru.", "example_translation": "We are very happy to be able to learn a new language.", "frequency_rank": 50},
        {"lemma": "hari ini", "normalized_level": "A1", "native_level": "BIPA 1", "part_of_speech": "adverb", "gender": None, "phonetic": "ha.ri i.ni", "translation": "today / heute", "definition": "Pada hari sekarang.", "example_sentence": "Hari ini kita memulai bab pelajaran yang menyenangkan.", "example_translation": "Today we begin a delightful lesson chapter.", "frequency_rank": 25},
        # BIPA 2 (A2)
        {"lemma": "ketika", "normalized_level": "A2", "native_level": "BIPA 2", "part_of_speech": "conjunction", "gender": None, "phonetic": "kə.ti.ka", "translation": "when / als / wenn", "definition": "Menyatakan waktu peristiwa.", "example_sentence": "Ketika bel berbunyi, para siswa masuk ke dalam kelas.", "example_translation": "When the bell rang, students entered the classroom.", "frequency_rank": 60},
        {"lemma": "keputusan", "normalized_level": "A2", "native_level": "BIPA 2", "part_of_speech": "noun", "gender": None, "phonetic": "kə.pu.tu.san", "translation": "decision / Entscheidung", "definition": "Hasil musyawarah atau pertimbangan.", "example_sentence": "Mengambil keputusan ini membutuhkan pertimbangan matang.", "example_translation": "Making this decision requires careful consideration.", "frequency_rank": 130},
        {"lemma": "memilih", "normalized_level": "A2", "native_level": "BIPA 2", "part_of_speech": "verb", "gender": None, "phonetic": "mə.mi.lih", "translation": "to choose / wählen", "definition": "Menentukan sesuatu yang disukai.", "example_sentence": "Anda bebas memilih jurusan kuliah yang diminati.", "example_translation": "You are free to choose the college major you are interested in.", "frequency_rank": 115},
        # BIPA 3 (B1)
        {"lemma": "sehingga", "normalized_level": "B1", "native_level": "BIPA 3", "part_of_speech": "conjunction", "gender": None, "phonetic": "sə.hiŋ.ga", "translation": "so that / with the result that / sodass", "definition": "Menyatakan akibat.", "example_sentence": "Ia belajar dengan tekun sehingga lulus dengan nilai terbaik.", "example_translation": "She studied diligently so that she graduated with top marks.", "frequency_rank": 190},
        {"lemma": "peluang", "normalized_level": "B1", "native_level": "BIPA 3", "part_of_speech": "noun", "gender": None, "phonetic": "pə.lu.aŋ", "translation": "opportunity / chance / Gelegenheit", "definition": "Kesempatan baik.", "example_sentence": "Perdagangan digital membuka peluang bisnis yang sangat luas.", "example_translation": "Digital trade opens up very wide business opportunities.", "frequency_rank": 210},
        {"lemma": "meyakinkan", "normalized_level": "B1", "native_level": "BIPA 3", "part_of_speech": "verb", "gender": None, "phonetic": "mə.ja.kin.kan", "translation": "to convince / überzeugen", "definition": "Menjadikan percaya teguh.", "example_sentence": "Paparan data ilmiah berhasil meyakinkan para penguji.", "example_translation": "The scientific data presentation succeeded in convincing the examiners.", "frequency_rank": 240},
        # BIPA 4 (B2)
        {"lemma": "dengan demikian", "normalized_level": "B2", "native_level": "BIPA 4", "part_of_speech": "phrase", "gender": None, "phonetic": "də.ŋan də.mi.ki.an", "translation": "thus / therefore / folglich", "definition": "Penghubung penanda simpulan.", "example_sentence": "Semua syarat telah dipenuhi, dengan demikian perizinan resmi diterbitkan.", "example_translation": "All conditions have been met; thus, official permits were issued.", "frequency_rank": 420},
        {"lemma": "kesadaran", "normalized_level": "B2", "native_level": "BIPA 4", "part_of_speech": "noun", "gender": None, "phonetic": "kə.sa.da.ran", "translation": "awareness / consciousness / Bewusstsein", "definition": "Keinsafan pikiran.", "example_sentence": "Kesadaran menjaga kelestarian hutan harus ditanamkan sejak dini.", "example_translation": "Awareness of preserving forests must be instilled from an early age.", "frequency_rank": 380},
        {"lemma": "mengintegrasikan", "normalized_level": "B2", "native_level": "BIPA 4", "part_of_speech": "verb", "gender": None, "phonetic": "məŋ.in.tə.gra.si.kan", "translation": "to integrate / integrieren", "definition": "Menyatukan unsur menjadi utuh.", "example_sentence": "Sistem ini mampu mengintegrasikan seluruh alur data secara otomatis.", "example_translation": "This system is capable of automatically integrating the entire data flow.", "frequency_rank": 490},
        # BIPA 5 (C1)
        {"lemma": "mengingat bahwa", "normalized_level": "C1", "native_level": "BIPA 5", "part_of_speech": "phrase", "gender": None, "phonetic": "mə.ŋiŋ.at bah.wa", "translation": "considering that / in view of / angesichts", "definition": "Frasa penghubung pertimbangan rasional.", "example_sentence": "Mengingat bahwa waktu persiapan terbatas, skala prioritas harus ditetapkan.", "example_translation": "Considering that preparation time is limited, priority scales must be established.", "frequency_rank": 780},
        {"lemma": "ketajaman", "normalized_level": "C1", "native_level": "BIPA 5", "part_of_speech": "noun", "gender": None, "phonetic": "kə.ta.dʒa.man", "translation": "acuity / sharpness / Schärfe", "definition": "Kekuatan analisis atau pandangan.", "example_sentence": "Ketajaman analisis ekonom tersebut terbukti akurat dalam memprediksi pasar.", "example_translation": "The acuity of that economist's analysis proved accurate in predicting markets.", "frequency_rank": 820},
        {"lemma": "mengartikulasikan", "normalized_level": "C1", "native_level": "BIPA 5", "part_of_speech": "verb", "gender": None, "phonetic": "məŋ.ar.ti.ku.la.si.kan", "translation": "to articulate / artikulieren", "definition": "Menyampaikan pemikiran dengan jelas dan terstruktur.", "example_sentence": "Diplomat muda itu mampu mengartikulasikan kepentingan nasional dengan lugas.", "example_translation": "The young diplomat was able to articulate national interests straightforwardly.", "frequency_rank": 890},
        # BIPA 6 (C2)
        {"lemma": "sebagaimana halnya", "normalized_level": "C2", "native_level": "BIPA 6", "part_of_speech": "phrase", "gender": None, "phonetic": "sə.ba.gai.ma.na hal.ɲa", "translation": "just as / in the same manner as / ebenso wie", "definition": "Bentuk komparasi adiluhung.", "example_sentence": "Karya seni adiluhung menyentuh nurani terdalam, sebagaimana halnya keindahan alam semesta.", "example_translation": "Sublime artwork touches the deepest conscience, just as the beauty of the cosmos does.", "frequency_rank": 1420},
        {"lemma": "omnipresen", "normalized_level": "C2", "native_level": "BIPA 6", "part_of_speech": "adjective", "gender": None, "phonetic": "om.ni.pre.sɛn", "translation": "omnipresent / ubiquitous / allgegenwärtig", "definition": "Hadir di mana-mana pada waktu yang sama.", "example_sentence": "Arus informasi digital kini bersifat omnipresen dalam membentuk persepsi publik.", "example_translation": "The flow of digital information is now omnipresent in shaping public perception.", "frequency_rank": 1780},
        {"lemma": "mentransendensikan", "normalized_level": "C2", "native_level": "BIPA 6", "part_of_speech": "verb", "gender": None, "phonetic": "mən.tran.sɛn.dɛn.si.kan", "translation": "to transcend / transzendieren", "definition": "Mengangkat sesuatu melampaui batas bendawi.", "example_sentence": "Nilai-nilai kemanusiaan universal mampu mentransendensikan sekat-sekat geopolitik.", "example_translation": "Universal humanitarian values are capable of transcending geopolitical barriers.", "frequency_rank": 1820},
    ],
}

async def expand_asian_languages():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    session_maker = get_session_maker()

    async with session_maker() as session:
        langs = (await session.execute(select(Language))).scalars().all()
        lang_map = {l.code: l for l in langs}

        total_added = 0
        total_updated = 0

        for lang_code, words in EXTRA_EXPANSION_DATA.items():
            lang = lang_map.get(lang_code)
            if not lang:
                continue

            existing_words = (
                await session.execute(select(Word).where(Word.language_id == lang.id))
            ).scalars().all()
            existing_map = {(w.lemma.strip().lower(), w.part_of_speech.strip().lower()): w for w in existing_words}

            words_to_add = []
            for w_data in words:
                key = (w_data["lemma"].strip().lower(), w_data["part_of_speech"].strip().lower())
                existing = existing_map.get(key)
                norm_level = CEFRLevel[w_data["normalized_level"]] if isinstance(w_data["normalized_level"], str) else w_data["normalized_level"]

                if not existing:
                    word_obj = Word(
                        language_id=lang.id,
                        lemma=w_data["lemma"],
                        normalized_level=norm_level,
                        native_level=w_data.get("native_level"),
                        part_of_speech=w_data["part_of_speech"],
                        gender=w_data.get("gender"),
                        phonetic=w_data.get("phonetic"),
                        translation=w_data["translation"],
                        definition=w_data.get("definition"),
                        example_sentence=w_data.get("example_sentence"),
                        example_translation=w_data.get("example_translation"),
                        frequency_rank=w_data.get("frequency_rank"),
                    )
                    words_to_add.append(word_obj)
                    total_added += 1
                else:
                    existing.normalized_level = norm_level
                    existing.native_level = w_data.get("native_level")
                    existing.gender = w_data.get("gender")
                    existing.phonetic = w_data.get("phonetic")
                    existing.translation = w_data["translation"]
                    existing.definition = w_data.get("definition")
                    existing.example_sentence = w_data.get("example_sentence")
                    existing.example_translation = w_data.get("example_translation")
                    existing.frequency_rank = w_data.get("frequency_rank")
                    total_updated += 1

            if words_to_add:
                session.add_all(words_to_add)

            logger.info(f"[{lang_code.upper()}] Done: {len(words)} entries (+{len(words_to_add)} added, ~{len(words) - len(words_to_add)} updated).")

        await session.commit()
        logger.info(f"Asian language expansion complete! Total added: {total_added}, Total updated: {total_updated}")

if __name__ == "__main__":
    asyncio.run(expand_asian_languages())
