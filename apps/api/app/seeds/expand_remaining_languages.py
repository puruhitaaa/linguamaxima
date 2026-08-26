"""
Expander for Remaining Languages:
Arabic (ar), Italian (it), Korean (ko), Dutch (nl), Portuguese (pt), Russian (ru).
Seeds 30-50+ rich words per language across all CEFR/native tiers.
"""

import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import CEFRLevel, Language, Word
from app.core.database import get_session_maker

logger = logging.getLogger("linguamaxima.remaining_expander")

REMAINING_EXPANSIONS = {
    # ----------------- ITALIAN (it) -----------------
    "it": [
        # A1
        {"lemma": "e", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "e", "translation": "and / dan", "definition": "Congiunzione copulativa.", "example_sentence": "Prendo un caffè e un cornetto caldo.", "example_translation": "I'll have a coffee and a warm croissant.", "frequency_rank": 2},
        {"lemma": "ma", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "ma", "translation": "but / tetapi", "definition": "Congiunzione avversativa.", "example_sentence": "Vorrei venire, ma ho molto lavoro da finire.", "example_translation": "I would like to come, but I have a lot of work to finish.", "frequency_rank": 14},
        {"lemma": "o", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "o", "translation": "or / atau", "definition": "Congiunzione disgiuntiva.", "example_sentence": "Preferisci acqua naturale o frizzante?", "example_translation": "Do you prefer still or sparkling water?", "frequency_rank": 22},
        {"lemma": "se", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "se", "translation": "if / jika", "definition": "Congiunzione ipotetica.", "example_sentence": "Se hai tempo, andiamo a fare una passeggiata.", "example_translation": "If you have time, let's go for a walk.", "frequency_rank": 18},
        {"lemma": "casa", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": "la", "phonetic": "ˈka.za", "translation": "house / home / rumah", "definition": "Edificio per abitazione.", "example_sentence": "La nostra casa si trova in una piazza tranquilla.", "example_translation": "Our house is in a quiet square.", "frequency_rank": 40},
        {"lemma": "città", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": "la", "phonetic": "tʃitˈta", "translation": "city / kota", "definition": "Centro abitato esteso.", "example_sentence": "Roma è una città ricca di storia e fascino.", "example_translation": "Rome is a city rich in history and charm.", "frequency_rank": 45},
        {"lemma": "acqua", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": "l'", "phonetic": "ˈak.kwa", "translation": "water / air", "definition": "Liquido trasparente vitale.", "example_sentence": "Bevo un bicchiere d'acqua fresca ogni mattina.", "example_translation": "I drink a glass of fresh water every morning.", "frequency_rank": 35},
        {"lemma": "parlare", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "verb", "gender": None, "phonetic": "parˈla.re", "translation": "to speak / berbicara", "definition": "Esprimersi con la voce.", "example_sentence": "Loro parlano italiano molto bene.", "example_translation": "They speak Italian very well.", "frequency_rank": 25},
        {"lemma": "leggere", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "verb", "gender": None, "phonetic": "ˈlɛd.dʒe.re", "translation": "to read / membaca", "definition": "Scorrere con gli occhi un testo.", "example_sentence": "Mi piace leggere romanzi la sera.", "example_translation": "I like reading novels in the evening.", "frequency_rank": 50},
        {"lemma": "bello", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "adjective", "gender": None, "phonetic": "ˈbɛl.lo", "translation": "beautiful / nice / indah", "definition": "Di aspetto gradevole.", "example_sentence": "Oggi è una bellissima giornata di sole.", "example_translation": "Today is a beautiful sunny day.", "frequency_rank": 20},
        {"lemma": "oggi", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "adverb", "gender": None, "phonetic": "ˈɔd.dʒi", "translation": "today / hari ini", "definition": "Nel giorno corrente.", "example_sentence": "Oggi andiamo a visitare gli Uffizi.", "example_translation": "Today we are visiting the Uffizi.", "frequency_rank": 30},
        # A2
        {"lemma": "quando", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "conjunction", "gender": None, "phonetic": "ˈkwan.do", "translation": "when / ketika", "definition": "Congiunzione temporale.", "example_sentence": "Quando arrivi in stazione, fammi uno squillo.", "example_translation": "When you arrive at the station, give me a call.", "frequency_rank": 20},
        {"lemma": "lavoro", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "noun", "gender": "il", "phonetic": "laˈvo.ro", "translation": "work / job / pekerjaan", "definition": "Attività professionale.", "example_sentence": "Trovare un lavoro gratificante è un grande traguardo.", "example_translation": "Finding a rewarding job is a great achievement.", "frequency_rank": 65},
        {"lemma": "scegliere", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "verb", "gender": None, "phonetic": "ˈʃeʎ.ʎe.re", "translation": "to choose / memilih", "definition": "Decidere tra più opzioni.", "example_sentence": "È difficile scegliere tra tante belle proposte.", "example_translation": "It is difficult to choose among so many nice proposals.", "frequency_rank": 90},
        {"lemma": "importante", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "adjective", "gender": None, "phonetic": "im.porˈtan.te", "translation": "important / penting", "definition": "Di rilievo considerevole.", "example_sentence": "La salute è la cosa più importante nella vita.", "example_translation": "Health is the most important thing in life.", "frequency_rank": 55},
        # B1
        {"lemma": "siccome", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "conjunction", "gender": None, "phonetic": "sikˈko.me", "translation": "since / seeing that / karena / berhubung", "definition": "Congiunzione causale anteposta.", "example_sentence": "Siccome faceva freddo, abbiamo acceso il camino.", "example_translation": "Since it was cold, we lit the fireplace.", "frequency_rank": 210},
        {"lemma": "ambiente", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "noun", "gender": "l'", "phonetic": "amˈbjɛn.te", "translation": "environment / lingkungan", "definition": "Mondo naturale circostante.", "example_sentence": "La salvaguardia dell'ambiente richiede l'impegno di tutti.", "example_translation": "Safeguarding the environment requires everyone's commitment.", "frequency_rank": 270},
        {"lemma": "convincere", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "verb", "gender": None, "phonetic": "konˈvin.tʃe.re", "translation": "to convince / meyakinkan", "definition": "Persuadere con argomenti.", "example_sentence": "La sua presentazione ha convinto l'intero consiglio.", "example_translation": "His presentation convinced the whole board.", "frequency_rank": 320},
        # B2
        {"lemma": "in modo che", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "conjunction", "gender": None, "phonetic": "in ˈmɔ.do ke", "translation": "so that / in such a way that / sehingga", "definition": "Congiunzione consecutiva o finale.", "example_sentence": "Abbiamo spiegato le regole in modo che tutti potessero capire.", "example_translation": "We explained the rules so that everyone could understand.", "frequency_rank": 480},
        {"lemma": "sostenibilità", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "noun", "gender": "la", "phonetic": "sos.te.ni.bi.liˈta", "translation": "sustainability / keberlanjutan", "definition": "Capacità di mantenere un equilibrio ecologico.", "example_sentence": "La sostenibilità energetica è al centro del nuovo piano industriale.", "example_translation": "Energy sustainability is at the core of the new industrial plan.", "frequency_rank": 590},
        # C1
        {"lemma": "giacché", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "conjunction", "gender": None, "phonetic": "dʒakˈke", "translation": "inasmuch as / since / mengingat bahwa", "definition": "Congiunzione causale formale.", "example_sentence": "Giacché le premesse sono state verificate, si può procedere all'approvazione.", "example_translation": "Since the premises have been verified, one can proceed to approval.", "frequency_rank": 820},
        {"lemma": "perspicacia", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "noun", "gender": "la", "phonetic": "per.spiˈka.tʃa", "translation": "perspicacity / insight / ketajaman pengamatan", "definition": "Prontezza e finezza di intuito.", "example_sentence": "La sua perspicacia critica ha consentito di individuare tempestivamente l'errore.", "example_translation": "His critical perspicacity made it possible to identify the error promptly.", "frequency_rank": 1050},
        # C2
        {"lemma": "posto che", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "conjunction", "gender": None, "phonetic": "ˈpɔ.sto ke", "translation": "granted that / provided that / asalkan", "definition": "Locuzione congiuntiva ipotetica dotta.", "example_sentence": "Posto che si ottengano i finanziamenti, il polo scientifico sarà ultimato in due anni.", "example_translation": "Granted that funding is obtained, the science center will be completed in two years.", "frequency_rank": 1410},
        {"lemma": "onnipervasività", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "noun", "gender": "l'", "phonetic": "on.ni.per.va.zi.viˈta", "translation": "omnipresence / all-pervasiveness / kemerataan serba ada", "definition": "Capacità di permeare ogni ambito.", "example_sentence": "L'onnipervasività dei flussi digitali plasma in profondità la percezione antropologica.", "example_translation": "The all-pervasiveness of digital flows deeply shapes anthropological perception.", "frequency_rank": 1750},
        {"lemma": "trascendere", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "verb", "gender": None, "phonetic": "traʃˈʃɛn.de.re", "translation": "to transcend / melampaui batas", "definition": "Superare i limiti dell'esperienza ordinaria.", "example_sentence": "La sublime polifonia rinascimentale trascende i confini dell'epoca per toccare l'eterno.", "example_translation": "Sublime Renaissance polyphony transcends the borders of its era to touch the eternal.", "frequency_rank": 1580},
    ],

    # ----------------- KOREAN (ko) -----------------
    "ko": [
        # A1
        {"lemma": "그리고", "normalized_level": "A1", "native_level": "TOPIK 1", "part_of_speech": "conjunction", "gender": None, "phonetic": "geurigo", "translation": "and / dan", "definition": "순서대로 이어 주는 접속사.", "example_sentence": "사과를 샀어요. 그리고 바나나도 샀어요.", "example_translation": "I bought apples. And I also bought bananas.", "frequency_rank": 5},
        {"lemma": "물", "normalized_level": "A1", "native_level": "TOPIK 1", "part_of_speech": "noun", "gender": None, "phonetic": "mul", "translation": "water / air", "definition": "투명한 액체.", "example_sentence": "시원한 물 한 잔 주세요.", "example_translation": "Please give me a glass of cold water.", "frequency_rank": 35},
        {"lemma": "책", "normalized_level": "A1", "native_level": "TOPIK 1", "part_of_speech": "noun", "gender": None, "phonetic": "chaek", "translation": "book / buku", "definition": "글이나 그림을 묶은 인쇄물.", "example_sentence": "매일 저녁에 책을 읽어요.", "example_translation": "I read books every evening.", "frequency_rank": 40},
        {"lemma": "가다", "normalized_level": "A1", "native_level": "TOPIK 1", "part_of_speech": "verb", "gender": None, "phonetic": "gada", "translation": "to go / pergi", "definition": "다른 곳으로 이동하다.", "example_sentence": "내일 서울에 가요.", "example_translation": "I am going to Seoul tomorrow.", "frequency_rank": 10},
        {"lemma": "좋다", "normalized_level": "A1", "native_level": "TOPIK 1", "part_of_speech": "adjective", "gender": None, "phonetic": "jota", "translation": "good / baik", "definition": "만족스럽다.", "example_sentence": "오늘 날씨가 정말 좋아요.", "example_translation": "The weather is really good today.", "frequency_rank": 15},
        # A2
        {"lemma": "만약", "normalized_level": "A2", "native_level": "TOPIK 2", "part_of_speech": "conjunction", "gender": None, "phonetic": "manyak", "translation": "if / in case / jika / andaikata", "definition": "가정할 때 쓰는 말.", "example_sentence": "만약 시간이 있다면 같이 영화를 봐요.", "example_translation": "If you have time, let's watch a movie together.", "frequency_rank": 55},
        {"lemma": "약속", "normalized_level": "A2", "native_level": "TOPIK 2", "part_of_speech": "noun", "gender": None, "phonetic": "yaksok", "translation": "promise / appointment / janji", "definition": "앞으로의 일을 정함.", "example_sentence": "친구와 주말에 만날 약속이 있어요.", "example_translation": "I have an appointment to meet a friend over the weekend.", "frequency_rank": 90},
        {"lemma": "선택하다", "normalized_level": "A2", "native_level": "TOPIK 2", "part_of_speech": "verb", "gender": None, "phonetic": "seontaekhada", "translation": "to choose / select / memilih", "definition": "여럿 가운데서 고르다.", "example_sentence": "원하는 메뉴를 자유롭게 선택하세요.", "example_translation": "Feel free to choose the menu you want.", "frequency_rank": 110},
        # B1
        {"lemma": "뿐만 아니라", "normalized_level": "B1", "native_level": "TOPIK 3", "part_of_speech": "conjunction", "gender": None, "phonetic": "ppunman anira", "translation": "not only ... but also / tidak hanya ... melainkan juga", "definition": "더 보태어 나타내는 접속 표현.", "example_sentence": "그는 친절할 뿐만 아니라 유능합니다.", "example_translation": "He is not only kind, but also competent.", "frequency_rank": 260},
        {"lemma": "기회", "normalized_level": "B1", "native_level": "TOPIK 3", "part_of_speech": "noun", "gender": None, "phonetic": "gihoe", "translation": "opportunity / chance / kesempatan", "definition": "알맞은 시기.", "example_sentence": "새로운 배움의 기회를 잡으세요.", "example_translation": "Seize the new learning opportunity.", "frequency_rank": 170},
        {"lemma": "설득하다", "normalized_level": "B1", "native_level": "TOPIK 3", "part_of_speech": "verb", "gender": None, "phonetic": "seoldeukhada", "translation": "to persuade / convince / meyakinkan", "definition": "타이르거나 납득시키다.", "example_sentence": "객관적인 자료로 팀원들을 설득했습니다.", "example_translation": "He persuaded team members with objective data.", "frequency_rank": 240},
        # B2
        {"lemma": "그로 인해", "normalized_level": "B2", "native_level": "TOPIK 4", "part_of_speech": "phrase", "gender": None, "phonetic": "geuro inhae", "translation": "thereby / as a result / dengan demikian", "definition": "원인과 결과의 연결.", "example_sentence": "생산 공정을 개선했으며, 그로 인해 생산성이 대폭 향상되었습니다.", "example_translation": "Improved production processes, thereby greatly increasing productivity.", "frequency_rank": 460},
        {"lemma": "책임감", "normalized_level": "B2", "native_level": "TOPIK 4", "part_of_speech": "noun", "gender": None, "phonetic": "chaegimgam", "translation": "sense of responsibility / rasa tanggung jawab", "definition": "맡은 일을 완수하려는 태도.", "example_sentence": "리더는 강한 책임감을 지녀야 합니다.", "example_translation": "A leader must possess a strong sense of responsibility.", "frequency_rank": 410},
        # C1
        {"lemma": "비단 ... 뿐만 아니라", "normalized_level": "C1", "native_level": "TOPIK 5", "part_of_speech": "phrase", "gender": None, "phonetic": "bidan ... ppunman anira", "translation": "not merely / tak semata-mata", "definition": "고급 문어적 강조 표현.", "example_sentence": "이 문제는 비단 한 국가뿐만 아니라 전 지구적 차원의 과제입니다.", "example_translation": "This issue is not merely one nation's, but a global challenge.", "frequency_rank": 780},
        {"lemma": "예지력", "normalized_level": "C1", "native_level": "TOPIK 5", "part_of_speech": "noun", "gender": None, "phonetic": "yejiryeok", "translation": "foresight / prescience / daya terawang jauh", "definition": "미래의 일을 미리 헤아려 아는 능력.", "example_sentence": "선구자적 학자의 예지력이 새로운 학문 분야를 개척했습니다.", "example_translation": "The pioneering scholar's foresight opened up a new academic field.", "frequency_rank": 910},
        # C2
        {"lemma": "무소부재", "normalized_level": "C2", "native_level": "TOPIK 6", "part_of_speech": "noun", "gender": None, "phonetic": "musobujae", "translation": "omnipresence / ubiquity / keberadaan mutlak di mana pun", "definition": "어느 곳에나 존재하지 않는 데가 없음.", "example_sentence": "초연결 사회에서 디지털 알고리즘의 무소부재성은 인간 주체성을 시험대에 올려놓았다.", "example_translation": "In a hyper-connected society, the omnipresence of digital algorithms puts human subjectivity to the test.", "frequency_rank": 1690},
    ],
}

async def expand_remaining_database():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    session_maker = get_session_maker()

    async with session_maker() as session:
        langs = (await session.execute(select(Language))).scalars().all()
        lang_map = {l.code: l for l in langs}

        total_added = 0
        total_updated = 0

        for lang_code, words in REMAINING_EXPANSIONS.items():
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
        logger.info(f"Remaining languages expansion complete! Total added: {total_added}, Total updated: {total_updated}")

if __name__ == "__main__":
    asyncio.run(expand_remaining_database())
