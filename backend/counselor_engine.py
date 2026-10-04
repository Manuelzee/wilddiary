"""Harbor - WildDiary's built-in counseling engine.

Runs entirely on our own server: no external AI provider or API key.

How it works (per reply):
1. Safety first - graded crisis detection (acute risk, passive ideation,
   danger from others, harm to others) with a follow-up protocol.
2. Understanding - detects emotions (with intensity and negation), life topics,
   CBT cognitive distortions, and conversational intent.
3. Memory - rebuilds session state from the stored conversation history
   (topics mentioned earlier, questions already asked, techniques offered or
   delivered, distress ratings), so it never needs extra tables.
4. Counseling flow - mirrors a real session:
   engage -> explore (open questions + reflective listening) -> summarise ->
   offer an evidence-based technique (with permission) -> guide it ->
   check in -> plan one small step -> close / refer when appropriate.
5. Composition - validation + reflection + at most one question, varied wording.
"""
import hashlib
import re

# --------------------------------------------------------------------------- #
# Lexicons
# --------------------------------------------------------------------------- #
EMOTIONS = {
    "anxious": dict(adj="anxious", noun="anxiety", patterns=[
        r"anxi\w*", r"worr\w*", r"nervous", r"panic\w*", r"on edge", r"uneasy", r"restless",
        r"overthink\w*", r"can'?t stop thinking", r"tense", r"dread\w*", r"butterflies"]),
    "stressed": dict(adj="overwhelmed", noun="stress", patterns=[
        r"stress\w*", r"overwhelm\w*", r"pressure", r"too much", r"burn(?:ed|t)? ?out", r"swamped",
        r"can'?t cope", r"drowning", r"exhausted", r"so much to do"]),
    "sad": dict(adj="low", noun="sadness", patterns=[
        r"sad\w*", r"down", r"unhappy", r"depress\w*", r"cry\w*", r"cried", r"tears", r"heartbroken",
        r"miserable", r"blue", r"gloomy", r"low mood", r"feel low", r"feeling low", r"empty"]),
    "hopeless": dict(adj="hopeless", noun="hopelessness", patterns=[
        r"hopeless", r"no hope", r"pointless", r"what'?s the point", r"give up", r"giving up",
        r"nothing (?:will|ever) (?:change|get better)", r"no way out", r"stuck"]),
    "angry": dict(adj="angry", noun="anger", patterns=[
        r"angry", r"anger", r"mad", r"furious", r"pissed", r"annoy\w*", r"irritat\w*", r"frustrat\w*",
        r"rage", r"resent\w*", r"fed up", r"hate (?:him|her|them|it|this)"]),
    "lonely": dict(adj="lonely", noun="loneliness", patterns=[
        r"lonely", r"alone", r"isolat\w*", r"no friends", r"nobody (?:cares|understands|listens)",
        r"no one (?:cares|understands|listens)", r"left out", r"invisible", r"disconnected"]),
    "afraid": dict(adj="scared", noun="fear", patterns=[
        r"scared", r"afraid", r"fear\w*", r"terrified", r"frightened", r"unsafe"]),
    "ashamed": dict(adj="ashamed", noun="shame", patterns=[
        r"ashamed", r"shame\w*", r"embarrass\w*", r"humiliat\w*", r"disgust(?:ed)? with myself"]),
    "guilty": dict(adj="guilty", noun="guilt", patterns=[
        r"guilt\w*", r"my fault", r"blame myself", r"regret\w*", r"should have", r"shouldn'?t have"]),
    "hurt": dict(adj="hurt", noun="hurt", patterns=[
        r"hurt", r"betray\w*", r"rejected", r"abandon\w*", r"let down", r"used me", r"lied to me"]),
    "grieving": dict(adj="heartbroken", noun="grief", patterns=[
        r"griev\w*", r"grief", r"mourn\w*", r"miss (?:him|her|them) so", r"passed away", r"died", r"lost my"]),
    "numb": dict(adj="numb", noun="numbness", patterns=[
        r"numb", r"feel nothing", r"don'?t feel anything", r"empty inside", r"disconnected from"]),
    "tired": dict(adj="drained", noun="exhaustion", patterns=[
        r"tired", r"drained", r"no energy", r"fatigue\w*", r"worn out", r"can'?t get out of bed"]),
    "confused": dict(adj="confused", noun="confusion", patterns=[
        r"confus\w*", r"lost", r"don'?t know what to do", r"unsure", r"torn"]),
    "positive": dict(adj="better", noun="relief", patterns=[
        r"happy", r"better", r"relieved", r"grateful", r"thankful", r"proud", r"hopeful", r"calm(?:er)?",
        r"good day", r"excited", r"okay now", r"fine now"]),
}

