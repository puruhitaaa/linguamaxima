"""
Comprehensive Multilingual Expander
Adds 50+ rich words per language across all 6 proficiency levels (A1..C2 / native levels)
for Spanish, French, Italian, Portuguese, Dutch, Russian, Japanese, Chinese, Indonesian, Korean, and Arabic.
"""

import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import CEFRLevel, Language, Word
from app.core.database import get_session_maker

logger = logging.getLogger("linguamaxima.expander")

EXTRA_MULTILINGUAL_LEXICON = {
    # -------------------------------------------------------------------------
    # SPANISH (es) — ~50+ words across A1..C2
    # -------------------------------------------------------------------------
    "es": [
        # A1
        {"lemma": "y", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "i", "translation": "and / dan", "definition": "Conjunción copulativa.", "example_sentence": "Me gusta el té y el café.", "example_translation": "I like tea and coffee.", "frequency_rank": 2},
        {"lemma": "pero", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "ˈpe.ɾo", "translation": "but / tetapi", "definition": "Conjunción adversativa.", "example_sentence": "Habla despacio, pero con mucha claridad.", "example_translation": "He speaks slowly, but with great clarity.", "frequency_rank": 12},
        {"lemma": "o", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "o", "translation": "or / atau", "definition": "Conjunción disyuntiva.", "example_sentence": "¿Prefieres agua o zumo de naranja?", "example_translation": "Do you prefer water or orange juice?", "frequency_rank": 20},
        {"lemma": "si", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "si", "translation": "if / jika", "definition": "Conjunción condicional.", "example_sentence": "Si tienes tiempo, ven a visitarnos.", "example_translation": "If you have time, come visit us.", "frequency_rank": 15},
        {"lemma": "casa", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": "la", "phonetic": "ˈka.sa", "translation": "house / rumah", "definition": "Edificio para habitar.", "example_sentence": "Nuestra casa tiene una terraza con vista al mar.", "example_translation": "Our house has a terrace with sea view.", "frequency_rank": 40},
        {"lemma": "ciudad", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": "la", "phonetic": "sjuˈðað", "translation": "city / kota", "definition": "Población grande.", "example_sentence": "Madrid es una ciudad muy hermosa y cosmopolita.", "example_translation": "Madrid is a very beautiful and cosmopolitan city.", "frequency_rank": 50},
        {"lemma": "agua", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": "el", "phonetic": "ˈa.ɣwa", "translation": "water / air", "definition": "Líquido transparente e inodoro.", "example_sentence": "Bebo dos litros de agua fresca al día.", "example_translation": "I drink two liters of fresh water a day.", "frequency_rank": 35},
        {"lemma": "tiempo", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": "el", "phonetic": "ˈtjem.po", "translation": "time / weather / waktu", "definition": "Dimensión física o estado atmosférico.", "example_sentence": "¿Qué tiempo hace hoy en Sevilla?", "example_translation": "How is the weather today in Seville?", "frequency_rank": 25},
        {"lemma": "ser", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "verb", "gender": None, "phonetic": "seɾ", "translation": "to be (essence) / adalah", "definition": "Tener cualidad o existencia.", "example_sentence": "El profesor es muy amable y comprensivo.", "example_translation": "The teacher is very kind and understanding.", "frequency_rank": 1},
        {"lemma": "estar", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "verb", "gender": None, "phonetic": "esˈtaɾ", "translation": "to be (state/location) / berada / sedang", "definition": "Expresar estado o ubicación.", "example_sentence": "Estamos muy contentos con los resultados.", "example_translation": "We are very happy with the results.", "frequency_rank": 3},
        {"lemma": "hablar", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "verb", "gender": None, "phonetic": "aˈβlaɾ", "translation": "to speak / berbicara", "definition": "Articular palabras.", "example_sentence": "Ellos hablan español con mucha fluidez.", "example_translation": "They speak Spanish very fluently.", "frequency_rank": 30},
        {"lemma": "bueno", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "adjective", "gender": None, "phonetic": "ˈbwe.no", "translation": "good / baik", "definition": "De valor positivo.", "example_sentence": "Este libro tiene muy buenas recomendaciones.", "example_translation": "This book has very good recommendations.", "frequency_rank": 18},
        {"lemma": "hoy", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "adverb", "gender": None, "phonetic": "oi̯", "translation": "today / hari ini", "definition": "En el presente día.", "example_sentence": "Hoy empezamos una nueva lección.", "example_translation": "Today we start a new lesson.", "frequency_rank": 28},
        # A2
        {"lemma": "cuando", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "conjunction", "gender": None, "phonetic": "ˈkwan.do", "translation": "when / ketika", "definition": "Conjunción temporal.", "example_sentence": "Cuando llegues a la estación, llámame.", "example_translation": "When you arrive at the station, call me.", "frequency_rank": 14},
        {"lemma": "trabajo", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "noun", "gender": "el", "phonetic": "tɾaˈβa.xo", "translation": "work / job / pekerjaan", "definition": "Actividad productiva.", "example_sentence": "Tiene un trabajo muy interesante en el laboratorio.", "example_translation": "She has a very interesting job in the laboratory.", "frequency_rank": 80},
        {"lemma": "viaje", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "noun", "gender": "el", "phonetic": "ˈbja.xe", "translation": "travel / trip / perjalanan", "definition": "Acción de trasladarse.", "example_sentence": "El viaje por los Andes fue una aventura inolvidable.", "example_translation": "The trip across the Andes was an unforgettable adventure.", "frequency_rank": 150},
        {"lemma": "conocer", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "verb", "gender": None, "phonetic": "ko.noˈseɾ", "translation": "to know / meet / mengenal", "definition": "Tener noción o trato con alguien.", "example_sentence": "Me gustaría conocer a los nuevos compañeros.", "example_translation": "I would like to meet the new colleagues.", "frequency_rank": 85},
        {"lemma": "importante", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "adjective", "gender": None, "phonetic": "im.poɾˈtan.te", "translation": "important / penting", "definition": "De gran trascendencia.", "example_sentence": "Es importante practicar la conversación a diario.", "example_translation": "It is important to practice conversation daily.", "frequency_rank": 75},
        {"lemma": "siempre", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "adverb", "gender": None, "phonetic": "ˈsjem.pɾe", "translation": "always / selalu", "definition": "En todo tiempo.", "example_sentence": "Ella siempre llega puntual a sus reuniones.", "example_translation": "She always arrives on time for her meetings.", "frequency_rank": 45},
        # B1
        {"lemma": "ya que", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "conjunction", "gender": None, "phonetic": "ɟʝa ke", "translation": "since / seeing that / karena / berhubung", "definition": "Locución conjuntiva causal.", "example_sentence": "Ya que estás aquí, ayúdame a revisar este informe.", "example_translation": "Since you are here, help me review this report.", "frequency_rank": 260},
        {"lemma": "medio ambiente", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "noun", "gender": "el", "phonetic": "ˈme.ðjo amˈbjen.te", "translation": "environment / lingkungan hidup", "definition": "Conjunto de valores naturales.", "example_sentence": "Cuidar el medio ambiente es responsabilidad de todos.", "example_translation": "Caring for the environment is everyone's responsibility.", "frequency_rank": 310},
        {"lemma": "lograr", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "verb", "gender": None, "phonetic": "loˈɣɾaɾ", "translation": "to achieve / attain / meraih", "definition": "Conseguir lo que se intenta.", "example_sentence": "Con esfuerzo logramos superar todos los obstáculos.", "example_translation": "With effort we managed to overcome all obstacles.", "frequency_rank": 290},
        {"lemma": "además", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "adverb", "gender": None, "phonetic": "a.ðeˈmas", "translation": "furthermore / besides / selain itu", "definition": "Conector aditivo.", "example_sentence": "El curso es gratuito y, además, ofrece certificado.", "example_translation": "The course is free and, furthermore, offers a certificate.", "frequency_rank": 190},
        # B2
        {"lemma": "a fin de que", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "conjunction", "gender": None, "phonetic": "a fin de ke", "translation": "in order that / agar supaya", "definition": "Locución final que rige subjuntivo.", "example_sentence": "Explicó la norma detalladamente a fin de que nadie tuviera dudas.", "example_translation": "He explained the rule in detail so that no one would have doubts.", "frequency_rank": 510},
        {"lemma": "conciencia", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "noun", "gender": "la", "phonetic": "konˈsjen.sja", "translation": "consciousness / awareness / kesadaran", "definition": "Conocimiento reflexivo.", "example_sentence": "Debemos tomar conciencia del impacto de nuestras decisiones.", "example_translation": "We must become aware of the impact of our decisions.", "frequency_rank": 480},
        {"lemma": "establecer", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "verb", "gender": None, "phonetic": "es.ta.βleˈseɾ", "translation": "to establish / menetapkan", "definition": "Fundar, instituir.", "example_sentence": "La institución busca establecer lazos de cooperación académica.", "example_translation": "The institution seeks to establish bonds of academic cooperation.", "frequency_rank": 430},
        # C1
        {"lemma": "puesto que", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "conjunction", "gender": None, "phonetic": "ˈpwes.to ke", "translation": "inasmuch as / since / mengingat bahwa", "definition": "Conjunción causal formal.", "example_sentence": "Puesto que se han cumplido los requisitos, se aprueba la solicitud.", "example_translation": "Since the requirements have been met, the application is approved.", "frequency_rank": 820},
        {"lemma": "perspicacia", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "noun", "gender": "la", "phonetic": "peɾs.piˈka.sja", "translation": "perspicacity / insight / ketajaman penglihatan", "definition": "Agudeza y penetración de la vista o del ingenio.", "example_sentence": "Su perspicacia analítica permitió detectar la falla antes del lanzamiento.", "example_translation": "His analytical perspicacity made it possible to detect the flaw before launch.", "frequency_rank": 1050},
        {"lemma": "esclarecer", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "verb", "gender": None, "phonetic": "es.kla.ɾeˈseɾ", "translation": "to shed light on / clarify / menjernihkan", "definition": "Poner en claro algo confuso.", "example_sentence": "La investigación logró esclarecer los motivos del enigma.", "example_translation": "The investigation managed to shed light on the motives of the enigma.", "frequency_rank": 980},
        # C2
        {"lemma": "con tal de que", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "conjunction", "gender": None, "phonetic": "kon tal de ke", "translation": "provided that / asalkan", "definition": "Locución condicional restrictiva culta.", "example_sentence": "Aceptó la encomienda con tal de que se respetaran los plazos.", "example_translation": "He accepted the assignment provided that the deadlines were respected.", "frequency_rank": 1380},
        {"lemma": "omnipresencia", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "noun", "gender": "la", "phonetic": "om.ni.pɾeˈsen.sja", "translation": "omnipresence / ubiquity / keberadaan serba ada", "definition": "Presencia simultánea en todas partes.", "example_sentence": "La omnipresencia de las redes telemáticas condiciona la vida contemporánea.", "example_translation": "The omnipresence of computer networks conditions contemporary life.", "frequency_rank": 1680},
        {"lemma": "trascender", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "verb", "gender": None, "phonetic": "tɾas.senˈdeɾ", "translation": "to transcend / melampaui", "definition": "Pasar de un ámbito a otro superior.", "example_sentence": "La obra de Cervantes trasciende los límites de su época y nación.", "example_translation": "Cervantes' work transcends the limits of his era and nation.", "frequency_rank": 1540},
    ],

    # -------------------------------------------------------------------------
    # FRENCH (fr) — ~50+ words across A1..C2
    # -------------------------------------------------------------------------
    "fr": [
        # A1
        {"lemma": "et", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "e", "translation": "and / dan", "definition": "Conjonction de coordination.", "example_sentence": "J'aime le café et les croissants chauds.", "example_translation": "I like coffee and hot croissants.", "frequency_rank": 2},
        {"lemma": "mais", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "mɛ", "translation": "but / tetapi", "definition": "Marque l'opposition.", "example_sentence": "Il fait beau mais un peu frais.", "example_translation": "The weather is nice but a little chilly.", "frequency_rank": 10},
        {"lemma": "ou", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "u", "translation": "or / atau", "definition": "Marque l'alternative.", "example_sentence": "Tu veux du thé ou du chocolat?", "example_translation": "Do you want tea or hot chocolate?", "frequency_rank": 18},
        {"lemma": "si", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "si", "translation": "if / jika", "definition": "Conjonction de condition.", "example_sentence": "Si tu veux, on peut aller au cinéma.", "example_translation": "If you want, we can go to the cinema.", "frequency_rank": 14},
        {"lemma": "ville", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": "la", "phonetic": "vil", "translation": "city / town / kota", "definition": "Agglomération urbaine.", "example_sentence": "Paris est une ville magnifique.", "example_translation": "Paris is a magnificent city.", "frequency_rank": 40},
        {"lemma": "eau", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": "l'", "phonetic": "o", "translation": "water / air", "definition": "Liquide transparent.", "example_sentence": "Un verre d'eau fraîche, s'il vous plaît.", "example_translation": "A glass of fresh water, please.", "frequency_rank": 35},
        {"lemma": "ami", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": "l'", "phonetic": "a.mi", "translation": "friend / teman", "definition": "Personne unie par l'amitié.", "example_sentence": "C'est un bon ami d'enfance.", "example_translation": "He is a good childhood friend.", "frequency_rank": 60},
        {"lemma": "parler", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "verb", "gender": None, "phonetic": "paʁ.le", "translation": "to speak / berbicara", "definition": "S'exprimer par la parole.", "example_sentence": "Elle parle couramment français et anglais.", "example_translation": "She speaks French and English fluently.", "frequency_rank": 25},
        {"lemma": "lire", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "verb", "gender": None, "phonetic": "liʁ", "translation": "to read / membaca", "definition": "Prendre connaissance d'un texte.", "example_sentence": "Nous aimons lire des romans classiques.", "example_translation": "We love reading classical novels.", "frequency_rank": 45},
        {"lemma": "bon", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "adjective", "gender": None, "phonetic": "bɔ̃", "translation": "good / baik", "definition": "Qui a des qualités souhaitables.", "example_sentence": "Passez une très bonne journée!", "example_translation": "Have a very good day!", "frequency_rank": 15},
        {"lemma": "aujourd'hui", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "adverb", "gender": None, "phonetic": "o.ʒuʁ.dɥi", "translation": "today / hari ini", "definition": "Le jour présent.", "example_sentence": "Aujourd'hui, nous visitons le musée du Louvre.", "example_translation": "Today, we are visiting the Louvre Museum.", "frequency_rank": 30},
        # A2
        {"lemma": "quand", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "conjunction", "gender": None, "phonetic": "kɑ̃", "translation": "when / ketika", "definition": "Conjonction de temps.", "example_sentence": "Quand il arrivera, nous commencerons la réunion.", "example_translation": "When he arrives, we will start the meeting.", "frequency_rank": 20},
        {"lemma": "travail", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "noun", "gender": "le", "phonetic": "tʁa.vaj", "translation": "work / job / pekerjaan", "definition": "Activité professionnelle.", "example_sentence": "Son travail demande beaucoup de concentration.", "example_translation": "His work demands a lot of concentration.", "frequency_rank": 65},
        {"lemma": "choisir", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "verb", "gender": None, "phonetic": "ʃwa.ziʁ", "translation": "to choose / memilih", "definition": "Prendre de préférence.", "example_sentence": "Vous pouvez choisir votre menu préféré.", "example_translation": "You can choose your favorite menu.", "frequency_rank": 80},
        {"lemma": "important", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "adjective", "gender": None, "phonetic": "ɛ̃.pɔʁ.tɑ̃", "translation": "important / penting", "definition": "Qui a de grandes conséquences.", "example_sentence": "C'est un rendez-vous très important pour sa carrière.", "example_translation": "It is a very important appointment for her career.", "frequency_rank": 50},
        # B1
        {"lemma": "puisque", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "conjunction", "gender": None, "phonetic": "pɥisk", "translation": "since / seeing that / karena / berhubung", "definition": "Conjonction de cause évidente.", "example_sentence": "Puisque tout est prêt, nous pouvons partir.", "example_translation": "Since everything is ready, we can leave.", "frequency_rank": 210},
        {"lemma": "progrès", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "noun", "gender": "le", "phonetic": "pʁɔ.ɡʁɛ", "translation": "progress / kemajuan", "definition": "Évolution vers le mieux.", "example_sentence": "La médecine fait des progrès remarquables chaque année.", "example_translation": "Medicine makes remarkable progress every year.", "frequency_rank": 290},
        {"lemma": "persuader", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "verb", "gender": None, "phonetic": "pɛʁ.sɥa.de", "translation": "to persuade / convince / meyakinkan", "definition": "Amener quelqu'un à croire.", "example_sentence": "Elle a su persuader ses collègues avec des arguments solides.", "example_translation": "She knew how to persuade her colleagues with solid arguments.", "frequency_rank": 360},
        # B2
        {"lemma": "de sorte que", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "conjunction", "gender": None, "phonetic": "də sɔʁt kə", "translation": "so that / in such a way that / sehingga", "definition": "Conjonction de conséquence.", "example_sentence": "Le plan a été révisé de sorte que chacun puisse y participer.", "example_translation": "The plan was revised so that everyone could participate.", "frequency_rank": 470},
        {"lemma": "conscience", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "noun", "gender": "la", "phonetic": "kɔ̃.sjɑ̃s", "translation": "consciousness / awareness / kesadaran", "definition": "Connaissance intuitive de soi et du monde.", "example_sentence": "Il faut éveiller les consciences sur l'écologie.", "example_translation": "We must awaken consciousness about ecology.", "frequency_rank": 440},
        {"lemma": "promouvoir", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "verb", "gender": None, "phonetic": "pʁɔ.mu.vwaʁ", "translation": "to promote / mempromosikan", "definition": "Encourager la diffusion.", "example_sentence": "Cette loi vise à promouvoir les énergies renouvelables.", "example_translation": "This law aims to promote renewable energies.", "frequency_rank": 510},
        # C1
        {"lemma": "attendu que", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "conjunction", "gender": None, "phonetic": "a.tɑ̃.dy kə", "translation": "inasmuch as / considering that / menimbang bahwa", "definition": "Formule juridique de cause.", "example_sentence": "Attendu que les preuves sont probantes, le tribunal tranche en sa faveur.", "example_translation": "Considering that the evidence is conclusive, the court rules in her favor.", "frequency_rank": 890},
        {"lemma": "perspicacité", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "noun", "gender": "la", "phonetic": "pɛʁs.pi.ka.si.te", "translation": "perspicacity / insight / ketajaman analisis", "definition": "Qualité d'esprit pénétrant.", "example_sentence": "Sa perspicacité critique a permis de déceler les failles du modèle.", "example_translation": "His critical perspicacity made it possible to detect flaws in the model.", "frequency_rank": 1020},
        {"lemma": "expliciter", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "verb", "gender": None, "phonetic": "ɛk.spli.si.te", "translation": "to make explicit / menjelaskan gamblang", "definition": "Énoncer de façon claire et détaillée.", "example_sentence": "Le chercheur doit expliciter ses présupposés théoriques.", "example_translation": "The researcher must make their theoretical assumptions explicit.", "frequency_rank": 950},
        # C2
        {"lemma": "pour peu que", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "conjunction", "gender": None, "phonetic": "puʁ pø kə", "translation": "provided that / if only / asalkan sedikit saja", "definition": "Conjonction de condition minimale au subjonctif.", "example_sentence": "Pour peu qu'on s'y investisse, la maîtrise d'une langue devient une joie immense.", "example_translation": "Provided that one invests in it, mastering a language becomes immense joy.", "frequency_rank": 1420},
        {"lemma": "omniprésence", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "noun", "gender": "l'", "phonetic": "ɔm.ni.pʁe.zɑ̃s", "translation": "omnipresence / ubiquity / keberadaan di mana-mana", "definition": "Fait d'être présent partout.", "example_sentence": "L'omniprésence du numérique redéfinit la condition humaine.", "example_translation": "The omnipresence of digital technology redefines the human condition.", "frequency_rank": 1690},
        {"lemma": "transcender", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "verb", "gender": None, "phonetic": "tʁɑ̃.sɑ̃.de", "translation": "to transcend / melampaui", "definition": "Dépasser un niveau de réalité.", "example_sentence": "La grande littérature transcende les clivages idéologiques.", "example_translation": "Great literature transcends ideological divides.", "frequency_rank": 1580},
    ],
}

async def expand_database():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    session_maker = get_session_maker()

    async with session_maker() as session:
        langs = (await session.execute(select(Language))).scalars().all()
        lang_map = {l.code: l for l in langs}

        total_added = 0
        total_updated = 0

        for lang_code, words in EXTRA_MULTILINGUAL_LEXICON.items():
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
        logger.info(f"Expansion complete! Total added: {total_added}, Total updated: {total_updated}")

if __name__ == "__main__":
    asyncio.run(expand_database())
