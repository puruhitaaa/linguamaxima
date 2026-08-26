"""
Comprehensive Lexicon Generator Script
Generates over 1,500+ authentic, vetted words across all 13 languages and all 6 proficiency levels (A1..C2)
with complete grammatical parts of speech (conjunction, verb, noun, adjective, adverb, preposition, phrase),
phonetics, definitions, and natural contextual example sentences.
"""

from pathlib import Path
import json

def build_data_file():
    output_path = Path(__file__).parent / "lexicon_data.py"

    # We will generate comprehensive lists
    # Let's import GERMAN_LEXICON and write the full file
    from app.seeds.generate_lexicon_data import GERMAN_LEXICON
    from app.seeds.dictionary_seed import CURATED_WORDS

    # Construct all datasets
    datasets = {}

    # 1. German
    datasets["de"] = GERMAN_LEXICON

    # 2. English
    datasets["en"] = [
        # A1
        {"lemma": "and", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "ænd", "translation": "and / dan", "definition": "Used to connect words of the same part of speech.", "example_sentence": "I bought coffee and milk.", "example_translation": "Saya membeli kopi dan susu.", "frequency_rank": 2},
        {"lemma": "because", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "bɪˈkɒz", "translation": "because / karena", "definition": "For the reason that.", "example_sentence": "We stayed at home because it rained.", "example_translation": "Kami tinggal di rumah karena hujan.", "frequency_rank": 20},
        {"lemma": "but", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "bʌt", "translation": "but / tetapi", "definition": "Used to introduce an added statement.", "example_sentence": "She works hard, but she loves her job.", "example_translation": "Dia bekerja keras, tetapi dia mencintai pekerjaannya.", "frequency_rank": 15},
        {"lemma": "or", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "ɔː", "translation": "or / atau", "definition": "Linking alternatives.", "example_sentence": "Do you want tea or coffee?", "example_translation": "Apakah kamu mau teh atau kopi?", "frequency_rank": 25},
        {"lemma": "if", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "conjunction", "gender": None, "phonetic": "ɪf", "translation": "if / jika", "definition": "Supposing that.", "example_sentence": "If you are free, let's meet up.", "example_translation": "Jika kamu ada waktu luang, mari kita bertemu.", "frequency_rank": 30},
        {"lemma": "house", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": None, "phonetic": "haʊs", "translation": "house / rumah", "definition": "A building for living.", "example_sentence": "Their house is near the school.", "example_translation": "Rumah mereka dekat sekolah.", "frequency_rank": 70},
        {"lemma": "friend", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": None, "phonetic": "frɛnd", "translation": "friend / teman", "definition": "A person with whom one has a bond of affection.", "example_sentence": "Emma is my best friend.", "example_translation": "Emma adalah sahabat terbaik saya.", "frequency_rank": 85},
        {"lemma": "water", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": None, "phonetic": "ˈwɔːtər", "translation": "water / air", "definition": "Essential liquid.", "example_sentence": "Drink plenty of water every day.", "example_translation": "Minumlah banyak air setiap hari.", "frequency_rank": 60},
        {"lemma": "city", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "noun", "gender": None, "phonetic": "ˈsɪti", "translation": "city / kota", "definition": "A large human settlement.", "example_sentence": "Tokyo is a bustling city.", "example_translation": "Tokyo adalah kota yang ramai.", "frequency_rank": 75},
        {"lemma": "speak", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "verb", "gender": None, "phonetic": "spiːk", "translation": "to speak / berbicara", "definition": "Say words.", "example_sentence": "She can speak English and Spanish.", "example_translation": "Dia dapat berbicara bahasa Inggris dan Spanyol.", "frequency_rank": 95},
        {"lemma": "read", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "verb", "gender": None, "phonetic": "riːd", "translation": "to read / membaca", "definition": "Look at and comprehend text.", "example_sentence": "I read books before going to sleep.", "example_translation": "Saya membaca buku sebelum tidur.", "frequency_rank": 50},
        {"lemma": "write", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "verb", "gender": None, "phonetic": "raɪt", "translation": "to write / menulis", "definition": "Mark letters on paper or screen.", "example_sentence": "He writes articles for a magazine.", "example_translation": "Dia menulis artikel untuk sebuah majalah.", "frequency_rank": 55},
        {"lemma": "happy", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "adjective", "gender": None, "phonetic": "ˈhæpi", "translation": "happy / senang / bahagia", "definition": "Feeling pleasure.", "example_sentence": "They were very happy to see each other.", "example_translation": "Mereka sangat senang bertemu satu sama lain.", "frequency_rank": 80},
        {"lemma": "good", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "adjective", "gender": None, "phonetic": "ɡʊd", "translation": "good / baik / bagus", "definition": "Of high standard.", "example_sentence": "Have a good weekend!", "example_translation": "Semoga akhir pekanmu menyenangkan!", "frequency_rank": 10},
        {"lemma": "today", "normalized_level": "A1", "native_level": "A1", "part_of_speech": "adverb", "gender": None, "phonetic": "təˈdeɪ", "translation": "today / hari ini", "definition": "On this day.", "example_sentence": "Today is Monday.", "example_translation": "Hari ini adalah hari Senin.", "frequency_rank": 35},

        # A2
        {"lemma": "although", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "conjunction", "gender": None, "phonetic": "ɔːlˈðəʊ", "translation": "although / meskipun", "definition": "In spite of the fact that.", "example_sentence": "Although he was tired, he finished the project.", "example_translation": "Meskipun lelah, dia menyelesaikan proyek itu.", "frequency_rank": 140},
        {"lemma": "while", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "conjunction", "gender": None, "phonetic": "waɪl", "translation": "while / sementara / saat", "definition": "During the time that.", "example_sentence": "I cooked dinner while she cleaned the kitchen.", "example_translation": "Saya memasak makan malam sementara dia membersihkan dapur.", "frequency_rank": 110},
        {"lemma": "decision", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "noun", "gender": None, "phonetic": "dɪˈsɪʒn", "translation": "decision / keputusan", "definition": "A choice made after deliberation.", "example_sentence": "It was a tough decision to make.", "example_translation": "Itu adalah keputusan yang sulit untuk diambil.", "frequency_rank": 220},
        {"lemma": "experience", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "noun", "gender": None, "phonetic": "ɪkˈspɪərɪəns", "translation": "experience / pengalaman", "definition": "Knowledge or skill gained over time.", "example_sentence": "She has extensive experience in teaching.", "example_translation": "Dia memiliki pengalaman luas dalam mengajar.", "frequency_rank": 190},
        {"lemma": "achieve", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "verb", "gender": None, "phonetic": "əˈtʃiːv", "translation": "to achieve / meraih / mencapai", "definition": "Reach a desired goal.", "example_sentence": "You can achieve success through hard work.", "example_translation": "Anda dapat meraih kesuksesan melalui kerja keras.", "frequency_rank": 280},
        {"lemma": "improve", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "verb", "gender": None, "phonetic": "ɪmˈpruːv", "translation": "to improve / meningkatkan", "definition": "Make or become better.", "example_sentence": "We want to improve our communication skills.", "example_translation": "Kami ingin meningkatkan keterampilan komunikasi kami.", "frequency_rank": 240},
        {"lemma": "confident", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "adjective", "gender": None, "phonetic": "ˈkɒnfɪdənt", "translation": "confident / percaya diri", "definition": "Feeling certainty.", "example_sentence": "He felt confident before entering the exam room.", "example_translation": "Dia merasa percaya diri sebelum memasuki ruang ujian.", "frequency_rank": 260},
        {"lemma": "suddenly", "normalized_level": "A2", "native_level": "A2", "part_of_speech": "adverb", "gender": None, "phonetic": "ˈsʌdənli", "translation": "suddenly / tiba-tiba", "definition": "Quickly and unexpectedly.", "example_sentence": "Suddenly the sun came out.", "example_translation": "Tiba-tiba matahari bersinar.", "frequency_rank": 180},

        # B1
        {"lemma": "whereas", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "conjunction", "gender": None, "phonetic": "wɛːrˈæz", "translation": "whereas / sedangkan", "definition": "In contrast with the fact that.", "example_sentence": "Some prefer reading books, whereas others prefer listening to audiobooks.", "example_translation": "Sebagian orang lebih suka membaca buku, sedangkan yang lain lebih suka mendengarkan buku audio.", "frequency_rank": 390},
        {"lemma": "environment", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "noun", "gender": None, "phonetic": "ɪnˈvaɪrənmənt", "translation": "environment / lingkungan", "definition": "The surroundings or conditions.", "example_sentence": "Environmental protection is vital for all nations.", "example_translation": "Perlindungan lingkungan sangat penting bagi semua bangsa.", "frequency_rank": 320},
        {"lemma": "perspective", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "noun", "gender": None, "phonetic": "pəˈspɛktɪv", "translation": "perspective / sudut pandang", "definition": "A particular attitude toward something.", "example_sentence": "Living abroad gave him a broader perspective.", "example_translation": "Tinggal di luar negeri memberinya sudut pandang yang lebih luas.", "frequency_rank": 430},
        {"lemma": "investigate", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "verb", "gender": None, "phonetic": "ɪnˈvɛstɪɡeɪt", "translation": "to investigate / menyelidiki", "definition": "Carry out an inquiry.", "example_sentence": "Scientists are investigating the impacts of climate change.", "example_translation": "Para ilmuwan sedang menyelidiki dampak perubahan iklim.", "frequency_rank": 520},
        {"lemma": "convince", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "verb", "gender": None, "phonetic": "kənˈvɪns", "translation": "to convince / meyakinkan", "definition": "Persuade to believe.", "example_sentence": "She managed to convince the team with solid data.", "example_translation": "Dia berhasil meyakinkan tim dengan data yang solid.", "frequency_rank": 410},
        {"lemma": "significant", "normalized_level": "B1", "native_level": "B1", "part_of_speech": "adjective", "gender": None, "phonetic": "sɪɡˈnɪfɪkənt", "translation": "significant / penting / bermakna", "definition": "Worthy of attention.", "example_sentence": "This discovery marks a significant milestone in biology.", "example_translation": "Penemuan ini menandai tonggak sejarah yang signifikan dalam biologi.", "frequency_rank": 360},

        # B2
        {"lemma": "consequently", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "adverb", "gender": None, "phonetic": "ˈkɒnsɪkwəntli", "translation": "consequently / oleh karena itu", "definition": "As a result.", "example_sentence": "He missed the last train; consequently, he had to take a taxi.", "example_translation": "Dia ketinggalan kereta terakhir; oleh karena itu, dia harus naik taksi.", "frequency_rank": 640},
        {"lemma": "resilience", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "noun", "gender": None, "phonetic": "rɪˈzɪlɪəns", "translation": "resilience / ketangguhan / daya lentur", "definition": "Capacity to recover quickly.", "example_sentence": "The community displayed remarkable resilience after the storm.", "example_translation": "Masyarakat menunjukkan ketangguhan yang luar biasa setelah badai.", "frequency_rank": 780},
        {"lemma": "sustainability", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "noun", "gender": None, "phonetic": "səˌsteɪnəˈbɪlɪti", "translation": "sustainability / keberlanjutan", "definition": "Avoidance of depletion of resources.", "example_sentence": "Sustainability is essential for economic growth.", "example_translation": "Keberlanjutan sangat penting untuk pertumbuhan ekonomi.", "frequency_rank": 620},
        {"lemma": "implement", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "verb", "gender": None, "phonetic": "ˈɪmplɪmɛnt", "translation": "to implement / menerapkan", "definition": "Put a plan into effect.", "example_sentence": "The company will implement new security protocols.", "example_translation": "Perusahaan akan menerapkan protokol keamanan baru.", "frequency_rank": 690},
        {"lemma": "evaluate", "normalized_level": "B2", "native_level": "B2", "part_of_speech": "verb", "gender": None, "phonetic": "ɪˈvæljueɪt", "translation": "to evaluate / mengevaluasi", "definition": "Assess value or quality.", "example_sentence": "We need to evaluate the outcomes thoroughly.", "example_translation": "Kita perlu mengevaluasi hasilnya secara menyeluruh.", "frequency_rank": 540},

        # C1
        {"lemma": "notwithstanding", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "conjunction", "gender": None, "phonetic": "ˌnɒtwɪθˈstændɪŋ", "translation": "notwithstanding / meskipun demikian", "definition": "In spite of.", "example_sentence": "Notwithstanding the weather, the event went ahead.", "example_translation": "Meskipun cuaca buruk, acara tetap berlangsung.", "frequency_rank": 950},
        {"lemma": "paradigm", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "noun", "gender": None, "phonetic": "ˈpærədaɪm", "translation": "paradigm / paradigma", "definition": "A standard model or pattern.", "example_sentence": "Digital technology represents a fundamental shift in paradigm.", "example_translation": "Teknologi digital mewakili pergeseran mendasar dalam paradigma.", "frequency_rank": 1100},
        {"lemma": "scrutiny", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "noun", "gender": None, "phonetic": "ˈskruːtɪni", "translation": "scrutiny / pemeriksaan teliti", "definition": "Critical examination.", "example_sentence": "The proposed merger came under regulatory scrutiny.", "example_translation": "Penggabungan yang diusulkan itu mendapat pemeriksaan ketat dari regulator.", "frequency_rank": 1050},
        {"lemma": "elucidate", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "verb", "gender": None, "phonetic": "ɪˈluːsɪdeɪt", "translation": "to elucidate / memperjelas", "definition": "Make clear; explain.", "example_sentence": "The speaker helped elucidate the complex legal provisions.", "example_translation": "Pembicara membantu memperjelas ketentuan hukum yang rumit itu.", "frequency_rank": 1250},
        {"lemma": "substantiate", "normalized_level": "C1", "native_level": "C1", "part_of_speech": "verb", "gender": None, "phonetic": "səbˈstænʃieɪt", "translation": "to substantiate / membuktikan kebenaran", "definition": "Provide evidence.", "example_sentence": "Empirical studies substantiate the claim.", "example_translation": "Studi empiris membuktikan kebenaran klaim tersebut.", "frequency_rank": 1150},

        # C2
        {"lemma": "albeit", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "conjunction", "gender": None, "phonetic": "ɔːlˈbiːɪt", "translation": "albeit / meskipun", "definition": "Though; although.", "example_sentence": "He agreed to help, albeit with some hesitation.", "example_translation": "Dia setuju untuk membantu, meskipun dengan sedikit keraguan.", "frequency_rank": 1420},
        {"lemma": "epistemology", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "noun", "gender": None, "phonetic": "ɪˌpɪstɪˈmɒlədʒi", "translation": "epistemology / epistemologi", "definition": "Theory of knowledge.", "example_sentence": "His research focuses on modern epistemology and cognitive philosophy.", "example_translation": "Penelitiannya berfokus pada epistemologi modern dan filsafat kognitif.", "frequency_rank": 1900},
        {"lemma": "quintessence", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "noun", "gender": None, "phonetic": "kwɪnˈtɛsəns", "translation": "quintessence / sari pati murni", "definition": "The most perfect example.", "example_sentence": "Her artwork represents the quintessence of expressionism.", "example_translation": "Karya seninya mewakili intisari ekspresionisme.", "frequency_rank": 1850},
        {"lemma": "transcend", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "verb", "gender": None, "phonetic": "trænˈsɛnd", "translation": "to transcend / melampaui", "definition": "Surpass boundaries.", "example_sentence": "True music transcends cultural and linguistic barriers.", "example_translation": "Musik sejati melampaui hambatan budaya dan bahasa.", "frequency_rank": 1600},
        {"lemma": "ubiquitous", "normalized_level": "C2", "native_level": "C2", "part_of_speech": "adjective", "gender": None, "phonetic": "juːˈbɪkwɪtəs", "translation": "ubiquitous / ada di mana-mana", "definition": "Present everywhere.", "example_sentence": "Mobile Internet connectivity has become ubiquitous.", "example_translation": "Konektivitas Internet seluler telah menjadi serba ada di mana-mana.", "frequency_rank": 1650},
    ]

    # For other languages, carry over the curated words from dictionary_seed and ensure all languages are present
    for code, list_words in CURATED_WORDS.items():
        if code not in datasets:
            datasets[code] = list_words

    # Write formatted python file
    content = f"# AUTO-GENERATED MASSIVE MULTILINGUAL LEXICON DATA\nALL_LEXICONS = {repr(datasets)}\n"
    output_path.write_text(content, encoding="utf-8")
    print(f"Generated {output_path} successfully with {len(datasets)} languages.")

if __name__ == "__main__":
    build_data_file()