TOPICS = {
    "work": dict(phrase="what's happening at work", patterns=[
        r"work", r"job", r"boss", r"office", r"cowork\w*", r"colleague\w*", r"manager", r"fired",
        r"laid off", r"career", r"promotion", r"workplace", r"shift"]),
    "school": dict(phrase="school and the pressure around it", patterns=[
        r"school", r"exams?", r"tests?", r"class(?:es)?", r"lecturer\w*", r"teacher\w*", r"universit\w*",
        r"uni", r"college", r"assignment\w*", r"grades?", r"jamb", r"waec", r"cgpa", r"gpa", r"studies", r"studying"]),
    "family": dict(phrase="things with your family", patterns=[
        r"mum", r"mom", r"mother", r"dad", r"father", r"parents?", r"brother", r"sister", r"siblings?",
        r"family", r"uncle", r"aunt\w*", r"grand\w+", r"in-?laws?"]),
    "relationship": dict(phrase="your relationship", patterns=[
        r"boyfriend", r"girlfriend", r"partner", r"husband", r"wife", r"spouse", r"marriage", r"dating",
        r"crush", r"relationship"]),
    "breakup": dict(phrase="the breakup", patterns=[
        r"broke up", r"break ?up", r"my ex", r"divorc\w*", r"cheat\w*", r"dumped", r"left me"]),
    "friends": dict(phrase="what's going on with your friends", patterns=[
        r"friends?", r"bestie", r"best friend", r"friendship", r"squad"]),
    "money": dict(phrase="money worries", patterns=[
        r"money", r"debt\w*", r"rent", r"bills?", r"loan\w*", r"salary", r"afford", r"financ\w*",
        r"school fees", r"broke(?! up)", r"pay(?:ing)? for", r"income"]),
    "health": dict(phrase="your health", patterns=[
        r"sick", r"ill(?:ness)?", r"pain", r"diagnos\w*", r"hospital", r"health", r"disease", r"doctor", r"surgery"]),
    "sleep": dict(phrase="your sleep", patterns=[
        r"sleep\w*", r"insomnia", r"can'?t sleep", r"awake all night", r"nightmares?", r"rest"]),
    "self_worth": dict(phrase="the way you've been seeing yourself", patterns=[
        r"worthless", r"failure", r"not good enough", r"ugly", r"hate myself", r"useless", r"stupid",
        r"confidence", r"self[- ]?esteem", r"loser", r"disappointment"]),
    "grief": dict(phrase="your loss", patterns=[
        r"died", r"death", r"passed away", r"funeral", r"lost my", r"grief", r"griev\w*", r"mourn\w*"]),
    "loneliness": dict(phrase="feeling alone", patterns=[
        r"lonely", r"alone", r"no one", r"nobody", r"isolat\w*", r"no friends"]),
    "future": dict(phrase="uncertainty about your future", patterns=[
        r"future", r"purpose", r"direction", r"lost in life", r"what to do with my life", r"no plan", r"behind in life"]),
    "body": dict(phrase="how you feel about your body", patterns=[
        r"weight", r"my body", r"appearance", r"eating", r"\bfat\b", r"skinny", r"body image"]),
    "substance": dict(phrase="drinking or substance use", patterns=[
        r"drink(?:ing)?", r"alcohol", r"drunk", r"drugs?", r"weed", r"high", r"addict\w*", r"smok\w*", r"pills"]),
    "bullying": dict(phrase="being bullied", patterns=[
        r"bull(?:y|ied|ying)", r"harass\w*", r"mock\w*", r"tease\w*", r"laugh(?:ed|ing)? at me"]),
}

# Graded risk patterns.
ACUTE_RISK = re.compile(
    r"\b(kill(?:ing)? myself|end(?:ing)? my life|take my (?:own )?life|want(?:ed)? to die|wanna die|"
    r"suicid\w*|better off dead|don'?t want to (?:live|be alive|exist)|no reason to live|"
    r"self[- ]?harm\w*|cut(?:ting)? myself|hurt(?:ing)? myself|overdos\w*|can'?t go on|end it all|"
    r"never wake up|jump off|hang myself)\b", re.I)
PASSIVE_RISK = re.compile(
    r"\b(what'?s the point of (?:living|life|anything)|tired of (?:living|life|being alive)|"
    r"wish i (?:was|were) (?:dead|gone|never born)|want to disappear|disappear forever|"
    r"everyone would be better off without me|no one would (?:care|notice) if i)\b", re.I)
DANGER_FROM_OTHERS = re.compile(
    r"\b((?:he|she|they) (?:hits?|beats?|kicks?|chokes?|slaps?|threaten\w*) me|"
    r"(?:going|gonna) to kill me|abus(?:es|ed|ing|ive) me|i'?m being abused|raped|assaulted|"
    r"afraid (?:to go|of going) home|not safe at home)\b", re.I)
HARM_OTHERS = re.compile(r"\b(kill (?:him|her|them|someone|everyone)|hurt (?:him|her|them|someone) badly)\b", re.I)

DISTORTIONS = {
    "labeling": dict(pattern=r"\bi'?m (?:such )?(?:a |an )?(failure|loser|idiot|worthless|useless|stupid|disappointment|burden|mess)\b",
                     challenge="I noticed you called yourself {match}. That's a heavy label to carry. If a close friend were going through the same thing, would you describe them that way?"),
    "all_or_nothing": dict(pattern=r"\b(always|never|everyone|no ?one|nobody|everything|nothing)\b.{0,40}\b(wrong|fail\w*|hate\w*|cares?|works?|right|ruin\w*)",
                           challenge="I heard some all-or-nothing words there. When we're hurting, our mind often says \"always\" or \"never\". Can you think of even one time it went a little differently?"),
    "catastrophizing": dict(pattern=r"\b(worst|ruined|disaster|end of the world|can'?t handle|everything is falling apart|over for me)\b",
                            challenge="It sounds like your mind is jumping to the worst possible outcome, which makes sense when you're scared. What would a more likely outcome look like, even if it's still hard?"),
    "mind_reading": dict(pattern=r"\b(?:they|he|she|everyone|people) (?:all )?(?:think|thinks|believe|believes) (?:i'?m|that i)\b",
                         challenge="You mentioned what others think of you. I wonder how sure we can be about what's in someone else's mind. What evidence do you have, and is there any that points the other way?"),
    "should": dict(pattern=r"\bi (?:should|must|have to|ought to)\b",
                   challenge="I noticed a few \"shoulds\" in what you said. Those can put a lot of pressure on us. What would change if you swapped \"I should\" for \"I'd like to\"?"),
    "personalization": dict(pattern=r"\b(it'?s (?:all )?my fault|because of me|i ruin(?:ed)? everything|i caused)\b",
                            challenge="You're taking a lot of the blame on yourself. If we looked at everything that contributed to this, what other factors might have played a part?"),
}

INTENTS = {
    "greeting": r"^(hi+|hello+|hey+|good (?:morning|afternoon|evening)|howdy|yo|hiya|sup|what'?s up)\b",
    "thanks": r"\b(thank(?:s| you)|appreciate (?:it|you|this)|that helped|this helped)\b",
    "goodbye": r"\b(bye|goodbye|good ?night|talk (?:to you )?later|see you|gotta go|that'?s all|i'?m done for now)\b",
    "ask_advice": r"\b(what (?:should|can|do) i do|how (?:do|can|should) i|any (?:advice|tips|ideas)|help me|what would you (?:do|suggest)|give me (?:advice|tips)|what can i try)\b",
    "ask_bot": r"\b(are you (?:a |an )?(?:bot|robot|human|real|person|ai|therapist|counsel+or|machine)|who are you|what are you)\b",
    "affirm": r"^(yes|yeah|yea|yep|yup|sure|ok(?:ay)?|please|i would|that would help|let'?s|alright|go ahead|why not|i'?ll try|i guess so)\b",
    "deny": r"^(no|nope|nah|not really|i don'?t think so|not now|maybe later|i'?d rather not)\b",
    "minimal": r"^(idk|i don'?t know|not sure|dunno|nothing|whatever|hmm+|meh|k|ok)\W*$",
}

