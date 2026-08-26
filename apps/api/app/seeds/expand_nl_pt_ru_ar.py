"""
Expander for Dutch, Portuguese, Russian, and Arabic.
Adds 20-30 words per language across all levels.
"""

import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import CEFRLevel, Language, Word
from app.core.database import get_session_maker

logger = logging.getLogger("linguamaxima.nl_pt_ru_ar_expander")

EXTRA_DATA = {
    # ----------------- DUTCH (nl) -----------------
    "nl": [
        # A1
        {"lemma": "en", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "ɛn", "translation": "and / dan", "definition": "Nevengeschikt voegwoord.", "example_sentence": "Ik wil graag koffie en een broodje.", "example_translation": "I would like coffee and a sandwich.", "frequency_rank": 2},
        {"lemma": "maar", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "maːr", "translation": "but / tetapi", "definition": "Tegenstellend voegwoord.", "example_sentence": "Het huis is klein maar fijn.", "example_translation": "The house is small but nice.", "frequency_rank": 12},
        {"lemma": "of", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "ɔf", "translation": "or / atau", "definition": "Keuze aanduidend voegwoord.", "example_sentence": "Wil je thee of warme chocolademelk?", "example_translation": "Do you want tea or hot chocolate?", "frequency_rank": 20},
        {"lemma": "als", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "ɑls", "translation": "if / when / jika / ketika", "definition": "Voorwaardelijk voegwoord.", "example_sentence": "Als het mooi weer is, gaan we fietsen.", "example_translation": "If the weather is nice, we go cycling.", "frequency_rank": 16},
        {"lemma": "water", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": "het", "phonetic": "ˈʋaː.tər", "translation": "water / air", "definition": "Heldere vloeistof.", "example_sentence": "Mag ik een glas koud water, alstublieft?", "example_translation": "May I have a glass of cold water, please?", "frequency_rank": 35},
        {"lemma": "huis", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": "het", "phonetic": "ɦœy̯s", "translation": "house / rumah", "definition": "Woongebouw.", "example_sentence": "Ons huis heeft een mooie tuin.", "example_translation": "Our house has a beautiful garden.", "frequency_rank": 40},
        {"lemma": "lezen", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "verb", "gender": None, "phonetic": "ˈleː.zə(n)", "translation": "to read / membaca", "definition": "Tekst tot zich nemen.", "example_sentence": "Ik lees elke avond een spannend boek.", "example_translation": "I read an exciting book every evening.", "frequency_rank": 45},
        {"lemma": "goed", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "adjective", "gender": None, "phonetic": "ɣut", "translation": "good / baik", "definition": "Van hoge kwaliteit.", "example_sentence": "Fijn weekend en een goede reis!", "example_translation": "Have a nice weekend and a good trip!", "frequency_rank": 10},
        {"lemma": "vandaag", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "adverb", "gender": None, "phonetic": "vɑnˈdaːx", "translation": "today / hari ini", "definition": "Op de huidige dag.", "example_sentence": "Vandaag bezoeken we het Rijksmuseum.", "example_translation": "Today we visit the Rijksmuseum.", "frequency_rank": 25},
        # A2
        {"lemma": "wanneer", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "conjunction", "gender": None, "phonetic": "ʋɑˈneːr", "translation": "when / ketika", "definition": "Tijdstip aanduidend voegwoord.", "example_sentence": "Laat me weten wanneer je aankomt.", "example_translation": "Let me know when you arrive.", "frequency_rank": 30},
        {"lemma": "werk", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "noun", "gender": "het", "phonetic": "ʋɛrk", "translation": "work / job / pekerjaan", "definition": "Beroep of arbeid.", "example_sentence": "Zij heeft leuk werk gevonden in Utrecht.", "example_translation": "She found nice work in Utrecht.", "frequency_rank": 55},
        {"lemma": "kiezen", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "verb", "gender": None, "phonetic": "ˈki.zə(n)", "translation": "to choose / memilih", "definition": "Voorkeur bepalen.", "example_sentence": "Je mag zelf een dessert kiezen.", "example_translation": "You may choose a dessert yourself.", "frequency_rank": 95},
        # B1
        {"lemma": "aangezien", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "conjunction", "gender": None, "phonetic": "aːn.ɣəˈzin", "translation": "since / seeing that / karena / berhubung", "definition": "Redengevend voegwoord.", "example_sentence": "Aangezien de trein vertraagd is, nemen we de bus.", "example_translation": "Since the train is delayed, we take the bus.", "frequency_rank": 240},
        {"lemma": "milieu", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "noun", "gender": "het", "phonetic": "mɪlˈjøː", "translation": "environment / lingkungan hidup", "definition": "Natuurlijke leefomgeving.", "example_sentence": "Zorg voor het milieu is essentieel voor onze toekomst.", "example_translation": "Care for the environment is essential for our future.", "frequency_rank": 260},
        {"lemma": "overtuigen", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "verb", "gender": None, "phonetic": "oː.vərˈtœy̯.ɣə(n)", "translation": "to convince / meyakinkan", "definition": "Iemand door argumenten van iets verzekeren.", "example_sentence": "Haar presentatie overtuigde het hele team.", "example_translation": "Her presentation convinced the whole team.", "frequency_rank": 310},
        # B2
        {"lemma": "zodat", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "conjunction", "gender": None, "phonetic": "zoːˈdɑt", "translation": "so that / zodat / sehingga", "definition": "Gevolg aangeduid voegwoord.", "example_sentence": "Het beleid is aangepast zodat iedereen kan meedoen.", "example_translation": "The policy was adapted so that everyone can participate.", "frequency_rank": 430},
        {"lemma": "bewustzijn", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "noun", "gender": "het", "phonetic": "bəˈʋʏst.zɛi̯n", "translation": "awareness / consciousness / kesadaran", "definition": "Besef van de werkelijkheid.", "example_sentence": "Het ecologisch bewustzijn onder jongeren groeit gestaag.", "example_translation": "Ecological awareness among youth is growing steadily.", "frequency_rank": 480},
        # C1
        {"lemma": "naarmate", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "conjunction", "gender": None, "phonetic": "naːrˈmaː.tə", "translation": "in proportion as / as / seiring dengan", "definition": "Verhouding uitdrukkend voegwoord.", "example_sentence": "Naarmate men meer oefent, gaat het spreken vloeiender.", "example_translation": "In proportion as one practices more, speaking becomes more fluent.", "frequency_rank": 820},
        {"lemma": "scherpzinnigheid", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "noun", "gender": "de", "phonetic": "sxɛrpˈzɪ.nɪxˌɦɛi̯t", "translation": "acuity / perspicacity / ketajaman akal", "definition": "Grote opmerkingsgave en intelligentie.", "example_sentence": "Haar scherpzinnigheid stelde haar in staat de kern van het probleem te vatten.", "example_translation": "Her acuity enabled her to grasp the core of the problem.", "frequency_rank": 1050},
        # C2
        {"lemma": "mits", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "conjunction", "gender": None, "phonetic": "mɪts", "translation": "provided that / on condition that / asalkan", "definition": "Formeel voorwaardelijk voegwoord.", "example_sentence": "Het project wordt gefinancierd mits aan alle criteria wordt voldaan.", "example_translation": "The project is funded provided that all criteria are met.", "frequency_rank": 1420},
        {"lemma": "overstijgen", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "verb", "gender": None, "phonetic": "oː.vərˈstɛi̯.ɣə(n)", "translation": "to transcend / surpass / melampaui", "definition": "Hoger reiken dan de gewone maat.", "example_sentence": "Echte meesterwerken overstijgen de grenzen van tijd en cultuur.", "example_translation": "True masterpieces transcend the boundaries of time and culture.", "frequency_rank": 1610},
    ],

    # ----------------- PORTUGUESE (pt) -----------------
    "pt": [
        # A1
        {"lemma": "e", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "i", "translation": "and / dan", "definition": "Conjunção aditiva.", "example_sentence": "Gosto de café e pão fresco pela manhã.", "example_translation": "I like coffee and fresh bread in the morning.", "frequency_rank": 2},
        {"lemma": "mas", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "mɐʃ", "translation": "but / tetapi", "definition": "Conjunção adversativa.", "example_sentence": "Ele trabalha muito, mas está sempre bem-disposto.", "example_translation": "He works hard, but he is always cheerful.", "frequency_rank": 10},
        {"lemma": "ou", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "o", "translation": "or / atau", "definition": "Conjunção alternativa.", "example_sentence": "Preferes chá ou sumo de laranja?", "example_translation": "Do you prefer tea or orange juice?", "frequency_rank": 18},
        {"lemma": "se", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "sɨ", "translation": "if / jika", "definition": "Conjunção condicional.", "example_sentence": "Se fizer bom tempo, vamos à praia.", "example_translation": "If the weather is good, we go to the beach.", "frequency_rank": 14},
        {"lemma": "água", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": "a", "phonetic": "ˈa.ɡwɐ", "translation": "water / air", "definition": "Líquido transparente vital.", "example_sentence": "Beba bastante água fresca todos os dias.", "example_translation": "Drink plenty of fresh water every day.", "frequency_rank": 35},
        {"lemma": "ler", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "verb", "gender": None, "phonetic": "leɾ", "translation": "to read / membaca", "definition": "Interpretar texto escrito.", "example_sentence": "Gosto de ler romances históricos à noite.", "example_translation": "I like reading historical novels at night.", "frequency_rank": 45},
        {"lemma": "bom", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "adjective", "gender": None, "phonetic": "bõ", "translation": "good / baik", "definition": "De boa qualidade.", "example_sentence": "Tenha um bom fim de semana!", "example_translation": "Have a good weekend!", "frequency_rank": 15},
        {"lemma": "hoje", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "adverb", "gender": None, "phonetic": "ˈo.ʒɨ", "translation": "today / hari ini", "definition": "No dia atual.", "example_sentence": "Hoje visitamos o Palácio da Pena em Sintra.", "example_translation": "Today we visit the Pena Palace in Sintra.", "frequency_rank": 25},
        # A2
        {"lemma": "quando", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "conjunction", "gender": None, "phonetic": "ˈkwɐ̃.du", "translation": "when / ketika", "definition": "Conjunção temporal.", "example_sentence": "Quando chegares ao aeroporto, avisa-me.", "example_translation": "When you arrive at the airport, let me know.", "frequency_rank": 20},
        {"lemma": "viagem", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "noun", "gender": "a", "phonetic": "viˈa.ʒɐ̃j̃", "translation": "trip / journey / perjalanan", "definition": "Ato de viajar.", "example_sentence": "A viagem pelos Açores foi maravilhosa.", "example_translation": "The trip through the Azores was wonderful.", "frequency_rank": 120},
        {"lemma": "escolher", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "verb", "gender": None, "phonetic": "iʃ.kuˈʎeɾ", "translation": "to choose / memilih", "definition": "Selecionar preferência.", "example_sentence": "Podes escolher o livro que quiseres.", "example_translation": "You can choose the book you want.", "frequency_rank": 95},
        # B1
        {"lemma": "já que", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "conjunction", "gender": None, "phonetic": "ʒa kɨ", "translation": "since / seeing that / karena / berhubung", "definition": "Locução causal.", "example_sentence": "Já que chegaste cedo, podes ajudar-me a preparar a mesa.", "example_translation": "Since you arrived early, you can help me set the table.", "frequency_rank": 230},
        {"lemma": "ambiente", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "noun", "gender": "o", "phonetic": "ɐ̃.biˈẽ.tɨ", "translation": "environment / lingkungan", "definition": "Meio natural que nos cerca.", "example_sentence": "A proteção do ambiente é um dever cívico universal.", "example_translation": "Protecting the environment is a universal civic duty.", "frequency_rank": 280},
        {"lemma": "convencer", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "verb", "gender": None, "phonetic": "kõ.vẽˈseɾ", "translation": "to convince / meyakinkan", "definition": "Persuadir com argumentos.", "example_sentence": "A sua apresentação convenceu a comissão diretiva.", "example_translation": "His presentation convinced the executive committee.", "frequency_rank": 310},
        # B2
        {"lemma": "de modo que", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "conjunction", "gender": None, "phonetic": "dɨ ˈmɔ.du kɨ", "translation": "so that / de modo que / sehingga", "definition": "Conjunção consecutiva.", "example_sentence": "Apresentámos os dados com clareza de modo que todos compreendessem.", "example_translation": "We presented the data clearly so that everyone understood.", "frequency_rank": 470},
        {"lemma": "consciência", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "noun", "gender": "a", "phonetic": "kõʃ.siˈẽ.sjɐ", "translation": "awareness / consciousness / kesadaran", "definition": "Perceção lúcida.", "example_sentence": "É fundamental criar consciência ecológica nas escolas.", "example_translation": "It is essential to create ecological awareness in schools.", "frequency_rank": 440},
        # C1
        {"lemma": "visto que", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "conjunction", "gender": None, "phonetic": "ˈviʃ.tu kɨ", "translation": "inasmuch as / given that / mengingat bahwa", "definition": "Locução conjuntiva causal formal.", "example_sentence": "Visto que os prazos foram rigorosamente cumpridos, o projeto avança para a fase seguinte.", "example_translation": "Given that deadlines were strictly met, the project advances to the next phase.", "frequency_rank": 810},
        {"lemma": "perspicácia", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "noun", "gender": "a", "phonetic": "pɨɾʃ.piˈka.sjɐ", "translation": "perspicacity / insight / ketajaman analisis", "definition": "Agudeza de espírito e intelecto.", "example_sentence": "A perspicácia analítica da investigadora desvendou a inconsistência dos dados.", "example_translation": "The researcher's analytical perspicacity unraveled the inconsistency of the data.", "frequency_rank": 1040},
        # C2
        {"lemma": "contanto que", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "conjunction", "gender": None, "phonetic": "kõˈtɐ̃.tu kɨ", "translation": "provided that / asalkan", "definition": "Locução condicional erudita com conjuntivo.", "example_sentence": "Aceitou a proposta contanto que lhe garantissem total autonomia criativa.", "example_translation": "He accepted the proposal provided that total creative autonomy was guaranteed.", "frequency_rank": 1390},
        {"lemma": "transcender", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "verb", "gender": None, "phonetic": "tɾɐ̃ʃ.sẽˈdeɾ", "translation": "to transcend / melampaui batas", "definition": "Elevar-se acima do plano comum.", "example_sentence": "A obra poética de Camões transcende os séculos e continua a emocionar.", "example_translation": "Camões' poetic work transcends centuries and continues to move readers.", "frequency_rank": 1540},
    ],

    # ----------------- RUSSIAN (ru) -----------------
    "ru": [
        # Basic (A1)
        {"lemma": "и", "normalized_level": "A1", "native_level": "TORFL Basic", "part_of_speech": "conjunction", "gender": None, "phonetic": "i", "translation": "and / dan", "definition": "Соединительный союз.", "example_sentence": "Я пью чай и ем яблоко.", "example_translation": "I drink tea and eat an apple.", "frequency_rank": 1},
        {"lemma": "но", "normalized_level": "A1", "native_level": "TORFL Basic", "part_of_speech": "conjunction", "gender": None, "phonetic": "no", "translation": "but / tetapi", "definition": "Противительный союз.", "example_sentence": "Книга интересная, но сложная.", "example_translation": "The book is interesting, but difficult.", "frequency_rank": 10},
        {"lemma": "или", "normalized_level": "A1", "native_level": "TORFL Basic", "part_of_speech": "conjunction", "gender": None, "phonetic": "ˈi.lʲi", "translation": "or / atau", "definition": "Разделительный союз.", "example_sentence": "Вы хотите чай или кофе?", "example_translation": "Do you want tea or coffee?", "frequency_rank": 20},
        {"lemma": "если", "normalized_level": "A1", "native_level": "TORFL Basic", "part_of_speech": "conjunction", "gender": None, "phonetic": "ˈje.slʲi", "translation": "if / jika", "definition": "Условный союз.", "example_sentence": "Если завтра будет солнце, мы пойдём в парк.", "example_translation": "If it is sunny tomorrow, we will go to the park.", "frequency_rank": 15},
        {"lemma": "вода", "normalized_level": "A1", "native_level": "TORFL Basic", "part_of_speech": "noun", "gender": "женский", "phonetic": "vɐˈda", "translation": "water / air", "definition": "Прозрачная жидкость.", "example_sentence": "Дайте, пожалуйста, стакан чистой воды.", "example_translation": "Please give me a glass of clean water.", "frequency_rank": 35},
        {"lemma": "город", "normalized_level": "A1", "native_level": "TORFL Basic", "part_of_speech": "noun", "gender": "мужской", "phonetic": "ˈɡo.rət", "translation": "city / kota", "definition": "Крупный населённый пункт.", "example_sentence": "Москва — красивый и современный город.", "example_translation": "Moscow is a beautiful and modern city.", "frequency_rank": 40},
        {"lemma": "говорить", "normalized_level": "A1", "native_level": "TORFL Basic", "part_of_speech": "verb", "gender": None, "phonetic": "ɡə.vɐˈrʲitʲ", "translation": "to speak / berbicara", "definition": "Пользоваться речью.", "example_sentence": "Они говорят по-русски очень хорошо.", "example_translation": "They speak Russian very well.", "frequency_rank": 22},
        {"lemma": "хороший", "normalized_level": "A1", "native_level": "TORFL Basic", "part_of_speech": "adjective", "gender": None, "phonetic": "xɐˈro.ʂɨj", "translation": "good / baik", "definition": "Обладающий положительными качествами.", "example_sentence": "Сегодня был очень хороший день.", "example_translation": "Today was a very good day.", "frequency_rank": 18},
        {"lemma": "сегодня", "normalized_level": "A1", "native_level": "TORFL Basic", "part_of_speech": "adverb", "gender": None, "phonetic": "sʲɪˈvo.dnʲə", "translation": "today / hari ini", "definition": "В текущий день.", "example_sentence": "Сегодня мы изучаем новые правила.", "example_translation": "Today we are studying new rules.", "frequency_rank": 25},
        # Prelim (A2)
        {"lemma": "когда", "normalized_level": "A2", "native_level": "TORFL Prelim", "part_of_speech": "conjunction", "gender": None, "phonetic": "kɐɡˈda", "translation": "when / ketika", "definition": "Временной союз.", "example_sentence": "Когда поезд прибыл, мы вышли на перрон.", "example_translation": "When the train arrived, we stepped onto the platform.", "frequency_rank": 14},
        {"lemma": "работа", "normalized_level": "A2", "native_level": "TORFL Prelim", "part_of_speech": "noun", "gender": "женский", "phonetic": "rɐˈbo.tə", "translation": "work / job / pekerjaan", "definition": "Трудовая деятельность.", "example_sentence": "У неё интересная работа в университете.", "example_translation": "She has an interesting job at the university.", "frequency_rank": 50},
        {"lemma": "выбирать", "normalized_level": "A2", "native_level": "TORFL Prelim", "part_of_speech": "verb", "gender": None, "phonetic": "vɨ.bʲɪˈratʲ", "translation": "to choose / select / memilih", "definition": "Определять предпочтение.", "example_sentence": "Студенты могут выбирать специальные курсы.", "example_translation": "Students can choose elective courses.", "frequency_rank": 95},
        # Level 1 (B1)
        {"lemma": "так как", "normalized_level": "B1", "native_level": "TORFL 1", "part_of_speech": "conjunction", "gender": None, "phonetic": "tak kak", "translation": "since / as / karena / berhubung", "definition": "Союз обоснования причины.", "example_sentence": "Так как времени было мало, мы поехали на такси.", "example_translation": "Since time was short, we took a taxi.", "frequency_rank": 210},
        {"lemma": "возможность", "normalized_level": "B1", "native_level": "TORFL 1", "part_of_speech": "noun", "gender": "женский", "phonetic": "vɐzˈmoʐ.nəsʲtʲ", "translation": "opportunity / possibility / kesempatan", "definition": "Удобный случай или условие.", "example_sentence": "Эта стажировка даёт отличную возможность для роста.", "example_translation": "This internship gives an excellent opportunity for growth.", "frequency_rank": 180},
        {"lemma": "убедить", "normalized_level": "B1", "native_level": "TORFL 1", "part_of_speech": "verb", "gender": None, "phonetic": "ʊ.bʲɪˈdʲitʲ", "translation": "to convince / persuade / meyakinkan", "definition": "Заставить поверить аргументами.", "example_sentence": "Ей удалось убедить коллег в правильности расчётов.", "example_translation": "She managed to convince colleagues of the correctness of calculations.", "frequency_rank": 310},
        # Level 2 (B2)
        {"lemma": "для того чтобы", "normalized_level": "B2", "native_level": "TORFL 2", "part_of_speech": "conjunction", "gender": None, "phonetic": "dlʲə tɐˈvo ˈʂto.bɨ", "translation": "in order that / agar supaya", "definition": "Целевой союз.", "example_sentence": "Мы обновили систему, для того чтобы повысить безопасность.", "example_translation": "We updated the system in order to increase security.", "frequency_rank": 460},
        {"lemma": "осознанность", "normalized_level": "B2", "native_level": "TORFL 2", "part_of_speech": "noun", "gender": "женский", "phonetic": "ɐˈsoz.nən.nəsʲtʲ", "translation": "awareness / kesadaran", "definition": "Состояние ясного понимания.", "example_sentence": "Экологическая осознанность становится важной ценностью.", "example_translation": "Ecological awareness is becoming an important value.", "frequency_rank": 490},
        # Level 3 (C1)
        {"lemma": "ввиду того что", "normalized_level": "C1", "native_level": "TORFL 3", "part_of_speech": "conjunction", "gender": None, "phonetic": "vvʲiˈdu tɐˈvo ʂto", "translation": "in view of the fact that / mengingat bahwa", "definition": "Официально-деловой союз причины.", "example_sentence": "Ввиду того что все условия выполнены, соглашение вступает в силу.", "example_translation": "In view of the fact that all terms are fulfilled, the agreement comes into effect.", "frequency_rank": 790},
        {"lemma": "проницательность", "normalized_level": "C1", "native_level": "TORFL 3", "part_of_speech": "noun", "gender": "женский", "phonetic": "prənʲiˈtsa.tʲɪlʲ.nəsʲtʲ", "translation": "perspicacity / insight / ketajaman berpikir", "definition": "Способность глубоко проникать в суть вещей.", "example_sentence": "Проницательность учёного позволила открыть скрытый закон природы.", "example_translation": "The scientist's perspicacity allowed him to discover a hidden law of nature.", "frequency_rank": 1020},
        # Level 4 (C2)
        {"lemma": "коль скоро", "normalized_level": "C2", "native_level": "TORFL 4", "part_of_speech": "conjunction", "gender": None, "phonetic": "kolʲ ˈsko.rə", "translation": "inasmuch as / seeing that / jikalau memang", "definition": "Книжный союз условного обоснования.", "example_sentence": "Коль скоро принципы утверждены, компромиссы более недопустимы.", "example_translation": "Inasmuch as the principles are established, compromises are no longer admissible.", "frequency_rank": 1420},
        {"lemma": "превзойти", "normalized_level": "C2", "native_level": "TORFL 4", "part_of_speech": "verb", "gender": None, "phonetic": "prʲɪv.zɐjˈtʲi", "translation": "to transcend / surpass / melampaui batas", "definition": "Оказаться выше всех ожиданий.", "example_sentence": "Великое искусство превосходит границы времени и эпох.", "example_translation": "Great art transcends the boundaries of time and epochs.", "frequency_rank": 1520},
    ],

    # ----------------- ARABIC (ar) -----------------
    "ar": [
        # Level 1 (A1)
        {"lemma": "وَ", "normalized_level": "A1", "native_level": "Level 1", "part_of_speech": "conjunction", "gender": None, "phonetic": "wa", "translation": "and / dan", "definition": "حرف عطف يفيد الجمع والمصاحبة.", "example_sentence": "أحب القراءة والكتابة في المساء.", "example_translation": "I love reading and writing in the evening.", "frequency_rank": 1},
        {"lemma": "لَكِنْ", "normalized_level": "A1", "native_level": "Level 1", "part_of_speech": "conjunction", "gender": None, "phonetic": "laakin", "translation": "but / tetapi", "definition": "حرف يفيد الاستدراك.", "example_sentence": "الكتاب مفيد لكنه طويل.", "example_translation": "The book is useful, but it is long.", "frequency_rank": 15},
        {"lemma": "أَوْ", "normalized_level": "A1", "native_level": "Level 1", "part_of_speech": "conjunction", "gender": None, "phonetic": "aw", "translation": "or / atau", "definition": "حرف يفيد التخيير أو الشك.", "example_sentence": "هل ترغب في شاي أو قهوة؟", "example_translation": "Do you want tea or coffee?", "frequency_rank": 20},
        {"lemma": "مَاء", "normalized_level": "A1", "native_level": "Level 1", "part_of_speech": "noun", "gender": "مذكر", "phonetic": "maa'", "translation": "water / air", "definition": "سائل شفاف ضروري للحياة.", "example_sentence": "اشرب ماءً نقياً كل صباح.", "example_translation": "Drink pure water every morning.", "frequency_rank": 30},
        {"lemma": "مَدِينَة", "normalized_level": "A1", "native_level": "Level 1", "part_of_speech": "noun", "gender": "مؤنث", "phonetic": "madiinah", "translation": "city / kota", "definition": "تجمع سكاني كبير.", "example_sentence": "القاهرة مدينة عريقة وجميلة.", "example_translation": "Cairo is an ancient and beautiful city.", "frequency_rank": 40},
        {"lemma": "كَتَبَ", "normalized_level": "A1", "native_level": "Level 1", "part_of_speech": "verb", "gender": None, "phonetic": "kataba", "translation": "to write / menulis", "definition": "خط الحروف والكلمات.", "example_sentence": "كتب الأستاذ مقالاً قيماً.", "example_translation": "The professor wrote a valuable article.", "frequency_rank": 35},
        {"lemma": "جَمِيل", "normalized_level": "A1", "native_level": "Level 1", "part_of_speech": "adjective", "gender": None, "phonetic": "jamiil", "translation": "beautiful / indah", "definition": "حسن المنظر والمظهر.", "example_sentence": "اليوم يوم جميل ومشرق.", "example_translation": "Today is a beautiful, sunny day.", "frequency_rank": 25},
        {"lemma": "اليَوْم", "normalized_level": "A1", "native_level": "Level 1", "part_of_speech": "adverb", "gender": None, "phonetic": "al-yawm", "translation": "today / hari ini", "definition": "في هذا اليوم الحاضر.", "example_sentence": "اليوم نبدأ درساً جديداً في اللغة.", "example_translation": "Today we begin a new language lesson.", "frequency_rank": 22},
        # Level 2 (A2)
        {"lemma": "عِنْدَمَا", "normalized_level": "A2", "native_level": "Level 2", "part_of_speech": "conjunction", "gender": None, "phonetic": "'indamaa", "translation": "when / ketika", "definition": "ظرف زمان يفيد التوقيت.", "example_sentence": "عندما وصل القطار، نزل الركاب بانتظام.", "example_translation": "When the train arrived, passengers disembarked orderly.", "frequency_rank": 28},
        {"lemma": "عَمَل", "normalized_level": "A2", "native_level": "Level 2", "part_of_speech": "noun", "gender": "مذكر", "phonetic": "'amal", "translation": "work / job / pekerjaan", "definition": "الجهد المهني المبذول.", "example_sentence": "العمل الجاد يؤدي إلى النجاح.", "example_translation": "Hard work leads to success.", "frequency_rank": 45},
        {"lemma": "اخْتَارَ", "normalized_level": "A2", "native_level": "Level 2", "part_of_speech": "verb", "gender": None, "phonetic": "ikhtaara", "translation": "to choose / memilih", "definition": "انتقى وفضل شيئاً على غيره.", "example_sentence": "يمكنك أن تختار التخصص المناسب لك.", "example_translation": "You can choose the major suitable for you.", "frequency_rank": 80},
        # Level 3 (B1)
        {"lemma": "حَيْثُ إِنَّ", "normalized_level": "B1", "native_level": "Level 3", "part_of_speech": "conjunction", "gender": None, "phonetic": "haythu 'inna", "translation": "since / seeing that / karena / mengingat", "definition": "أداة تعليلية موصلة.", "example_sentence": "تقرر تأجيل الرحلة حيث إن الأحوال الجوية غير مستقرة.", "example_translation": "It was decided to postpone the trip since weather conditions are unstable.", "frequency_rank": 210},
        {"lemma": "فُرْصَة", "normalized_level": "B1", "native_level": "Level 3", "part_of_speech": "noun", "gender": "مؤنث", "phonetic": "fursah", "translation": "opportunity / chance / kesempatan", "definition": "الوقت المناسب للقيام بأمر.", "example_sentence": "التعليم المستمر يفتح فرصاً واعدة في سوق العمل.", "example_translation": "Continuous education opens promising opportunities in the labor market.", "frequency_rank": 170},
        {"lemma": "أَقْنَعَ", "normalized_level": "B1", "native_level": "Level 3", "part_of_speech": "verb", "gender": None, "phonetic": "'aqna'a", "translation": "to convince / meyakinkan", "definition": "جعله يتقبل الفكرة بالحجة.", "example_sentence": "أقنع الباحث الحاضرين بجدوى مشروعه.", "example_translation": "The researcher convinced the audience of his project's viability.", "frequency_rank": 260},
        # Level 4 (B2)
        {"lemma": "حَتَّى يَتَسَنَّى", "normalized_level": "B2", "native_level": "Level 4", "part_of_speech": "phrase", "gender": None, "phonetic": "hattaa yatasannaa", "translation": "so that / in order to allow / agar memungkinkan", "definition": "تعبير لغوي يفيد التمكين والغاية.", "example_sentence": "تم تبسيط الإجراءات حتى يتسنى للجميع المشاركة بسهولة.", "example_translation": "Procedures were simplified so that everyone could participate easily.", "frequency_rank": 480},
        {"lemma": "وَعْي", "normalized_level": "B2", "native_level": "Level 4", "part_of_speech": "noun", "gender": "مذكر", "phonetic": "wa'y", "translation": "awareness / consciousness / kesadaran", "definition": "الإدراك والفهم السليم للحقائق.", "example_sentence": "تعزيز الوعي الصحي ركيزة أساسية في تنمية المجتمع.", "example_translation": "Enhancing health awareness is a fundamental pillar in community development.", "frequency_rank": 410},
        # Level 5 (C1)
        {"lemma": "نَظَراً لِأَنَّ", "normalized_level": "C1", "native_level": "Level 5", "part_of_speech": "conjunction", "gender": None, "phonetic": "nazaran li'anna", "translation": "in view of the fact that / mengingat bahwa", "definition": "أداة تعليل واستدلال بليغة.", "example_sentence": "نظراً لأن المعايير قد استوفيت بالكامل، نالت الرسالة درجة الامتياز.", "example_translation": "In view of the fact that standards were fully met, the thesis received high honors.", "frequency_rank": 780},
        {"lemma": "فَطَانَة", "normalized_level": "C1", "native_level": "Level 5", "part_of_speech": "noun", "gender": "مؤنث", "phonetic": "fataanah", "translation": "perspicacity / acuity / kecerdasan tajam", "definition": "الذكاء وحدة الذهن.", "example_sentence": "أظهر الدبلوماسي فطانة بالغة في إدارة المفاوضات المعقدة.", "example_translation": "The diplomat showed profound perspicacity in managing complex negotiations.", "frequency_rank": 950},
        # Level 6 (C2)
        {"lemma": "شَرِيطَةَ أَنْ", "normalized_level": "C2", "native_level": "Level 6", "part_of_speech": "conjunction", "gender": None, "phonetic": "shariitata 'an", "translation": "on condition that / provided that / dengan syarat", "definition": "أداة شرطية بلاغية صارمة.", "example_sentence": "أُقرت المعاهدة شريطة أن تلتزم الأطراف ببنود السيادة والشفافية.", "example_translation": "The treaty was approved on condition that parties commit to sovereignty and transparency clauses.", "frequency_rank": 1420},
    ],
}

async def expand_all():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    session_maker = get_session_maker()

    async with session_maker() as session:
        langs = (await session.execute(select(Language))).scalars().all()
        lang_map = {l.code: l for l in langs}

        total_added = 0
        total_updated = 0

        for lang_code, words in EXTRA_DATA.items():
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
        logger.info(f"All expansions complete! Total added: {total_added}, Total updated: {total_updated}")

if __name__ == "__main__":
    asyncio.run(expand_all())