INTENSIFIERS = re.compile(r"\b(so|very|really|extremely|incredibly|completely|totally|too|super|terribly|unbearabl\w*)\b", re.I)
NEGATORS = re.compile(r"\b(not|n't|never|no longer|hardly|barely)\b", re.I)

# --------------------------------------------------------------------------- #
# Counseling techniques (evidence-based; offered with permission)
# --------------------------------------------------------------------------- #
TECHNIQUES = {
    "grounding": dict(
        emotions={"anxious", "afraid", "stressed"}, topics=set(),
        signature="5-4-3-2-1",
        offer="There's a grounding exercise called 5-4-3-2-1 that can calm your body when anxiety takes over. Would you like to try it together?",
        steps=("Let's do it slowly. Look around and name 5 things you can see. Then notice 4 things you can feel, "
               "like your feet on the floor or the fabric of your clothes. Next, 3 things you can hear, 2 things you can smell, "
               "and 1 thing you can taste. Take your time with each one; there's no rush.")),
    "breathing": dict(
        emotions={"anxious", "angry", "stressed", "afraid"}, topics={"sleep"},
        signature="box breathing",
        offer="Something many people find helpful is box breathing, a simple way to settle your nervous system. Would you like to try it?",
        steps=("Here's how box breathing works: breathe in through your nose for 4 counts, hold for 4, breathe out slowly "
               "for 4, and hold again for 4. Repeat that cycle four or five times. If holding feels uncomfortable, just make "
               "the out-breath a little longer than the in-breath.")),
    "reframe": dict(
        emotions={"ashamed", "guilty", "hopeless", "anxious"}, topics={"self_worth"},
        signature="the thought that's hurting most",
        offer="Would you be open to looking at the thought that's hurting most, step by step? It's a technique from cognitive behavioural therapy that can loosen a thought's grip.",
        steps=("Let's look at the thought that's hurting most. First, write down that thought exactly as it sounds in your head. "
               "Next, list any evidence that supports it, and then any evidence that doesn't, even small things. Finally, try "
               "writing a more balanced version, something kind but still honest. You can do this privately in your Diary if that feels safer.")),
    "self_compassion": dict(
        emotions={"ashamed", "guilty", "sad", "hurt"}, topics={"self_worth", "body"},
        signature="speak to a close friend",
        offer="Would you like to try a short self-compassion exercise? It's about treating yourself the way you'd speak to a close friend.",
        steps=("Imagine a close friend came to you feeling exactly the way you do now. What would you say to them? Notice your tone, "
               "your words, how gentle you'd be. Now try saying those same words to yourself, even if it feels awkward at first. "
               "You could also place a hand on your chest and say, \"This is really hard right now, and I'm doing my best.\"")),
    "activation": dict(
        emotions={"sad", "numb", "hopeless", "tired"}, topics=set(),
        signature="one small activity",
        offer="When we feel low, our energy drops and we pull back from things, which can make the low feeling worse. Would you be open to picking one small activity that might lift your mood a little?",
        steps=("Let's choose one small activity, something that takes 10 minutes or less. It could be stepping outside for fresh air, "
               "a shower, playing a song you used to love, texting someone, or tidying one corner of your room. It doesn't have "
               "to feel enjoyable at first; the aim is just to do it and notice how you feel afterwards.")),
    "worry_time": dict(
        emotions={"anxious", "stressed"}, topics={"future", "school", "money"},
        signature="worry time",
        offer="If worries keep looping through your mind all day, a technique called \"worry time\" can help contain them. Would you like to hear how it works?",
        steps=("With worry time, you set aside 15 minutes at the same time each day to worry on purpose. Write the worries down "
               "and, for each one, ask: \"Is there anything I can do about this?\" If yes, note one action. If not, practise "
               "letting it go for now. When a worry pops up outside that time, gently tell yourself, \"I'll deal with you at worry time.\"")),
    "problem_solving": dict(
        emotions={"stressed", "confused"}, topics={"money", "work", "school", "future"},
        signature="break the problem down",
        offer="Sometimes a problem feels huge because we're looking at all of it at once. Would it help to break the problem down together?",
        steps=("Let's break the problem down. First, describe the specific part that's bothering you most, in one sentence. "
               "Then list every possible option, even ones that seem silly, without judging them. Next, think through the pros "
               "and cons of two or three of them. Finally, pick the smallest, most doable step from the best option.")),
    "anger_stop": dict(
        emotions={"angry"}, topics=set(),
        signature="STOP",
        offer="Anger often comes with a rush of energy that makes it hard to think clearly. Would you like to try the STOP technique for those moments?",
        steps=("STOP stands for: Stop what you're doing. Take a slow breath. Observe what's happening in your body and mind: "
               "the heat, the tension, the thoughts. Then Proceed with intention, asking, \"What response would I be proud of later?\" "
               "Your anger is valid information; STOP just gives you the space to choose what to do with it.")),
    "connection": dict(
        emotions={"lonely"}, topics={"loneliness", "friends"},
        signature="reach out to one person",
        offer="Loneliness can make reaching out feel really hard. Would you be open to thinking about one gentle way to reach out to one person?",
        steps=("Let's keep it small: think of one person you feel even slightly comfortable with: a relative, an old friend, a classmate. "
               "A short message like \"Hey, I was thinking of you, how have you been?\" is enough. You could also join a community "
               "here on Wild Diary by responding to someone's post; small connections add up.")),
    "grief_letter": dict(
        emotions={"grieving"}, topics={"grief"},
        signature="write a letter",
        offer="Some people find it meaningful to write a letter to the person they lost, saying what they didn't get to say. Would you like to try that?",
        steps=("You can write a letter to the person you lost in your private Diary. You might start with \"What I want you to know is...\" "
               "and share memories, things you're grateful for, things you wish had gone differently, and how you're carrying them "
               "with you. There's no right way to do it, and it's okay if it brings up tears.")),
    "sleep": dict(
        emotions={"tired"}, topics={"sleep"},
        signature="wind-down routine",
        offer="Sleep and mood are closely linked. Would you like a few ideas for a calming wind-down routine?",
        steps=("A simple wind-down routine: try to keep the same wake-up time every day, even after a bad night. Put screens away "
               "30 to 60 minutes before bed, and do something calm instead, like a warm shower, light stretching, or writing your "
               "thoughts in your Diary to empty your mind. If you can't sleep after about 20 minutes, get up and do something quiet "
               "in dim light until you feel sleepy.")),
    "i_statements": dict(
        emotions={"hurt", "angry"}, topics={"relationship", "family", "friends"},
        signature="I-statements",
        offer="When things are tense with someone close to us, how we start the conversation matters a lot. Would it help to plan what you'd like to say using I-statements?",
        steps=("I-statements follow a simple shape: \"I feel [emotion] when [specific situation], because [why it matters to me]. "
               "What I'd like is [request].\" For example: \"I feel hurt when plans get cancelled last minute, because I was "
               "looking forward to it. I'd like us to give each other more notice.\" It keeps the focus on your experience "
               "rather than blame, which makes the other person less likely to get defensive.")),
}

TOPIC_ADVICE = {
    "work": "At work, it can help to separate what's in your control (your effort, boundaries, asking for clarity) from what isn't (other people's moods, company decisions).",
    "school": "With school pressure, breaking study time into short focused blocks with real breaks, and asking a lecturer or classmate for help early, often makes a big difference.",
    "money": "With money stress, writing down exactly what's coming in and going out, even roughly, can turn a vague fear into a problem you can work on one piece at a time.",
    "relationship": "In relationships, a calm conversation at a good time, focused on how you feel rather than what they did wrong, usually goes further than talking in the heat of the moment.",
    "breakup": "After a breakup, it's normal for feelings to come in waves. Limiting checking their social media, leaning on friends, and keeping a basic routine can help you through the hardest days.",
    "family": "With family, it helps to remember you can't control how they respond, but you can choose your boundaries and how you communicate your needs.",
    "friends": "With friendships, an honest, gentle check-in often clears up misunderstandings that feel much bigger in our heads.",
    "sleep": "For sleep, a consistent wake-up time and a screen-free wind-down are two of the most reliable places to start.",
    "loneliness": "With loneliness, small regular contact, like a weekly call or a shared activity, tends to help more than waiting for one big connection.",
    "self_worth": "When your inner critic is loud, it can help to notice its voice and ask whether you'd ever speak to someone you love that way.",
    "health": "With health worries, writing down your questions before seeing a doctor, and bringing someone you trust, can make things feel more manageable.",
    "future": "When the future feels uncertain, focusing on the next small step, rather than the whole path, can make it less overwhelming.",
    "substance": "If drinking or substances have become a way to cope, it may help to notice when and why you reach for them, and to talk to a professional who can support you without judgement.",
}

EXPLORE_TOPIC_QUESTIONS = {
    "work": "What's been happening at work that feels the heaviest?",
    "school": "What part of school is putting the most pressure on you right now?",
    "family": "How have things been between you and your family lately?",
    "relationship": "How are things between you and your partner at the moment?",
    "breakup": "How long ago did things end, and how have you been coping since?",
    "friends": "What's been going on with your friends that's affecting you?",
    "money": "Which money worry is weighing on you the most right now?",
    "health": "How has your health been affecting your daily life?",
    "sleep": "How long has sleep been difficult for you?",
    "self_worth": "When did you start seeing yourself this way?",
    "grief": "Would you like to tell me a little about who you lost?",
    "loneliness": "When do you tend to feel most alone?",
    "future": "What feels most uncertain about the future for you right now?",
    "body": "How long have you been feeling this way about your body?",
    "substance": "How has drinking or using affected how you've been feeling?",
    "bullying": "How long has this been happening, and does anyone else know about it?",
}

EXPLORE_GENERAL_QUESTIONS = [
    "What's been the hardest part of this for you?",
    "When did you first start noticing these feelings?",
    "How has this been affecting your day-to-day life, like your sleep, appetite, or energy?",
    "What tends to go through your mind when this feeling shows up?",
    "Who in your life knows what you're going through?",
    "What have you tried so far to cope, and how has it worked for you?",
]

VALIDATIONS = {
    "anxious": ["That sounds really unsettling.", "Anxiety can be exhausting to live with.", "It makes sense that you'd feel on edge with all of that."],
    "stressed": ["That's a lot to be carrying at once.", "No wonder you feel stretched thin.", "That sounds like a heavy load."],
    "sad": ["I'm really sorry you're feeling this way.", "That sounds painful.", "It takes courage to put feelings like that into words."],
    "hopeless": ["It sounds like you've been carrying this for a while, and it's worn you down.", "Feeling like nothing will change is incredibly heavy.", "I'm glad you're still reaching out, even feeling this way."],
    "angry": ["It's understandable to feel angry about that.", "Anger often shows up when something important to us has been crossed.", "That sounds really frustrating."],
    "lonely": ["Feeling alone can make everything heavier.", "Loneliness is one of the hardest feelings to sit with.", "I'm glad you reached out here."],
    "afraid": ["That sounds frightening.", "It makes sense that you'd feel scared.", "Fear like that can be really overwhelming."],
    "ashamed": ["Shame can make us want to hide, so I'm glad you shared this.", "That sounds really painful to carry.", "You deserve compassion here, not judgement."],
    "guilty": ["Guilt can weigh on us so heavily.", "It sounds like you really care about doing the right thing.", "That's a painful place to be."],
    "hurt": ["That sounds really hurtful.", "Being let down by someone hurts deeply.", "I'm sorry you went through that."],
    "grieving": ["I'm so sorry for your loss.", "Grief is love with nowhere to go, and it can be overwhelming.", "There's no right way to grieve."],
    "numb": ["Feeling numb can be confusing and lonely.", "Sometimes numbness is the mind's way of protecting us when things get too much.", "That sounds really disorienting."],
    "tired": ["It sounds like you're running on empty.", "Being that drained makes everything harder.", "Exhaustion affects every part of life."],
    "confused": ["It's okay not to have it all figured out.", "Feeling torn can be really draining.", "That sounds like a lot to untangle."],
    "positive": ["I'm really glad to hear that.", "That's wonderful to hear.", "It's good to notice moments like that."],
}

PRONOUN_SWAP = {
    "i": "you", "me": "you", "my": "your", "mine": "yours", "myself": "yourself", "am": "are",
    "i'm": "you're", "im": "you're", "i've": "you've", "i'll": "you'll", "i'd": "you'd", "was": "were",
}

CRISIS_TEXT = (
    "I'm really sorry you're in this much pain, and I'm glad you told me. Your safety matters most right now. "
    "I'm not an emergency service, so if you might act on these thoughts, please call your local emergency number "
    "or go to the nearest emergency department now. If you're in Nigeria, call 112, or reach the Mentally Aware "
    "Nigeria Initiative (MANI) on 0809 111 6264. Please move away from anything you could use to hurt yourself, "
    "and reach out to someone you trust who can stay with you. Are you in immediate danger right now?"
)
CRISIS_MARKER = "immediate danger right now"
CHECK_IN_MARKER = "thoughts of ending your life"

REFERRAL_MARKER = "Counselors page"
SUMMARY_MARKER = "Let me make sure I'm understanding"
SCALE_MARKER = "on a scale from 0 to 10"
STEP_MARKER = "one small step"


# --------------------------------------------------------------------------- #
# Analysis helpers
# --------------------------------------------------------------------------- #
def _normalize(text):
    text = (text or "").replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')
    return re.sub(r"\s+", " ", text).strip()


def _compile(patterns):
    return re.compile(r"\b(?:" + "|".join(patterns) + r")\b", re.I)


_EMOTION_RE = {key: _compile(value["patterns"]) for key, value in EMOTIONS.items()}
_TOPIC_RE = {key: _compile(value["patterns"]) for key, value in TOPICS.items()}
_INTENT_RE = {key: re.compile(pattern, re.I) for key, pattern in INTENTS.items()}
_DISTORTION_RE = {key: re.compile(value["pattern"], re.I) for key, value in DISTORTIONS.items()}


def detect_emotions(text):
    """Return {emotion: score}. Handles negation ("not happy") and intensifiers."""
    lower = _normalize(text).lower()
    scores = {}
    for key, regex in _EMOTION_RE.items():
        for match in regex.finditer(lower):
            window = lower[max(0, match.start() - 18):match.start()]
            negated = bool(NEGATORS.search(window))
            if negated and key == "positive":
                scores["sad"] = scores.get("sad", 0) + 1
                continue
            if negated:
                continue
            weight = 2 if INTENSIFIERS.search(window) else 1
            scores[key] = scores.get(key, 0) + weight
    if "!" in text and scores:
        top = max(scores, key=scores.get)
        scores[top] += 1
    return scores


def detect_topics(text):
    lower = _normalize(text).lower()
    found = [key for key, regex in _TOPIC_RE.items() if regex.search(lower)]
    if "breakup" in found and "money" in found and not re.search(r"\bbroke\b(?! up)", lower):
        found.remove("money")
    return found


def detect_distortion(text):
    lower = _normalize(text).lower()
    for key, regex in _DISTORTION_RE.items():
        match = regex.search(lower)
        if match:
            return key, match
    return None, None


def detect_intents(text):
    clean = _normalize(text).lower()
    return {key for key, regex in _INTENT_RE.items() if regex.search(clean)}


def assess_risk(text):
    clean = _normalize(text)
    if ACUTE_RISK.search(clean):
        return "acute"
    if DANGER_FROM_OTHERS.search(clean):
        return "danger"
    if HARM_OTHERS.search(clean):
        return "harm_others"
    if PASSIVE_RISK.search(clean):
        return "passive"
    return None


def _swap_pronouns(fragment):
    words = fragment.split()
    return " ".join(PRONOUN_SWAP.get(word.lower(), word) for word in words)


def reflect_clause(text):
    """ELIZA-style but conservative: reflect a short 'I feel / I'm / I can't' clause."""
    clean = _normalize(text)
    for sentence in re.split(r"(?<=[.!?])\s+|\n", clean):
        lower = sentence.lower().strip()
        if re.search(r"\byou(?:r|rs|rself)?\b", lower):
            continue  # avoid mangling sentences addressed to Harbor
        match = re.match(r"^(?:and |but |so |honestly |just )?i (?:just |really |kind of |kinda )?feel (?:like |that )?(.+)", lower)
        if match:
            body = match.group(1).rstrip(".!? ")
            if 1 <= len(body.split()) <= 14:
                if re.match(r"^(so |very |really |a bit |kind of )?\w+$", body):
                    return f"you're feeling {_swap_pronouns(body)}"
                return f"you feel like {_swap_pronouns(body)}"
        match = re.match(r"^(?:and |but |so |honestly |just )?(?:i'?m|im|i am) (.+)", lower)
        if match:
            body = match.group(1).rstrip(".!? ")
            if 1 <= len(body.split()) <= 12 and not body.startswith(("fine", "ok", "good", "here", "not sure")):
                return f"you're {_swap_pronouns(body)}"
        match = re.match(r"^(?:and |but |so |honestly |just )?i (?:can'?t|cannot) (.+)", lower)
        if match:
            body = match.group(1).rstrip(".!? ")
            if 1 <= len(body.split()) <= 12:
                return f"it's been really hard to {_swap_pronouns(body)}"
    return None


def _seed(*parts):
    return int(hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest(), 16)


def _pick(options, seed, avoid=""):
    options = [o for o in options if o and o not in avoid] or list(options)
    return options[seed % len(options)]


def _join_list(items):
    items = list(items)
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + " and " + items[-1]


# --------------------------------------------------------------------------- #
# Session state reconstructed from history
# --------------------------------------------------------------------------- #
class Session:
    def __init__(self, messages):
        self.messages = messages
        self.user_msgs = [m["content"] for m in messages if m["role"] == "user"]
        self.bot_msgs = [m["content"] for m in messages if m["role"] == "assistant"]
        self.latest = self.user_msgs[-1] if self.user_msgs else ""
        self.last_bot = self.bot_msgs[-1] if self.bot_msgs else ""
        self.bot_text = "\n".join(self.bot_msgs)
        self.turn = len(self.user_msgs)

        self.emotion_totals = {}
        self.topic_order = []
        for content in self.user_msgs:
            for emotion, score in detect_emotions(content).items():
                self.emotion_totals[emotion] = self.emotion_totals.get(emotion, 0) + score
            for topic in detect_topics(content):
                if topic not in self.topic_order:
                    self.topic_order.append(topic)

        self.current_emotions = detect_emotions(self.latest)
        self.current_topics = detect_topics(self.latest)
        self.intents = detect_intents(self.latest)
        self.delivered = {k for k, t in TECHNIQUES.items() if t["steps"][:60] in self.bot_text}
        self.pending_offer = next((k for k, t in TECHNIQUES.items() if t["offer"] in self.last_bot), None)

    def dominant_emotion(self, include_positive=False):
        pool = {k: v for k, v in self.emotion_totals.items() if include_positive or k != "positive"}
        # Recent feelings weigh more than older ones.
        for k, v in self.current_emotions.items():
            if include_positive or k != "positive":
                pool[k] = pool.get(k, 0) + v * 2
        return max(pool, key=pool.get) if pool else None

    def top_emotions(self, n=2):
        pool = {k: v for k, v in self.emotion_totals.items() if k != "positive"}
        return [k for k, _ in sorted(pool.items(), key=lambda kv: -kv[1])[:n]]

    def asked(self, question):
        return question in self.bot_text

    def choose_technique(self):
        emotion = self.dominant_emotion()
        topics = set(self.topic_order)
        best, best_score = None, 0
        for key, tech in TECHNIQUES.items():
            if key in self.delivered:
                continue
            score = (3 if emotion in tech["emotions"] else 0)
            score += sum(1 for e in self.top_emotions(3) if e in tech["emotions"])
            score += 2 * len(topics & tech["topics"])
            if score > best_score:
                best, best_score = key, score
        return best


# --------------------------------------------------------------------------- #
# Response builders
# --------------------------------------------------------------------------- #
def _reflection(session, seed):
    clause = reflect_clause(session.latest)
    emotion = session.dominant_emotion()
    topic = session.current_topics[0] if session.current_topics else None
    if clause:
        return _pick([f"It sounds like {clause}.", f"What I'm hearing is that {clause}.", f"So {clause}."], seed, session.last_bot)
    if emotion and topic:
        return _pick([
            f"It sounds like {TOPICS[topic]['phrase']} has been leaving you feeling {EMOTIONS[emotion]['adj']}.",
            f"I'm hearing that {TOPICS[topic]['phrase']} has really been weighing on you, and you're feeling {EMOTIONS[emotion]['adj']}.",
        ], seed, session.last_bot)
    if topic:
        return _pick([
            f"It sounds like {TOPICS[topic]['phrase']} has been on your mind a lot.",
            f"I can hear that {TOPICS[topic]['phrase']} matters a lot to you right now.",
        ], seed, session.last_bot)
    if emotion:
        return f"It sounds like you've been feeling really {EMOTIONS[emotion]['adj']}."
    return _pick(["Thank you for sharing that with me.", "I appreciate you telling me that.", "I'm listening."], seed, session.last_bot)


def _validation(session, seed):
    emotion = session.dominant_emotion()
    if not emotion:
        return ""
    return _pick(VALIDATIONS[emotion], seed >> 3, session.bot_text[-600:])


def _exploration_question(session):
    for topic in session.current_topics + session.topic_order:
        question = EXPLORE_TOPIC_QUESTIONS.get(topic)
        if question and not session.asked(question):
            return question
    for question in EXPLORE_GENERAL_QUESTIONS:
        if not session.asked(question):
            return question
    return "What would feel most helpful to talk about right now?"


def _summary(session):
    topics = [TOPICS[t]["phrase"] for t in session.topic_order[:2]]
    emotions = [EMOTIONS[e]["adj"] for e in session.top_emotions(2)]
    parts = []
    if topics:
        parts.append(f"you've been dealing with {_join_list(topics)}")
    if emotions:
        parts.append(f"it's been leaving you feeling {_join_list(emotions)}")
    if not parts:
        return None
    return f"{SUMMARY_MARKER}: {' and '.join(parts)}. Did I get that right, or is there something I'm missing?"


def _referral_needed(session):
    if session.asked(REFERRAL_MARKER):
        return False
    heavy = sum(session.emotion_totals.get(e, 0) for e in ("hopeless", "sad", "numb", "grieving", "anxious"))
    risky_topic = bool({"substance", "bullying"} & set(session.topic_order))
    return session.turn >= 6 and (heavy >= 5 or risky_topic)


REFERRAL_TEXT = (" If these feelings keep hanging around, talking with a qualified counselor could really help; "
                 "you can find verified professionals on the Counselors page here on Wild Diary.")


def _crisis_follow_up(session):
    """The user is answering 'Are you in immediate danger right now?'"""
    latest = session.latest.lower()
    if re.search(r"\b(no|not|safe|i'?m okay|i'?m ok|i won'?t)\b", latest) and not re.search(r"\b(yes|yeah|not safe)\b", latest):
        return ("Thank you for letting me know. I'm relieved you're safe right now. I'm still here with you, and what you're feeling "
                "matters. If those thoughts come back stronger, please call 112 or reach out to someone you trust straight away. "
                "Would you like to tell me a little about what's been bringing these feelings up?"), "counselor"
    if re.search(r"\b(yes|yeah|yep|i am|not safe|i don'?t know|maybe)\b", latest):
        return ("Please call 112 right now, or ask someone nearby to call for you. If you can, go to a place where other people are, "
                "and move away from anything you could use to hurt yourself. You don't have to go through this moment alone. "
                "Is there someone you can call or be with right now?"), "crisis"
    return None


def _respond_to_risk(level, session):
    if level == "acute":
        return CRISIS_TEXT, "crisis"
    if level == "danger":
        return ("What you're describing sounds frightening, and you deserve to be safe. If you're in danger right now, please call 112. "
                "If you can, go to a trusted person or a safe place, and keep your phone with you. You can also contact the Domestic "
                "and Sexual Violence Response Team (Lagos) on 0813 796 0048 for confidential help. Are you somewhere safe at the moment?"), "crisis"
    if level == "harm_others":
        return ("It sounds like you're feeling an intense amount of anger right now, and I'm glad you said it here rather than acting on it. "
                "If you feel you might hurt someone, please step away from the situation and call 112 or someone you trust. "
                "What happened that brought up this much anger?"), "crisis"
    # Passive ideation: ask directly and calmly, as trained counselors do.
    return (f"{_validation(session, _seed(session.latest)) or 'That sounds incredibly heavy.'} Sometimes when people feel this way, "
            f"they have {CHECK_IN_MARKER}. I want to ask you directly, because I care about your safety: are you having thoughts "
            f"of ending your life?"), "check_in"


def _check_in_follow_up(session):
    latest = session.latest.lower()
    if re.search(r"^(yes|yeah|yep|sometimes|i do|kind of|a little|maybe)\b", latest):
        return CRISIS_TEXT, "crisis"
    if re.search(r"^(no|nope|nah|not really|never)\b", latest):
        return ("Thank you for being honest with me. I'm glad you're not having those thoughts. It still sounds like you're carrying "
                "something really heavy. What's been making things feel this hard lately?"), "counselor"
    return None


def generate_reply(messages):
    """Return (reply_text, mode). ``messages`` is the conversation, oldest first."""
    session = Session(messages)
    latest = session.latest
    seed = _seed(latest, session.turn)

    # 1. Safety.
    if CRISIS_MARKER in session.last_bot:
        follow = _crisis_follow_up(session)
        if follow:
            return follow
    if CHECK_IN_MARKER in session.last_bot:
        follow = _check_in_follow_up(session)
        if follow:
            return follow
    risk = assess_risk(latest)
    if risk:
        return _respond_to_risk(risk, session)

    intents = session.intents
    words = len(latest.split())

    # 2. Social moments.
    if "ask_bot" in intents:
        return ("I'm Harbor, Wild Diary's built-in support companion. I'm not a human or a licensed therapist, but I'm designed around "
                "real counseling approaches: listening without judgement, helping you untangle thoughts, and suggesting practical "
                "coping techniques. Everything stays private to your account. What's on your mind today?"), "counselor"
    if "greeting" in intents and words <= 6 and session.turn <= 1:
        return _pick([
            "Hi, I'm Harbor. I'm really glad you're here. This is a private, judgement-free space. How are you feeling today?",
            "Hello, I'm Harbor. Thanks for stopping by. Whatever is on your mind, big or small, you can share it here. How have things been for you lately?",
        ], seed), "counselor"
    if "goodbye" in intents or ("thanks" in intents and words <= 8 and session.turn >= 3):
        closing = _pick([
            "Thank you for talking with me today. It takes strength to open up like this.",
            "I'm really glad you reached out today. Be gentle with yourself.",
        ], seed)
        if session.delivered:
            closing += " Remember the technique we practised; it gets easier each time you use it."
        closing += " You can come back anytime, and writing in your Diary between chats can help you notice patterns. Take care of yourself."
        return closing, "counselor"

    # 3. Answering a technique offer.
    if session.pending_offer:
        tech = TECHNIQUES[session.pending_offer]
        if "affirm" in intents or re.search(r"\b(yes|ok|okay|sure|try)\b", latest.lower()) and words <= 6:
            return (f"{tech['steps']} When you've tried it, let me know: {SCALE_MARKER}, how intense does the feeling seem now?"), "counselor"
        if "deny" in intents:
            return ("That's completely okay; we don't have to do that. You know yourself best. What do you feel would help most right "
                    "now: talking it through some more, or thinking about something practical?"), "counselor"

    # 4. Answering the 0-10 check-in.
    if SCALE_MARKER in session.last_bot:
        number = re.search(r"\b(10|[0-9])\b", latest)
        if number:
            value = int(number.group(1))
            if value <= 4:
                reply = (f"A {value}, that's a real shift, and you made it happen. Noticing what helps is a skill you can return to. "
                         f"What's {STEP_MARKER} you could take in the next day to look after yourself?")
            elif value <= 6:
                reply = (f"A {value}. Even taking the edge off counts, and these techniques often work better with practice. "
                         f"What's {STEP_MARKER} you could take in the next day to look after yourself?")
            else:
                reply = (f"Thank you for being honest. A {value} tells me this is still really intense, and that's okay; one exercise "
                         f"won't fix everything. What do you think is keeping the feeling so strong right now?")
            return reply, "counselor"

    # 5. Responding after the user names a small step.
    if STEP_MARKER in session.last_bot and words >= 2 and "minimal" not in intents:
        reply = ("That sounds like a meaningful and realistic step. Small actions like that build momentum. It might help to "
                 "decide exactly when you'll do it, and notice how you feel afterwards. You could note it in your Diary.")
        if _referral_needed(session) or session.turn >= 6:
            reply += REFERRAL_TEXT if not session.asked(REFERRAL_MARKER) else ""
        reply += " Is there anything else on your mind you'd like to talk about?"
        return reply, "counselor"

    # 6. Positive update.
    if session.current_emotions.get("positive") and not any(k != "positive" for k in session.current_emotions):
        return (_pick(VALIDATIONS["positive"], seed) + " What do you think helped things feel a bit better? Noticing that can make it "
                "easier to come back to when times are harder."), "counselor"

    # 7. Short or unsure answers: gentle, low-pressure prompts.
    if "minimal" in intents or words <= 2:
        return _pick([
            "That's okay; sometimes it's hard to find the words. There's no rush. If it helps, you could start with how your body feels right now, or one word for your mood.",
            "It's completely fine not to know. Sometimes feelings are tangled. What's one thing that's been on your mind today, even something small?",
            "No pressure at all. I'm here whenever you're ready. Would it help if I asked a few simple questions?",
        ], seed, session.last_bot), "counselor"

    # 8. Explicit request for advice.
    if "ask_advice" in intents:
        topic = next((t for t in session.current_topics + session.topic_order if t in TOPIC_ADVICE), None)
        tip = TOPIC_ADVICE.get(topic, "It can help to start by naming the one part of this that feels most urgent, so it feels less like one big weight.")
        technique = session.choose_technique()
        if technique:
            return f"{_validation(session, seed) or 'I hear you.'} {tip} {TECHNIQUES[technique]['offer']}", "counselor"
        return f"{_validation(session, seed) or 'I hear you.'} {tip} What feels like the most doable first step for you?", "counselor"

    # 9. Core counseling flow.
    reflection = _reflection(session, seed)
    validation = _validation(session, seed)
    opener = " ".join(p for p in (validation, reflection) if p)

    distortion, match = detect_distortion(latest)
    if distortion and session.turn >= 2 and DISTORTIONS[distortion]["challenge"][:40] not in session.bot_text:
        challenge = DISTORTIONS[distortion]["challenge"].format(match=f"\"{match.group(1)}\"" if match.groups() else "that")
        return f"{opener} {challenge}", "counselor"

    summary_given = session.asked(SUMMARY_MARKER)
    if session.turn >= 3 and not summary_given:
        summary = _summary(session)
        if summary:
            return f"{validation + ' ' if validation else ''}{summary}", "counselor"

    if session.turn >= 4 or (summary_given and session.turn >= 3):
        technique = session.choose_technique()
        if technique and not session.asked(TECHNIQUES[technique]["offer"]):
            memory = ""
            if len(session.topic_order) > 1 and session.current_topics and session.topic_order[0] not in session.current_topics:
                memory = f" And I haven't forgotten what you mentioned earlier about {TOPICS[session.topic_order[0]]['phrase']}."
            return f"{opener}{memory} {TECHNIQUES[technique]['offer']}", "counselor"

    question = _exploration_question(session)
    reply = f"{opener} {question}"
    if _referral_needed(session):
        reply = f"{opener}{REFERRAL_TEXT} {question}"
    return reply.strip(), "counselor"


# --------------------------------------------------------------------------- #
# Post insights
# --------------------------------------------------------------------------- #
CATEGORY_TOPIC = {"emotional": None, "financial": "money", "relationship": "relationship", "social": "loneliness", "other": None}
INSIGHT_TIPS = {
    "anxious": "When worry spikes, slow breathing (in for 4, out for 6) can help your body settle.",
    "stressed": "Try picking just one small, doable task today; progress builds calm.",
    "sad": "Being gentle with yourself and doing one small kind thing for yourself today can make a difference.",
    "hopeless": "Feelings this heavy can lift with support, so consider sharing them with someone you trust or a counselor.",
    "angry": "Pausing before responding, and naming what feels unfair, can help you act in a way you'll feel good about.",
    "lonely": "A short message to one person, or a kind reply to someone here, can be a gentle first step toward connection.",
    "afraid": "Grounding yourself in the present, by noticing what you can see, hear, and feel, can ease fear's grip.",
    "ashamed": "Try speaking to yourself the way you'd speak to a good friend in the same situation.",
    "guilty": "Owning a mistake is different from defining yourself by it; you can learn from it and still be kind to yourself.",
    "hurt": "Your hurt is valid. Giving yourself time, and leaning on people who treat you well, can help it heal.",
    "grieving": "There's no timeline for grief; writing to the person you lost can be a meaningful way to carry them with you.",
    "numb": "Small sensory moments, like fresh air, music, or a warm drink, can gently help you reconnect.",
    "tired": "Rest isn't a reward you have to earn; protecting your sleep and energy matters.",
    "confused": "Writing out your options, even messy ones, can help you see things more clearly.",
}


def generate_post_insight(content, category):
    prefix = "AI-generated supportive reflection, not medical advice: "
    if assess_risk(content) in ("acute", "passive", "danger"):
        return prefix + ("What you've shared sounds incredibly painful, and your safety matters. If you might be in danger, please call 112 "
                         "or reach out to someone you trust right now. You can also talk to Harbor in Chat or a verified counselor anytime.")
    emotions = detect_emotions(content)
    emotions.pop("positive", None) if len(emotions) > 1 else None
    emotion = max(emotions, key=emotions.get) if emotions else None
    topics = detect_topics(content)
    topic = topics[0] if topics else CATEGORY_TOPIC.get(category)
    seed = _seed(content)

    if emotion == "positive":
        return prefix + "It's lovely to see a moment of light in your words. Take a second to notice what helped, so you can return to it on harder days."
    parts = []
    if emotion and topic:
        parts.append(f"It sounds like {TOPICS[topic]['phrase']} has left you feeling {EMOTIONS[emotion]['adj']}, and that's completely understandable.")
    elif emotion:
        parts.append(_pick(VALIDATIONS[emotion], seed))
    elif topic:
        parts.append(f"Thank you for opening up about {TOPICS[topic]['phrase']}. Putting it into words is a meaningful step.")
    else:
        parts.append("Thank you for sharing what you're carrying. Putting it into words is a meaningful step.")
    distortion, _ = detect_distortion(content)
    if distortion in ("labeling", "all_or_nothing", "personalization"):
        parts.append("Notice if your inner voice is being harsher than the facts; you deserve the same kindness you'd offer a friend.")
    elif emotion:
        parts.append(INSIGHT_TIPS.get(emotion, ""))
    elif topic in TOPIC_ADVICE:
        parts.append(TOPIC_ADVICE[topic])
    parts.append("You're not alone in this.")
    return prefix + " ".join(p for p in parts if p)
